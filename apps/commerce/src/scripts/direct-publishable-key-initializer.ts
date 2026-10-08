import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { pathToFileURL } from "node:url";
import { ulid } from "ulid";
import { Pool, type PoolConfig, type QueryResult } from "pg";

export const STOREFRONT_CHANNEL_NAME = "Fenomena Storefront";
export const STOREFRONT_KEY_TITLE = "Fenomena Storefront";

const DEFAULT_PORT = 5432;

type ChannelRow = { id: string; name?: string; is_disabled: boolean; deleted_at?: Date | string | null };
type KeyRow = {
  id: string;
  title?: string;
  revoked_at: Date | string | null;
  deleted_at: Date | string | null;
};
type AssociationRow = { publishable_key_id: string; sales_channel_id: string };
type ColumnRow = { column_name: string; is_nullable: "YES" | "NO"; column_default: string | null };
type SqlPool = Pick<Pool, "connect" | "end">;

type DirectInitializationPlan = {
  salesChannelExists: boolean;
  salesChannelIsDisabled: boolean;
  salesChannelIds: string[];
  keyExists: boolean;
  keyStatus: "active" | "revoked" | "deleted" | "not-found";
  keyId?: string;
  linkExists: boolean;
  wouldCreateSalesChannel: boolean;
  wouldCreateKey: boolean;
  wouldLinkKey: boolean;
};

export type DirectInitializationResult = {
  status: "initialized" | "already-present" | "dry-run";
  dryRun: boolean;
  writeAttempted: boolean;
  salesChannelId?: string;
  salesChannelCreated: boolean;
  keyCreated: boolean;
  linkedToStorefrontChannel: boolean;
  newKeyToken?: string;
  wouldCreateSalesChannel: boolean;
  wouldCreateKey: boolean;
  wouldLinkKey: boolean;
  linkPrerequisitesMet: boolean;
  salesChannelExists: boolean;
  keyExists: boolean;
  transferStatus?: "not-needed" | "skipped" | "transferred" | "failed";
};

export type VercelTransferConfig = {
  enabled: boolean;
  project?: string;
  environment: "production" | "preview" | "development";
  confirm: boolean;
  token?: string;
};

export function resolveVercelTransferConfig(
  env: NodeJS.ProcessEnv = process.env,
): VercelTransferConfig {
  const enabled = env.VERCEL_TRANSFER_TO_VERCEL === "true";
  if (!enabled) {
    return {
      enabled: false,
      environment: (env.VERCEL_ENVIRONMENT as VercelTransferConfig["environment"]) || "production",
      confirm: false,
    };
  }

  const project = env.VERCEL_PROJECT || env.VERCEL_PROJECT_NAME;
  if (!project) {
    throw new Error("VERCEL_PROJECT or VERCEL_PROJECT_NAME is required when VERCEL_TRANSFER_TO_VERCEL=true.");
  }

  const environment =
    env.VERCEL_ENVIRONMENT === "production" ||
    env.VERCEL_ENVIRONMENT === "preview" ||
    env.VERCEL_ENVIRONMENT === "development"
      ? env.VERCEL_ENVIRONMENT
      : "production";

  const confirm = env.VERCEL_TRANSFER_CONFIRM === "true";
  if (!confirm) {
    throw new Error("VERCEL_TRANSFER_CONFIRM=true is required before transferring to Vercel.");
  }

  return {
    enabled: true,
    project,
    environment,
    confirm,
    token: env.VERCEL_TOKEN,
  };
}

