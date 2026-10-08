import { pathToFileURL } from "node:url";
import { Pool, type PoolConfig, type QueryResult } from "pg";

const STOREFRONT_CHANNEL_NAME = "Fenomena Storefront";
const DEFAULT_PORT = 5432;

type ApiKeyRow = {
  id: string;
  title: string;
  revoked_at: Date | string | null;
  deleted_at: Date | string | null;
};

type SalesChannelRow = { id: string; name: string; is_disabled: boolean };
type AssociationRow = { publishable_key_id: string; sales_channel_id: string };
type ColumnRow = { column_name: string };
type QueryPool = Pick<Pool, "connect" | "end">;

export type PublishableKeyDiagnostic = {
  keyPresent: boolean;
  keyStatus: "active" | "revoked" | "deleted" | "not-found";
  associatedSalesChannelIds: string[];
  storefrontChannelExists: boolean;
  storefrontSalesChannelIds: string[];
  publishableKeyCounts: { total: number; active: number; revoked: number; deleted: number };
  publishableKeys: Array<{
    title: string;
    status: "active" | "revoked" | "deleted";
    associatedSalesChannelIds: string[];
  }>;
  salesChannelCount: number;
  salesChannels: Array<{ id: string; name: string; disabled: boolean }>;
};

export function createDiagnosticPoolConfig(
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
    application_name: "fenomena-publishable-key-diagnostic",
  };
}

function getKeyStatus(row: ApiKeyRow | undefined): PublishableKeyDiagnostic["keyStatus"] {
  if (!row) return "not-found";
  if (row.deleted_at !== null) return "deleted";
  if (row.revoked_at !== null && new Date(row.revoked_at).getTime() <= Date.now()) {
    return "revoked";
  }
  return "active";
}

export async function inspectPublishableKey(
  pool: QueryPool,
  publishableKey: string,
): Promise<PublishableKeyDiagnostic> {
  if (!publishableKey.startsWith("pk_")) {
    throw new Error("A Medusa publishable key beginning with pk_ is required.");
  }

  const client = await pool.connect();
  let transactionStarted = false;
  try {
    await client.query("BEGIN READ ONLY");
    transactionStarted = true;

    const keyResult = (await client.query(
      `SELECT id, title, revoked_at, deleted_at
       FROM api_key
       WHERE type = 'publishable' AND token = $1
       LIMIT 1`,
      [publishableKey],
    )) as QueryResult<ApiKeyRow>;
    const key = keyResult.rows[0];

    const allKeysResult = (await client.query(
      `SELECT id, title, revoked_at, deleted_at
       FROM api_key
       WHERE type = 'publishable'
       ORDER BY title, id`,
    )) as QueryResult<ApiKeyRow>;

    const channelResult = (await client.query(
      `SELECT id, name, is_disabled
       FROM sales_channel
       WHERE deleted_at IS NULL
       ORDER BY name, id`,
    )) as QueryResult<SalesChannelRow>;

    const linkColumnsResult = (await client.query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND table_name = 'publishable_api_key_sales_channel'`,
    )) as QueryResult<ColumnRow>;
    const linkHasDeletedAt = linkColumnsResult.rows.some((row) => row.column_name === "deleted_at");
    const associationResult = (await client.query(
      `SELECT DISTINCT publishable_key_id, sales_channel_id
       FROM publishable_api_key_sales_channel
       ${linkHasDeletedAt ? "WHERE deleted_at IS NULL" : ""}
       ORDER BY publishable_key_id, sales_channel_id`,
    )) as QueryResult<AssociationRow>;

    const associationsByKey = new Map<string, string[]>();
    for (const association of associationResult.rows) {
      const associatedIds = associationsByKey.get(association.publishable_key_id) ?? [];
      associatedIds.push(association.sales_channel_id);
      associationsByKey.set(association.publishable_key_id, associatedIds);
    }
    const storefrontChannels = channelResult.rows.filter(
      (channel) => channel.name === STOREFRONT_CHANNEL_NAME,
    );
    const activeKeys = allKeysResult.rows.filter((row) => getKeyStatus(row) === "active").length;
    const revokedKeys = allKeysResult.rows.filter((row) => getKeyStatus(row) === "revoked").length;
    const deletedKeys = allKeysResult.rows.filter((row) => getKeyStatus(row) === "deleted").length;

    return {
      keyPresent: Boolean(key),
      keyStatus: getKeyStatus(key),
      associatedSalesChannelIds: key ? associationsByKey.get(key.id) ?? [] : [],
      storefrontChannelExists: storefrontChannels.length > 0,
      storefrontSalesChannelIds: storefrontChannels.map(({ id }) => id),
      publishableKeyCounts: {
        total: allKeysResult.rows.length,
        active: activeKeys,
        revoked: revokedKeys,
        deleted: deletedKeys,
      },
      publishableKeys: allKeysResult.rows.map((row) => ({
        title: row.title,
        status: getKeyStatus(row) as "active" | "revoked" | "deleted",
        associatedSalesChannelIds: associationsByKey.get(row.id) ?? [],
      })),
      salesChannelCount: channelResult.rows.length,
      salesChannels: channelResult.rows.map(({ id, name, is_disabled }) => ({
        id,
        name,
        disabled: is_disabled,
      })),
    };
  } finally {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } finally {
        client.release();
      }
    } else {
      client.release();
    }
  }
}

function safeErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && /^[A-Z0-9_-]{1,32}$/i.test(code) ? code : undefined;
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  const publishableKey = process.env.DIAGNOSTIC_PUBLISHABLE_KEY;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  if (!publishableKey) {
    throw new Error("Set DIAGNOSTIC_PUBLISHABLE_KEY from a hidden PowerShell prompt before running.");
  }

  const pool = new Pool(createDiagnosticPoolConfig(databaseUrl));
  try {
    const report = await inspectPublishableKey(pool, publishableKey);
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error: unknown) => {
    const code = safeErrorCode(error);
    console.error(
      JSON.stringify({
        error: "Publishable-key diagnostic failed.",
        ...(code ? { code } : {}),
      }),
    );
    process.exitCode = 1;
  });
}
