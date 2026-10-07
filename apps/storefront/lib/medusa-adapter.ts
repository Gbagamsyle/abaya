import type { MedusaCommerceProduct } from "./domain";

export class MedusaCatalogueLookupError extends Error {
  constructor(
    readonly diagnosticCode:
      | "not-configured"
      | "request-failed"
      | "network-error"
      | "invalid-response"
      | "product-not-found"
      | "duplicate-integration-key"
      | "integration-key-mismatch",
    message: string,
  ) {
    super(message);
    this.name = "MedusaCatalogueLookupError";
  }
}

export async function getMedusaProductByIntegrationKey(
  integrationKey: string,
): Promise<MedusaCommerceProduct> {
  const backendUrl = process.env.MEDUSA_BACKEND_URL;
  const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY;
  const regionId = process.env.MEDUSA_REGION_ID;
  if (!backendUrl || !publishableKey || !regionId) {
    throw new MedusaCatalogueLookupError(
      "not-configured",
      "Medusa is not configured. Set MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY, and MEDUSA_REGION_ID.",
    );
  }

  const url = new URL("/store/products", backendUrl);
  url.searchParams.set("external_id", integrationKey);
  url.searchParams.set("region_id", regionId);
  url.searchParams.set("limit", "2");
  url.searchParams.set(
    "fields",
    "+external_id,+variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder,+variants.options,+variants.options.option.title,+variants.prices",
  );
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { "x-publishable-api-key": publishableKey },
      next: { revalidate: 30 },
    });
  } catch {
    throw new MedusaCatalogueLookupError("network-error", "Medusa catalogue request failed.");
  }
  if (!response.ok) {
    throw new MedusaCatalogueLookupError("request-failed", "Medusa catalogue request failed.");
  }

  let payload: { products?: MedusaCommerceProduct[] };
  try {
    payload = (await response.json()) as { products?: MedusaCommerceProduct[] };
  } catch {
    throw new MedusaCatalogueLookupError("invalid-response", "Medusa catalogue response was invalid.");
  }
  const products = payload.products ?? [];
  if (products.length === 0) {
    throw new MedusaCatalogueLookupError(
      "product-not-found",
      "No Medusa product matched the Sanity commerce integration key.",
    );
  }
  if (products.length > 1) {
    throw new MedusaCatalogueLookupError(
      "duplicate-integration-key",
      "Multiple Medusa products matched the Sanity commerce integration key.",
    );
  }

  const [product] = products;
  if (!product || product.external_id !== integrationKey) {
    throw new MedusaCatalogueLookupError(
      "integration-key-mismatch",
      "Medusa returned a product with a mismatched commerce integration key.",
    );
  }
  return product;
}
