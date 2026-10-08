import { randomBytes } from "node:crypto";
import { ulid } from "ulid";
import type { Pool, QueryResult } from "pg";

export const STOREFRONT_CHANNEL_NAME = "Fenomena Storefront";
export const STOREFRONT_KEY_TITLE = "Fenomena Storefront";

export type PublishableKeyDependencies = {
  listKeys: () => Promise<Array<{ id: string }>>;
  createKey: () => Promise<{ id: string }>;
  isLinkedToSalesChannel: (keyId: string) => Promise<boolean>;
  linkToSalesChannel: (keyId: string) => Promise<void>;
};

export async function ensurePublishableKey({
  listKeys,
  createKey,
  isLinkedToSalesChannel,
  linkToSalesChannel,
}: PublishableKeyDependencies): Promise<{ key: { id: string }; created: boolean; linked: boolean }> {
  const keys = await listKeys();
  if (keys.length > 1) {
    throw new Error("Multiple Fenomena Storefront publishable keys exist; refusing to continue.");
  }

  let key = keys[0];
  let created = false;
  if (!key) {
    key = await createKey();
    created = true;
  }

  const alreadyLinked = await isLinkedToSalesChannel(key.id);
  if (!alreadyLinked) {
    await linkToSalesChannel(key.id);
  }

  return {
    key,
    created,
    linked: true,
  };
}

export type InitializerResult = {
  salesChannelId: string;
  salesChannelCreated: boolean;
  keyCreated: boolean;
  linkedToStorefrontChannel: boolean;
  newKeyToken?: string;
};

type ChannelRow = { id: string; is_disabled: boolean };
type KeyRow = { id: string; revoked_at: Date | string | null; deleted_at: Date | string | null };
type AssociationRow = { sales_channel_id: string };
type ColumnRow = { column_name: string; is_nullable: "YES" | "NO"; column_default: string | null };
type SqlPool = Pick<Pool, "connect">;

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

export async function initializePublishableKey(pool: SqlPool): Promise<InitializerResult> {
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
      ...(keyCreated && newKeyToken ? { newKeyToken } : {}),
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Preserve the original failure; rollback is best-effort after a connection error.
      }
    }
    throw error;
  } finally {
    client.release();
  }
}
