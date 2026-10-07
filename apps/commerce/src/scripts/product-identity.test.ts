import assert from "node:assert/strict";
import test from "node:test";
import {
  LUNA_COMMERCE_INTEGRATION_KEY,
  resolveProductIdByExternalId,
} from "./product-identity";

test("seed adopts a legacy Luna once and reuses the stable identity on reruns", async () => {
  const product = { id: "generated-product-id", external_id: null as string | null };
  let adoptionCount = 0;
  let createCount = 0;
  const dependencies = {
    findByExternalId: async () =>
      product.external_id === LUNA_COMMERCE_INTEGRATION_KEY ? [product] : [],
    findLegacyByHandle: async () => [product],
    adoptExternalId: async (id: string, externalId: string) => {
      assert.equal(id, product.id);
      product.external_id = externalId;
      adoptionCount += 1;
    },
    create: async (externalId: string) => {
      createCount += 1;
      return { id: "unexpected-new-product", external_id: externalId };
    },
  };

  assert.equal(await resolveProductIdByExternalId(dependencies), product.id);
  assert.equal(await resolveProductIdByExternalId(dependencies), product.id);
  assert.equal(adoptionCount, 1);
  assert.equal(createCount, 0);
});

test("seed refuses ambiguous or conflicting product identities", async () => {
  const shared = {
    findByExternalId: async () => [
      { id: "one", external_id: LUNA_COMMERCE_INTEGRATION_KEY },
      { id: "two", external_id: LUNA_COMMERCE_INTEGRATION_KEY },
    ],
    findLegacyByHandle: async () => [],
    adoptExternalId: async () => {},
    create: async () => ({ id: "new" }),
  };
  await assert.rejects(resolveProductIdByExternalId(shared), /Multiple Medusa products/);

  const conflict = {
    ...shared,
    findByExternalId: async () => [],
    findLegacyByHandle: async () => [{ id: "legacy", external_id: "other:identity" }],
  };
  await assert.rejects(resolveProductIdByExternalId(conflict), /different external identity/);
});