export function createDirectInitializationPoolConfig(
  databaseUrl: string,
  env: NodeJS.ProcessEnv = process.env,
): PoolConfig {
  const parsed = new URL(databaseUrl);
  if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the postgres or postgresql protocol.");
  }

  return {
    host: env.PGHOST || parsed.hostname,
    port: Number(env.PGPORT || parsed.port || DEFAULT_PORT),
    database: decodeURIComponent(parsed.pathname.replace(/^\//, "")),
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    max: 1,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 1_000,
    query_timeout: 7_000,
    statement_timeout: 5_000,
    application_name: "fenomena-publishable-key-direct-init",
  };
}

function getKeyStatus(row: KeyRow | undefined): DirectInitializationPlan["keyStatus"] {
  if (!row) return "not-found";
  if (row.deleted_at !== null) return "deleted";
  if (row.revoked_at !== null && new Date(row.revoked_at).getTime() <= Date.now()) return "revoked";
  return "active";
}

function isIdentifier(value: string): boolean {
  return /^[a-z_][a-z0-9_]*$/i.test(value);
}

function makeLinkInsert(
  columns: ColumnRow[],
  values: Record<string, string | Date>,
): { sql: string; values: Array<string | Date> } {
  const required = ["id", "publishable_key_id", "sales_channel_id"];
  for (const column of required) {
    if (!columns.some((row) => row.column_name === column)) {
      throw new Error("Expected Medusa API-key/sales-channel link columns are missing.");
    }
  }

  const insertColumns: string[] = [];
  const insertValues: Array<string | Date> = [];
  for (const column of columns) {
    if (!isIdentifier(column.column_name)) {
      throw new Error("Unexpected database link column name.");
    }
    if (Object.hasOwn(values, column.column_name)) {
      insertColumns.push(column.column_name);
      insertValues.push(values[column.column_name]!);
    } else if (column.is_nullable === "NO" && column.column_default === null) {
      throw new Error("Unsupported required column in Medusa API-key/sales-channel link table.");
    }
  }

  return {
    sql: `INSERT INTO publishable_api_key_sales_channel (${insertColumns.map((name) => `"${name}"`).join(", ")}) VALUES (${insertValues.map((_, index) => `$${index + 1}`).join(", ")})`,
    values: insertValues,
  };
}

export async function inspectDirectInitializationPlan(pool: SqlPool): Promise<DirectInitializationPlan> {
  const client = await pool.connect();
  try {
    const channelResult = (await client.query(
      `SELECT id, name, is_disabled, deleted_at
       FROM sales_channel
       WHERE name = $1 AND deleted_at IS NULL
       ORDER BY id`,
      [STOREFRONT_CHANNEL_NAME],
    )) as QueryResult<ChannelRow>;

    if (channelResult.rows.length > 1) {
      throw new Error("Multiple Fenomena Storefront sales channels exist; refusing to continue.");
    }

    const channel = channelResult.rows[0];
    const keyResult = (await client.query(
      `SELECT id, title, revoked_at, deleted_at
       FROM api_key
       WHERE title = $1 AND type = 'publishable'
       ORDER BY id`,
      [STOREFRONT_KEY_TITLE],
    )) as QueryResult<KeyRow>;

    if (keyResult.rows.length > 1) {
      throw new Error("Multiple Fenomena Storefront publishable keys exist; refusing to continue.");
    }

    const key = keyResult.rows[0];
    const linkColumnResult = (await client.query(
      `SELECT column_name, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'publishable_api_key_sales_channel'
       ORDER BY ordinal_position`,
    )) as QueryResult<ColumnRow>;

    const linkColumns = linkColumnResult.rows;
    const hasDeletedAt = linkColumns.some((column) => column.column_name === "deleted_at");
    const associationResult = (await client.query(
      `SELECT sales_channel_id
       FROM publishable_api_key_sales_channel
       WHERE publishable_key_id = $1
         AND sales_channel_id = $2
         ${hasDeletedAt ? "AND deleted_at IS NULL" : ""}
       LIMIT 1`,
      [key?.id, channel?.id],
    )) as QueryResult<AssociationRow>;

    const salesChannelExists = Boolean(channel);
    const keyExists = Boolean(key);
    const keyStatus = getKeyStatus(key);
    const linkExists = associationResult.rows.length > 0;

    return {
      salesChannelExists,
      salesChannelIsDisabled: channel?.is_disabled ?? false,
      salesChannelIds: channelResult.rows.map((row) => row.id),
      keyExists,
      keyStatus,
      keyId: key?.id,
      linkExists,
      wouldCreateSalesChannel: !salesChannelExists,
      wouldCreateKey: !keyExists,
      wouldLinkKey: salesChannelExists && keyExists && !linkExists,
    };
  } finally {
    client.release();
  }
}

export async function executeDirectInitialization({
  pool,
  dryRun,
  allowWrite,
  write,
}: {
  pool: SqlPool;
  dryRun: boolean;
  allowWrite: boolean;
  write: () => Promise<{
    salesChannelId?: string;
    salesChannelCreated: boolean;
    keyCreated: boolean;
    linkedToStorefrontChannel: boolean;
    newKeyToken?: string;
  }>;
}): Promise<DirectInitializationResult> {
  const plan = await inspectDirectInitializationPlan(pool);

  if (!allowWrite && !dryRun) {
    throw new Error(
      "ALLOW_PUBLISHABLE_KEY_INITIALIZATION=true is required before any database writes."
    );
  }

  if (dryRun) {
    return {
      status: "dry-run",
      dryRun: true,
      writeAttempted: false,
      salesChannelCreated: false,
      keyCreated: false,
      linkedToStorefrontChannel: false,
      wouldCreateSalesChannel: plan.wouldCreateSalesChannel,
      wouldCreateKey: plan.wouldCreateKey,
      wouldLinkKey: plan.wouldLinkKey,
      linkPrerequisitesMet: plan.salesChannelExists && plan.keyExists,
      salesChannelExists: plan.salesChannelExists,
      keyExists: plan.keyExists,
    };
  }

  if (plan.salesChannelExists && plan.keyExists && plan.linkExists) {
    return {
      status: "already-present",
      dryRun: false,
      writeAttempted: false,
      salesChannelCreated: false,
      keyCreated: false,
      linkedToStorefrontChannel: true,
      wouldCreateSalesChannel: false,
      wouldCreateKey: false,
      wouldLinkKey: false,
      linkPrerequisitesMet: true,
      salesChannelExists: true,
      keyExists: true,
    };
  }

  if (plan.salesChannelIsDisabled) {
    throw new Error("Fenomena Storefront sales channel is disabled; refusing to modify it.");
  }

  const result = await write();

  return {
    status: "initialized",
    dryRun: false,
    writeAttempted: true,
    salesChannelId: result.salesChannelId,
    salesChannelCreated: result.salesChannelCreated,
    keyCreated: result.keyCreated,
    linkedToStorefrontChannel: result.linkedToStorefrontChannel,
    newKeyToken: result.newKeyToken,
    wouldCreateSalesChannel: plan.wouldCreateSalesChannel,
    wouldCreateKey: plan.wouldCreateKey,
    wouldLinkKey: plan.wouldLinkKey,
    linkPrerequisitesMet: plan.salesChannelExists && plan.keyExists,
    salesChannelExists: plan.salesChannelExists,
    keyExists: plan.keyExists,
  };
}

export async function transferKeyToVercel({
  key,
  config,
  env = process.env,
  spawnImpl = spawn,
}: {
  key: string;
  config: VercelTransferConfig;
  env?: NodeJS.ProcessEnv;
  spawnImpl?: typeof spawn;
}): Promise<{ transferred: boolean; project: string; environment: string }> {
  if (!config.enabled) {
    return { transferred: false, project: config.project ?? "", environment: config.environment };
  }

  if (!config.confirm) {
    throw new Error("Explicit confirmation is required before transferring MEDUSA_PUBLISHABLE_KEY to Vercel.");
  }

  const token = config.token || env.VERCEL_TOKEN;
  if (!token) {
    throw new Error("VERCEL_TOKEN is required to transfer MEDUSA_PUBLISHABLE_KEY to Vercel.");
  }

  const command = process.platform === "win32" ? "vercel.cmd" : "vercel";
  const child = spawnImpl(
    command,
    [
      "env",
      "add",
      "MEDUSA_PUBLISHABLE_KEY",
      config.environment,
      "--project",
      config.project!,
      "--token",
      token,
      "--yes",
    ],
    {
      env: { ...process.env, ...env },
      stdio: ["pipe", "inherit", "inherit"],
    },
  );

  await new Promise<void>((resolve, reject) => {
    child.stdin?.write(`${key}\n`);
    child.stdin?.end();
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`vercel env add exited with code ${code}`))));
  });

  return {
    transferred: true,
    project: config.project!,
    environment: config.environment,
  };
}

