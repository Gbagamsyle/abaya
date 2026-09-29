import type { MedusaCommerceProduct } from "./domain";

export async function getMedusaProduct(productId: string): Promise<MedusaCommerceProduct> {
  const backendUrl = process.env.MEDUSA_BACKEND_URL;
  const publishableKey = process.env.MEDUSA_PUBLISHABLE_KEY;
  const regionId = process.env.MEDUSA_REGION_ID;
  if (!backendUrl || !publishableKey || !regionId) {
    throw new Error(
      "Medusa is not configured. Set MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY, and MEDUSA_REGION_ID.",
    );
  }

  const url = new URL(`/store/products/${encodeURIComponent(productId)}`, backendUrl);
  url.searchParams.set("region_id", regionId);
  url.searchParams.set(
    "fields",
    "+variants.calculated_price,+variants.inventory_quantity,+variants.manage_inventory,+variants.allow_backorder,+variants.options,+variants.options.option.title,+variants.prices",
  );
  const response = await fetch(url, {
    headers: { "x-publishable-api-key": publishableKey },
    next: { revalidate: 30 },
  });
  if (!response.ok) throw new Error(`Medusa product lookup failed (${response.status}).`);
  const payload = (await response.json()) as { product?: MedusaCommerceProduct };
  if (!payload.product) throw new Error(`Medusa product ${productId} was not found.`);
  return payload.product;
}
