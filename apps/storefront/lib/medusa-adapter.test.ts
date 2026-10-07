import assert from "node:assert/strict";
import test from "node:test";
import { composeProduct } from "./composition";
import type { MedusaCommerceProduct, SanityEditorialProduct } from "./domain";
import { getMedusaProductByIntegrationKey } from "./medusa-adapter";

const integrationKey = "fenomena:luna-abaya";

function withMedusaEnvironment<T>(run: () => Promise<T>) {
  const env = process.env as Record<string, string | undefined>;
  const previous = {
    backendUrl: env.MEDUSA_BACKEND_URL,
    publishableKey: env.MEDUSA_PUBLISHABLE_KEY,
    regionId: env.MEDUSA_REGION_ID,
  };
  env.MEDUSA_BACKEND_URL = "https://medusa.example.test";
  env.MEDUSA_PUBLISHABLE_KEY = "pk_test_placeholder";
  env.MEDUSA_REGION_ID = "region-test";

  return run().finally(() => {
    if (previous.backendUrl === undefined) delete env.MEDUSA_BACKEND_URL;
    else env.MEDUSA_BACKEND_URL = previous.backendUrl;
    if (previous.publishableKey === undefined) delete env.MEDUSA_PUBLISHABLE_KEY;
    else env.MEDUSA_PUBLISHABLE_KEY = previous.publishableKey;
    if (previous.regionId === undefined) delete env.MEDUSA_REGION_ID;
    else env.MEDUSA_REGION_ID = previous.regionId;
  });
}

test("Medusa lookup resolves stable external identity across generated environment IDs", async () => {
  await withMedusaEnvironment(async () => {
    const originalFetch = globalThis.fetch;
    let requestedUrl: URL | undefined;
    globalThis.fetch = (async (input) => {
      requestedUrl = new URL(String(input));
      return Response.json({
        products: [
          {
            id: "prod_generated_only_in_staging",
            external_id: integrationKey,
            title: "Luna Abaya",
            variants: [
              {
                id: "variant-stage",
                sku: "LUNA-BLUE-56",
                options: [{ title: "Colour", value: "Baby Blue" }],
                calculated_price: { calculated_amount: 18500, currency_code: "myr" },
                inventory_quantity: 7,
                manage_inventory: true,
              },
            ],
          },
        ],
      });
    }) as typeof fetch;

    try {
      const resolved = await getMedusaProductByIntegrationKey(integrationKey);
      assert.equal(resolved.variants?.[0]?.inventory_quantity, 7);
      assert.equal(requestedUrl?.pathname, "/store/products");
      assert.equal(requestedUrl?.searchParams.get("external_id"), integrationKey);
      assert.equal(requestedUrl?.searchParams.get("limit"), "2");

      const editorial: SanityEditorialProduct = {
        _id: "sanity-luna",
        title: "Luna Abaya",
        commerceIntegrationKey: integrationKey,
      };
      const product = composeProduct(editorial, resolved);
      assert.equal(product.commerceProductId, "prod_generated_only_in_staging");
      assert.equal(product.price?.amount, 185);
      assert.equal(product.variants[0]?.price?.amount, 185);
      assert.equal(product.variants[0]?.availability, "available");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test("Medusa lookup fails closed for an incorrect integration identity", async () => {
  await withMedusaEnvironment(async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      Response.json({
        products: [
          {
            id: "prod-wrong",
            external_id: "fenomena:another-product",
            title: "Not Luna",
          } satisfies MedusaCommerceProduct,
        ],
      })) as typeof fetch;

    try {
      await assert.rejects(
        getMedusaProductByIntegrationKey(integrationKey),
        /mismatched commerce integration key/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

test("Medusa lookup fails closed when the integration identity is duplicated", async () => {
  await withMedusaEnvironment(async () => {
    const originalFetch = globalThis.fetch;
    const duplicate = { id: "product", external_id: integrationKey, title: "Luna" };
    globalThis.fetch = (async () =>
      Response.json({ products: [duplicate, { ...duplicate, id: "duplicate-product" }] })) as typeof fetch;

    try {
      await assert.rejects(
        getMedusaProductByIntegrationKey(integrationKey),
        /Multiple Medusa products matched/,
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});