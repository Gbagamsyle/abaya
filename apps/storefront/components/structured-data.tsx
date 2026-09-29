import type { StorefrontProduct } from "../lib/domain";
import { getStorefrontConfig } from "../lib/storefront-config";

function JsonLd({ value }: { value: Record<string, unknown> }) {
  const json = JSON.stringify(value).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function BreadcrumbJsonLd({ items }: { items: Array<{ name: string; path: string }> }) {
  const siteUrl = getStorefrontConfig().siteUrl;
  if (!siteUrl) return null;
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          item: new URL(item.path, siteUrl).toString(),
        })),
      }}
    />
  );
}

export function ProductJsonLd({ product }: { product: StorefrontProduct }) {
  const siteUrl = getStorefrontConfig().siteUrl;
  if (!siteUrl) return null;
  const offers = product.variants.flatMap((variant) => {
    if (!variant.price) return [];
    return [
      {
        "@type": "Offer",
        url: new URL(`/products/${product.slug}`, siteUrl).toString(),
        price: variant.price.amount,
        priceCurrency: variant.price.currency,
        ...(variant.availability === "available"
          ? { availability: "https://schema.org/InStock" }
          : {}),
        ...(variant.availability === "unavailable"
          ? { availability: "https://schema.org/OutOfStock" }
          : {}),
      },
    ];
  });
  if (offers.length === 0) return null;
  return (
    <JsonLd
      value={{
        "@context": "https://schema.org",
        "@type": "Product",
        name: product.title,
        description: product.seo.description ?? product.shortDescription ?? undefined,
        image: product.media.flatMap((media) => (media.url ? [media.url] : [])),
        sku: product.variants.length === 1 ? product.variants[0]?.sku : undefined,
        offers: offers.length === 1 ? offers[0] : offers,
      }}
    />
  );
}
