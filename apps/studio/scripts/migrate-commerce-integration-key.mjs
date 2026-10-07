import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnvFile } from "node:process";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
for (const envPath of [resolve(scriptDirectory, "../../../.env"), resolve(scriptDirectory, "../.env")]) {
  if (existsSync(envPath)) loadEnvFile(envPath);
}

const projectId = process.env.SANITY_PROJECT_ID ?? process.env.SANITY_STUDIO_PROJECT_ID;
const dataset = process.env.SANITY_DATASET ?? process.env.SANITY_STUDIO_DATASET;
const apiVersion = process.env.SANITY_API_VERSION ?? "2025-02-19";
const writeToken = process.env.SANITY_API_WRITE_TOKEN;
const productSlug = "luna-abaya";
const integrationKey = "fenomena:luna-abaya";

if (!projectId || !dataset || !writeToken) {
  throw new Error(
    "Set SANITY_PROJECT_ID (or SANITY_STUDIO_PROJECT_ID), SANITY_DATASET (or SANITY_STUDIO_DATASET), and SANITY_API_WRITE_TOKEN in the private shell environment.",
  );
}

const apiOrigin = `https://${projectId}.api.sanity.io/v${apiVersion}`;
const headers = { Authorization: `Bearer ${writeToken}` };
const queryUrl = new URL(`${apiOrigin}/data/query/${encodeURIComponent(dataset)}`);
queryUrl.searchParams.set(
  "query",
  `*[_type == "product" && slug.current == "${productSlug}"]{_id, commerceIntegrationKey, commerceProductId}`,
);

const queryResponse = await fetch(queryUrl, { headers });
if (!queryResponse.ok) {
  throw new Error(`Sanity product preflight failed (HTTP ${queryResponse.status}).`);
}

const queryPayload = (await queryResponse.json());
const products = queryPayload.result;
if (!Array.isArray(products) || products.length !== 1 || !products[0]?._id) {
  throw new Error("Expected exactly one published Luna product; no content was changed.");
}

const [product] = products;
if (product.commerceIntegrationKey && product.commerceIntegrationKey !== integrationKey) {
  throw new Error("Luna already has a different commerce integration key; no content was changed.");
}
if (product.commerceIntegrationKey === integrationKey && !product.commerceProductId) {
  console.info("Luna already uses the stable commerce integration key; no change needed.");
} else {
  const mutationResponse = await fetch(
    `${apiOrigin}/data/mutate/${encodeURIComponent(dataset)}?returnIds=true`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        mutations: [
          {
            patch: {
              id: product._id,
              set: { commerceIntegrationKey: integrationKey },
              unset: ["commerceProductId"],
            },
          },
        ],
      }),
    },
  );
  if (!mutationResponse.ok) {
    throw new Error(`Sanity product migration failed (HTTP ${mutationResponse.status}).`);
  }
  console.info("Migrated the Luna Sanity document to the stable commerce integration key.");
}