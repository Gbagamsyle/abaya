import assert from "node:assert/strict";
import test from "node:test";
import { ensurePublishableKey } from "./publishable-key-initializer.ts";

test("publishable-key initialization creates and links once, then reuses on rerun", async () => {
  const keys: Array<{ id: string }> = [];
  const linked = new Set<string>();
  let createCount = 0;
  let linkCount = 0;
  const dependencies = {
    listKeys: async () => [...keys],
    createKey: async () => {
      createCount += 1;
      const key = { id: "apk_storefront" };
      keys.push(key);
      return key;
    },
    isLinkedToSalesChannel: async (keyId: string) => linked.has(keyId),
    linkToSalesChannel: async (keyId: string) => {
      linkCount += 1;
      linked.add(keyId);
    },
  };

  const first = await ensurePublishableKey(dependencies);
  const second = await ensurePublishableKey(dependencies);

  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(first.key.id, second.key.id);
  assert.equal(createCount, 1);
  assert.equal(linkCount, 1);
});

test("publishable-key initialization refuses ambiguous same-title keys", async () => {
  await assert.rejects(
    ensurePublishableKey({
      listKeys: async () => [{ id: "apk_one" }, { id: "apk_two" }],
      createKey: async () => ({ id: "unexpected" }),
      isLinkedToSalesChannel: async () => false,
      linkToSalesChannel: async () => {},
    }),
    /Multiple Fenomena Storefront publishable keys/,
  );
});