export async function runDirectInitialization({
  databaseUrl,
  env = process.env,
  dryRun = false,
  allowWrite = false,
}: {
  databaseUrl: string;
  env?: NodeJS.ProcessEnv;
  dryRun?: boolean;
  allowWrite?: boolean;
}): Promise<DirectInitializationResult> {
  const pool = new Pool(createDirectInitializationPoolConfig(databaseUrl, env));
  try {
    const result = await executeDirectInitialization({
      pool,
      dryRun,
      allowWrite,
      write: async () => {
        const client = await pool.connect();
        let transactionStarted = false;
        let newKeyToken: string | undefined;

        try {
          await client.query("BEGIN");
          transactionStarted = true;
          await client.query("SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE");
          await client.query("SET LOCAL lock_timeout = '5s'");
          await client.query("SET LOCAL statement_timeout = '5s'");
          await client.query("SELECT pg_advisory_xact_lock(hashtext($1)::bigint)", [
            "fenomena:initialize-storefront-publishable-key",
          ]);

          const channelResult = (await client.query(
            `SELECT id, is_disabled
             FROM sales_channel
             WHERE name = $1 AND deleted_at IS NULL
             ORDER BY id
             FOR UPDATE`,
            [STOREFRONT_CHANNEL_NAME],
          )) as QueryResult<ChannelRow>;

          if (channelResult.rows.length > 1) {
            throw new Error("Multiple Fenomena Storefront sales channels exist; refusing to continue.");
          }

          const keyResult = (await client.query(
            `SELECT id, revoked_at, deleted_at
             FROM api_key
             WHERE title = $1 AND type = 'publishable'
             ORDER BY id
             FOR UPDATE`,
            [STOREFRONT_KEY_TITLE],
          )) as QueryResult<KeyRow>;

          if (keyResult.rows.length > 1) {
            throw new Error("Multiple Fenomena Storefront publishable keys exist; refusing to continue.");
          }

          let channel = channelResult.rows[0];
          let salesChannelCreated = false;
          if (channel?.is_disabled) {
            throw new Error("Fenomena Storefront sales channel is disabled; refusing to modify it.");
          }
          if (!channel) {
            const id = `sc_${ulid()}`;
            await client.query(
              `INSERT INTO sales_channel
                 (id, name, description, is_disabled, metadata, created_at, updated_at)
               VALUES ($1, $2, $3, false, NULL, NOW(), NOW())`,
              [id, STOREFRONT_CHANNEL_NAME, "Development storefront"],
            );
            channel = { id, is_disabled: false };
            salesChannelCreated = true;
          }

          let key = keyResult.rows[0];
          let keyCreated = false;
          if (key?.deleted_at !== null && key !== undefined) {
            throw new Error("Fenomena Storefront publishable key is deleted; refusing to create a duplicate.");
          }
          if (key?.revoked_at && new Date(key.revoked_at).getTime() <= Date.now()) {
            throw new Error("Fenomena Storefront publishable key is revoked; refusing to create a duplicate.");
          }
          if (!key) {
            newKeyToken = `pk_${randomBytes(32).toString("hex")}`;
            const id = `apk_${ulid()}`;
            const redacted = [newKeyToken.slice(0, 6), newKeyToken.slice(-3)].join("***");
            await client.query(
              `INSERT INTO api_key
                 (id, token, salt, redacted, title, type, last_used_at, created_by,
                  created_at, updated_at, revoked_by, revoked_at, deleted_at)
               VALUES ($1, $2, '', $3, $4, 'publishable', NULL, $5, NOW(), NOW(), NULL, NULL, NULL)`,
              [id, newKeyToken, redacted, STOREFRONT_KEY_TITLE, "railway-initializer"],
            );
            key = { id, revoked_at: null, deleted_at: null };
            keyCreated = true;
          }

          const linkColumnResult = (await client.query(
            `SELECT column_name, is_nullable, column_default
             FROM information_schema.columns
             WHERE table_schema = current_schema()
               AND table_name = 'publishable_api_key_sales_channel'
             ORDER BY ordinal_position`,
          )) as QueryResult<ColumnRow>;
          const linkColumns = linkColumnResult.rows;
          const hasDeletedAt = linkColumns.some((column) => column.column_name === "deleted_at");
          const associationResult = (await client.query(
            `SELECT sales_channel_id
             FROM publishable_api_key_sales_channel
             WHERE publishable_key_id = $1
               AND sales_channel_id = $2
               ${hasDeletedAt ? "AND deleted_at IS NULL" : ""}
             LIMIT 1`,
            [key.id, channel.id],
          )) as QueryResult<AssociationRow>;

          if (associationResult.rows.length === 0) {
            const values: Record<string, string | Date> = {
              id: `pksc_${ulid()}`,
              publishable_key_id: key.id,
              sales_channel_id: channel.id,
            };
            const now = new Date();
            for (const timestamp of ["created_at", "updated_at"]) {
              if (linkColumns.some((column) => column.column_name === timestamp)) {
                values[timestamp] = now;
              }
            }
            const insert = makeLinkInsert(linkColumns, values);
            await client.query(insert.sql, insert.values);
          }

          await client.query("COMMIT");
          transactionStarted = false;

          return {
            salesChannelId: channel.id,
            salesChannelCreated,
            keyCreated,
            linkedToStorefrontChannel: true,
            ...(newKeyToken ? { newKeyToken } : {}),
          };
        } catch (error) {
          if (transactionStarted) {
            try {
              await client.query("ROLLBACK");
            } catch {
              // Best effort rollback only.
            }
          }
          throw error;
        } finally {
          client.release();
        }
      },
    });

    return result;
  } finally {
    await pool.end();
  }
}

function safeErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_-]{1,32}$/i.test(code) ? code : undefined;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Use the Railway-injected value via `railway run`.");
  }

  const dryRun = process.env.DRY_RUN === "true";
  const allowWrite = process.env.ALLOW_PUBLISHABLE_KEY_INITIALIZATION === "true";
  const vercelConfig = resolveVercelTransferConfig(process.env);

  const result = await runDirectInitialization({
    databaseUrl,
    env: process.env,
    dryRun,
    allowWrite,
  });

  let transferStatus: DirectInitializationResult["transferStatus"] = "not-needed";
  if (result.newKeyToken && vercelConfig.enabled) {
    try {
      await transferKeyToVercel({
        key: result.newKeyToken,
        config: vercelConfig,
        env: process.env,
      });
      transferStatus = "transferred";
    } catch (error) {
      transferStatus = "failed";
      console.error(
        JSON.stringify({
          error: "Transferred key to Vercel failed.",
          message: error instanceof Error ? error.message : "unknown error",
        }),
      );
    }
  } else if (result.newKeyToken) {
    transferStatus = "skipped";
  }

  console.log(
    JSON.stringify(
      {
        status: result.status,
        dryRun: result.dryRun,
        salesChannelCreated: result.salesChannelCreated,
        keyCreated: result.keyCreated,
        linkedToStorefrontChannel: result.linkedToStorefrontChannel,
        wouldCreateSalesChannel: result.wouldCreateSalesChannel,
        wouldCreateKey: result.wouldCreateKey,
        wouldLinkKey: result.wouldLinkKey,
        linkPrerequisitesMet: result.linkPrerequisitesMet,
        linkStatus: result.linkPrerequisitesMet
          ? (result.linkedToStorefrontChannel ? "existing" : "will-create")
          : "deferred-until-prerequisites-created",
        salesChannelExists: result.salesChannelExists,
        keyExists: result.keyExists,
        transferStatus,
        ...(result.newKeyToken ? { keyTokenCreated: true } : {}),
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const code = safeErrorCode(error);
    console.error(
      JSON.stringify({
        error: "Direct publishable-key initialization failed.",
        ...(code ? { code } : {}),
      }),
    );
    process.exitCode = 1;
  });
}
