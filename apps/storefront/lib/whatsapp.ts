import type { StorefrontProduct, StorefrontVariant } from "./domain";

export type WhatsAppOrderConfig = {
  phone?: string;
  siteUrl?: string;
};

export function createWhatsAppOrderUrl(
  product: StorefrontProduct,
  variant: StorefrontVariant | undefined,
  config: WhatsAppOrderConfig,
): string | undefined {
  const phone = config.phone?.replace(/[\s()+-]/g, "");
  if (!phone || !/^\d{8,15}$/.test(phone) || !config.siteUrl) return undefined;

  let productUrl: URL;
  try {
    productUrl = new URL(`/products/${encodeURIComponent(product.slug)}`, config.siteUrl);
    if (!/^https?:$/.test(productUrl.protocol)) return undefined;
  } catch {
    return undefined;
  }

  const selectedOptions = variant
    ? Object.values(variant.options).join(" / ")
    : "selection to confirm";
  const price = variant?.price ?? product.price;
  const priceText = price
    ? new Intl.NumberFormat("en", { style: "currency", currency: price.currency }).format(
        price.amount,
      )
    : "price to confirm";
  const message = [
    `Hello, I’m interested in ${product.title}.`,
    `Options: ${selectedOptions}.`,
    `Price: ${priceText}.`,
    `Product: ${productUrl.toString()}`,
  ].join("\n");

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
