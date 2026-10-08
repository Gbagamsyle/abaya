import assert from "node:assert/strict";
import test from "node:test";
import { copyStorefrontPublishableKey, inspectStorefrontPublishableKey } from "./copy-storefront-publishable-key.ts";

function makePool({
  channelRows = [],
  keyRows = [],
  associationRows = [],
}: {
  channelRows?: Array<{ id: string; name: string; is_disabled: boolean; deleted_at?: Date | null }>;
  keyRows?: Array<{ id: string; title: string; revoked_at: Date | string | null; deleted_at: Date | string | null; token?: string }>;
  associationRows?: Array<{ publishable_key_id: string; sales_channel_id: string }>;
}) {
  const client = {
    query: async (sql: string) => {
      if (sql.includes("FROM sales_channel")) {
        return { rows: channelRows };
      }
      if (sql.includes("FROM api_key")) {
        return { rows: keyRows };
      }
      if (sql.includes("FROM publishable_api_key_sales_channel")) {
        return { rows: associationRows };
      }
      return { rows: [] };
    },
    release: () => {},
  };

  return {
    connect: async () => client,
    end: async () => {},
  } as never;
}

test("inspects the active storefront channel and linked key without mutation", async () => {
  const result = await inspectStorefrontPublishableKey(
    makePool({
      channelRows: [{ id: "sc_active", name: "Fenomena Storefront", is_disabled: false }],
      keyRows: [{ id: "apk_active", title: "Fenomena Storefront", revoked_at: null, deleted_at: null, token: "pk_active_token" }],
      associationRows: [{ publishable_key_id: "apk_active", sales_channel_id: "sc_active" }],
    }),
  );

  assert.equal(result.salesChannelId, "sc_active");
  assert.equal(result.keyId, "apk_active");
  assert.equal(result.keyStatus, "active");
  assert.equal(result.linkedSalesChannelId, "sc_active");
  assert.equal(result.token, "pk_active_token");
});

test("fails closed when the storefront key is missing", async () => {
  await assert.rejects(
    inspectStorefrontPublishableKey(
      makePool({
        channelRows: [{ id: "sc_active", name: "Fenomena Storefront", is_disabled: false }],
        keyRows: [],
        associationRows: [],
      }),
    ),
    /No active storefront publishable key/i,
  );
});

test("fails closed when the storefront key is revoked", async () => {
  await assert.rejects(
    inspectStorefrontPublishableKey(
      makePool({
        channelRows: [{ id: "sc_active", name: "Fenomena Storefront", is_disabled: false }],
        keyRows: [{ id: "apk_revoked", title: "Fenomena Storefront", revoked_at: new Date("2020-01-01T00:00:00Z"), deleted_at: null, token: "pk_revoked" }],
        associationRows: [{ publishable_key_id: "apk_revoked", sales_channel_id: "sc_active" }],
      }),
    ),
    /revoked/i,
  );
});

test("fails closed when the storefront key is deleted", async () => {
  await assert.rejects(
    inspectStorefrontPublishableKey(
      makePool({
        channelRows: [{ id: "sc_active", name: "Fenomena Storefront", is_disabled: false }],
        keyRows: [{ id: "apk_deleted", title: "Fenomena Storefront", revoked_at: null, deleted_at: new Date("2020-01-01T00:00:00Z"), token: "pk_deleted" }],
        associationRows: [{ publishable_key_id: "apk_deleted", sales_channel_id: "sc_active" }],
      }),
    ),
    /deleted/i,
  );
});

test("fails closed when multiple storefront keys exist", async () => {
  await assert.rejects(
    inspectStorefrontPublishableKey(
      makePool({
        channelRows: [{ id: "sc_active", name: "Fenomena Storefront", is_disabled: false }],
        keyRows: [
          { id: "apk_one", title: "Fenomena Storefront", revoked_at: null, deleted_at: null, token: "pk_one" },
          { id: "apk_two", title: "Fenomena Storefront", revoked_at: null, deleted_at: null, token: "pk_two" },
        ],
        associationRows: [
          { publishable_key_id: "apk_one", sales_channel_id: "sc_active" },
          { publishable_key_id: "apk_two", sales_channel_id: "sc_active" },
        ],
      }),
    ),
    /exactly one active storefront publishable key/i,
  );
});

test("fails closed when the key is not linked to the storefront channel", async () => {
  await assert.rejects(
    inspectStorefrontPublishableKey(
      makePool({
        channelRows: [{ id: "sc_active", name: "Fenomena Storefront", is_disabled: false }],
        keyRows: [{ id: "apk_unlinked", title: "Fenomena Storefront", revoked_at: null, deleted_at: null, token: "pk_unlinked" }],
        associationRows: [{ publishable_key_id: "apk_unlinked", sales_channel_id: "sc_other" }],
      }),
    ),
    /linked to exactly one active storefront sales channel/i,
  );
});

test("copies the token to the Windows clipboard using stdin without exposing it", async () => {
  const seen: { stdin: string; argv: string[] }[] = [];

  const result = await copyStorefrontPublishableKey({
    pool: makePool({
      channelRows: [{ id: "sc_active", name: "Fenomena Storefront", is_disabled: false }],
      keyRows: [{ id: "apk_active", title: "Fenomena Storefront", revoked_at: null, deleted_at: null, token: "pk_copy_me" }],
      associationRows: [{ publishable_key_id: "apk_active", sales_channel_id: "sc_active" }],
    }),
    clipboard: async (token: string) => {
      seen.push({ stdin: token, argv: [] });
      return;
    },
  });

  assert.equal(result.copied, true);
  assert.equal(seen[0]?.stdin, "pk_copy_me");
  assert.equal(result.keyId, "apk_active");
});

test("fails cleanly when Windows clipboard copy fails", async () => {
  await assert.rejects(
    copyStorefrontPublishableKey({
      pool: makePool({
        channelRows: [{ id: "sc_active", name: "Fenomena Storefront", is_disabled: false }],
        keyRows: [{ id: "apk_active", title: "Fenomena Storefront", revoked_at: null, deleted_at: null, token: "pk_fails" }],
        associationRows: [{ publishable_key_id: "apk_active", sales_channel_id: "sc_active" }],
      }),
      clipboard: async () => {
        throw new Error("clipboard unavailable");
      },
    }),
    /clipboard/i,
  );
});
