import assert from "node:assert/strict";
import test from "node:test";
import {
  createDiagnosticPoolConfig,
  inspectPublishableKey,
} from "./diagnose-publishable-key.ts";

const configuredKey = "pk_test_diagnostic_only_value";

function makePool(responses: Array<{ rows: unknown[] }>) {
  const queries: Array<{ sql: string; values?: unknown[] }> = [];
  let released = false;
  const client = {
    query: async (sql: string, values?: unknown[]) => {
      queries.push({ sql, values });
      return responses.shift() ?? { rows: [] };
    },
    release: () => {
      released = true;
    },
  };
  const pool = {
    connect: async () => client,
    end: async () => {},
  };
  return {
    pool: pool as never,
    queries,
    wasReleased: () => released,
  };
}

test("diagnostic reports only safe metadata for an active key and channel association", async () => {
  const fixture = makePool([
    { rows: [] },
    {
      rows: [
        {
          id: "apk_sensitive_id",
          title: "Fenomena Storefront",
          revoked_at: null,
          deleted_at: null,
        },
      ],
    },
    {
      rows: [
        {
          id: "apk_sensitive_id",
          title: "Fenomena Storefront",
          revoked_at: null,
          deleted_at: null,
        },
      ],
    },
    {
      rows: [{ id: "sc_storefront", name: "Fenomena Storefront", is_disabled: false }],
    },
    {
      rows: [
        { column_name: "id" },
        { column_name: "publishable_key_id" },
        { column_name: "sales_channel_id" },
        { column_name: "created_at" },
        { column_name: "updated_at" },
      ],
    },
    {
      rows: [{ publishable_key_id: "apk_sensitive_id", sales_channel_id: "sc_storefront" }],
    },
  ]);

  const result = await inspectPublishableKey(fixture.pool, configuredKey);

  assert.equal(result.keyPresent, true);
  assert.equal(result.keyStatus, "active");
  assert.deepEqual(result.associatedSalesChannelIds, ["sc_storefront"]);
  assert.equal(result.storefrontChannelExists, true);
  assert.deepEqual(result.storefrontSalesChannelIds, ["sc_storefront"]);
  assert.equal(JSON.stringify(result).includes(configuredKey), false);
  assert.equal(JSON.stringify(result).includes("apk_sensitive_id"), false);
  assert.match(fixture.queries[0].sql, /^BEGIN READ ONLY$/);
  assert.match(fixture.queries[1].sql, /FROM api_key/);
  assert.match(fixture.queries[2].sql, /WHERE type = 'publishable'/);
  assert.match(fixture.queries[3].sql, /FROM sales_channel/);
  assert.match(fixture.queries[4].sql, /FROM information_schema\.columns/);
  assert.match(fixture.queries[5].sql, /FROM publishable_api_key_sales_channel/);
  assert.deepEqual(fixture.queries[1].values, [configuredKey]);
  assert.match(fixture.queries.at(-1)?.sql ?? "", /^ROLLBACK$/);
  assert.equal(fixture.wasReleased(), true);
});

test("diagnostic reports missing, revoked, and deleted key states without exposing identifiers", async (t) => {
  const cases = [
    { name: "missing", keyRows: [], expected: "not-found" },
    {
      name: "revoked",
      keyRows: [{ id: "apk_private", title: "Fenomena Storefront", revoked_at: new Date(0), deleted_at: null }],
      expected: "revoked",
    },
    {
      name: "deleted",
      keyRows: [{ id: "apk_private", title: "Fenomena Storefront", revoked_at: null, deleted_at: new Date() }],
      expected: "deleted",
    },
  ] as const;

  for (const item of cases) {
    await t.test(item.name, async () => {
      const fixture = makePool([
        { rows: [] },
        { rows: [...item.keyRows] },
        { rows: [...item.keyRows] },
        {
          rows: [{ id: "sc_storefront", name: "Fenomena Storefront", is_disabled: false }],
        },
        {
          rows: [
            { column_name: "id" },
            { column_name: "publishable_key_id" },
            { column_name: "sales_channel_id" },
            { column_name: "created_at" },
            { column_name: "updated_at" },
          ],
        },
        {
          rows: item.keyRows.length
            ? [{ publishable_key_id: item.keyRows[0].id, sales_channel_id: "sc_storefront" }]
            : [],
        },
      ]);
      const result = await inspectPublishableKey(fixture.pool, configuredKey);

      assert.equal(result.keyStatus, item.expected);
      assert.equal(result.keyPresent, item.expected !== "not-found");
      assert.equal(JSON.stringify(result).includes("apk_private"), false);
      assert.equal(fixture.wasReleased(), true);
    });
  }
});

test("diagnostic rolls back and releases the connection when a query fails", async () => {
  const queries: string[] = [];
  let released = false;
  const pool = {
    connect: async () => ({
      query: async (sql: string) => {
        queries.push(sql);
        if (sql.startsWith("SELECT id, title")) throw new Error("query failed");
        return { rows: [] };
      },
      release: () => {
        released = true;
      },
    }),
    end: async () => {},
  } as never;

  await assert.rejects(inspectPublishableKey(pool, configuredKey), /query failed/);
  assert.equal(queries.at(-1), "ROLLBACK");
  assert.equal(released, true);
});

test("pool config targets the Railway SSH tunnel and uses bounded resources", () => {
  const config = createDiagnosticPoolConfig(
    "postgresql://user:password@postgres.railway.internal:5432/railway",
    { PGHOST: "127.0.0.1", PGPORT: "55432" },
  );

  assert.equal(config.host, "127.0.0.1");
  assert.equal(config.port, 55432);
  assert.equal(config.database, "railway");
  assert.equal(config.max, 1);
  assert.equal(config.connectionTimeoutMillis, 5000);
  assert.equal(config.idleTimeoutMillis, 1000);
  assert.equal(config.statement_timeout, 5000);
});