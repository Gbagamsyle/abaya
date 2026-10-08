import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { Pool, type QueryResult } from "pg";
import {
  STOREFRONT_CHANNEL_NAME,
  STOREFRONT_KEY_TITLE,
  createDirectInitializationPoolConfig,
} from "./direct-publishable-key-initializer.ts";

type SqlPool = Pick<Pool, "connect" | "end">;

type ChannelRow = {
  id: string;
  name: string;
  is_disabled: boolean;
  deleted_at?: Date | string | null;
};

type KeyRow = {
  id: string;
  title: string;
  revoked_at: Date | string | null;
  deleted_at: Date | string | null;
  token: string;
};

type AssociationRow = {
  publishable_key_id: string;
  sales_channel_id: string;
};

type ColumnRow = {
  column_name: string;
};

export type StorefrontKeyInspection = {
  salesChannelId: string;
  salesChannelName: string;
  keyId: string;
  keyTitle: string;
  keyStatus: "active" | "revoked" | "deleted";
  linkedSalesChannelId: string;
  token: string;
};

export type CopyStorefrontPublishableKeyResult = {
  copied: boolean;
  salesChannelId: string;
  salesChannelName: string;
  keyId: string;
  keyTitle: string;
  keyStatus: "active" | "revoked" | "deleted";
  linkedSalesChannelId: string;
};

function keyStatus(row: KeyRow | undefined): "active" | "revoked" | "deleted" | "not-found" {
  if (!row) return "not-found";
  if (row.deleted_at !== null) return "deleted";
  if (row.revoked_at !== null && new Date(row.revoked_at).getTime() <= Date.now()) return "revoked";
  return "active";
}

export async function inspectStorefrontPublishableKey(pool: SqlPool): Promise<StorefrontKeyInspection> {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN READ ONLY");
    transactionStarted = true;

    const channelResult = (await client.query(
      `SELECT id, name, is_disabled, deleted_at
       FROM sales_channel
       WHERE name = $1 AND deleted_at IS NULL
       ORDER BY id`,
      [STOREFRONT_CHANNEL_NAME],
    )) as QueryResult<ChannelRow>;

    if (channelResult.rows.length === 0) {
      throw new Error("No active Fenomena Storefront sales channel was found.");
    }
    if (channelResult.rows.length > 1) {
      throw new Error("Multiple active Fenomena Storefront sales channels exist; refusing to continue.");
    }

    const channel = channelResult.rows[0];
    const keyResult = (await client.query(
      `SELECT id, title, revoked_at, deleted_at, token
       FROM api_key
       WHERE title = $1 AND type = 'publishable'
       ORDER BY id`,
      [STOREFRONT_KEY_TITLE],
    )) as QueryResult<KeyRow>;

    if (keyResult.rows.length === 0) {
      throw new Error("No active storefront publishable key was found.");
    }

    const activeKeys = keyResult.rows.filter((row) => keyStatus(row) === "active");
    if (activeKeys.length !== 1) {
      const statuses = keyResult.rows.map((row) => keyStatus(row));
      if (statuses.includes("deleted")) {
        throw new Error("The storefront publishable key is deleted.");
      }
      if (statuses.includes("revoked")) {
        throw new Error("The storefront publishable key is revoked.");
      }
      throw new Error("Exactly one active storefront publishable key is required.");
    }

    const key = activeKeys[0];
    const linkColumnsResult = (await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'publishable_api_key_sales_channel'`,
    )) as QueryResult<ColumnRow>;

    const linkHasDeletedAt = linkColumnsResult.rows.some((row) => row.column_name === "deleted_at");
    const associationResult = (await client.query(
      `SELECT publishable_key_id, sales_channel_id
       FROM publishable_api_key_sales_channel
       WHERE publishable_key_id = $1
         ${linkHasDeletedAt ? "AND deleted_at IS NULL" : ""}
       ORDER BY sales_channel_id`,
      [key.id],
    )) as QueryResult<AssociationRow>;

    const matchingLinks = associationResult.rows.filter((row) => row.sales_channel_id === channel.id);
    if (matchingLinks.length !== 1) {
      throw new Error("The storefront publishable key is not linked to exactly one active storefront sales channel.");
    }

    return {
      salesChannelId: channel.id,
      salesChannelName: channel.name,
      keyId: key.id,
      keyTitle: key.title,
      keyStatus: "active",
      linkedSalesChannelId: matchingLinks[0].sales_channel_id,
      token: key.token,
    };
  } finally {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Best effort only.
      }
    }
    client.release();
  }
}

export async function copyTokenToClipboard(token: string, spawnImpl: typeof spawn = spawn): Promise<void> {
  const child = spawnImpl(
    "powershell.exe",
    [
      "-NoLogo",
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "$input | Set-Clipboard",
    ],
    {
      stdio: ["pipe", "inherit", "inherit"],
      windowsHide: true,
    },
  );

  if (!child.stdin) {
    throw new Error("Clipboard copy failed.");
  }

  await new Promise<void>((resolve, reject) => {
    child.on("error", () => reject(new Error("Clipboard copy failed.")));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error("Clipboard copy failed."));
      }
    });

    child.stdin.write(token, (writeError) => {
      if (writeError) {
        reject(new Error("Clipboard copy failed."));
        return;
      }
      child.stdin?.end();
    });
  });
}

export async function copyStorefrontPublishableKey({
  pool,
  clipboard = copyTokenToClipboard,
}: {
  pool: SqlPool;
  clipboard?: (token: string, spawnImpl?: typeof spawn) => Promise<void>;
}): Promise<CopyStorefrontPublishableKeyResult> {
  const found = await inspectStorefrontPublishableKey(pool);
  const token = found.token;
  try {
    await clipboard(token);
    return {
      copied: true,
      salesChannelId: found.salesChannelId,
      salesChannelName: found.salesChannelName,
      keyId: found.keyId,
      keyTitle: found.keyTitle,
      keyStatus: found.keyStatus,
      linkedSalesChannelId: found.linkedSalesChannelId,
    };
  } catch {
    throw new Error("Clipboard copy failed.");
  }
}

export async function runCopyStorefrontPublishableKey({
  databaseUrl,
  env = process.env,
  clipboard = copyTokenToClipboard,
}: {
  databaseUrl: string;
  env?: NodeJS.ProcessEnv;
  clipboard?: (token: string, spawnImpl?: typeof spawn) => Promise<void>;
}): Promise<CopyStorefrontPublishableKeyResult> {
  const pool = new Pool(createDirectInitializationPoolConfig(databaseUrl, env));
  try {
    return await copyStorefrontPublishableKey({ pool, clipboard });
  } finally {
    await pool.end();
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Use the Railway-injected value via railway run.");
  }

  const result = await runCopyStorefrontPublishableKey({
    databaseUrl,
    env: process.env,
    clipboard: copyTokenToClipboard,
  });

  console.log(
    JSON.stringify(
      {
        status: "copied",
        copied: result.copied,
        salesChannelId: result.salesChannelId,
        salesChannelName: result.salesChannelName,
        keyId: result.keyId,
        keyTitle: result.keyTitle,
        keyStatus: result.keyStatus,
        linkedSalesChannelId: result.linkedSalesChannelId,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error(
      JSON.stringify({
        error: "Storefront publishable-key copy failed.",
        message: message.includes("pk_") || message.includes("token") ? "Clipboard copy failed." : message,
      }),
      null,
      2,
    );
    process.exitCode = 1;
  });
}
