import type {
  MedusaCommerceProduct,
  SanityEditorialProduct,
  StorefrontProduct,
  StorefrontVariant,
} from "./domain";
import { safeHttpUrl } from "./safe-url";

function slugValue(value: SanityEditorialProduct["slug"]): string {
  return typeof value === "string" ? value : (value?.current ?? "");
}

function amountFromMedusa(amount: number | undefined, currency: string | undefined) {
  if (amount === undefined || !Number.isFinite(amount) || !currency) return undefined;
  return amount / 100;
}

function variantAvailability(variant: NonNullable<MedusaCommerceProduct["variants"]>[number]) {
  if (variant.manage_inventory === false) return "unknown" as const;
  if (!Number.isFinite(variant.inventory_quantity)) return "unknown" as const;
  if ((variant.inventory_quantity ?? 0) > 0 || variant.allow_backorder) return "available" as const;
  return "unavailable" as const;
}

function composeVariant(
  variant: NonNullable<MedusaCommerceProduct["variants"]>[number],
): StorefrontVariant {
  const currency =
    variant.calculated_price?.currency_code?.toUpperCase() ??
    variant.prices?.[0]?.currency_code?.toUpperCase();
  const rawAmount = variant.calculated_price?.calculated_amount;
  const amount = amountFromMedusa(rawAmount, currency);
  const originalAmount = amountFromMedusa(variant.calculated_price?.original_amount, currency);
  const options = Object.fromEntries(
    (variant.options ?? []).flatMap((option) => {
      const title = option.title ?? option.option?.title;
      return title && option.value ? [[title, option.value]] : [];
    }),
  );

  return {
    id: variant.id,
    title: variant.title ?? (Object.values(options).join(" / ") || "Default variant"),
    sku: variant.sku,
    options,
    price: amount === undefined || !currency ? undefined : { amount, currency },
    compareAt:
      originalAmount !== undefined && amount !== undefined && originalAmount > amount && currency
        ? { amount: originalAmount, currency }
        : undefined,
    availability: variantAvailability(variant),
  };
}

export function composeProduct(
  editorial: SanityEditorialProduct,
  commerce: MedusaCommerceProduct,
  options: { isDemo?: boolean } = {},
): StorefrontProduct {
  if (editorial.commerceProductId !== commerce.id) {
    throw new Error(
      `Commerce product mismatch: expected ${editorial.commerceProductId}, received ${commerce.id}`,
    );
  }

  const variants = (commerce.variants ?? []).map(composeVariant);
  const pricedVariants = variants.filter((variant) => variant.price);
  const currencies = new Set(pricedVariants.map((variant) => variant.price?.currency));
  const oneCurrency = currencies.size === 1;
  const productPrice =
    oneCurrency && pricedVariants.length
      ? pricedVariants.reduce(
          (minimum, variant) => Math.min(minimum, variant.price?.amount ?? minimum),
          Infinity,
        )
      : undefined;
  const comparePrices = oneCurrency
    ? pricedVariants
        .map((variant) => variant.compareAt?.amount)
        .filter((value): value is number => value !== undefined)
    : [];
  const available = variants.some((variant) => variant.availability === "available");
  const unavailable =
    variants.length > 0 && variants.every((variant) => variant.availability === "unavailable");
  const currency = oneCurrency ? pricedVariants[0]?.price?.currency : undefined;
  const images = (editorial.images ?? []).map((image) => ({
    url: image.url,
    alt: image.alt ?? "",
  }));
  const collections = (editorial.collections ?? []).flatMap((collection) => {
    const slug = slugValue(collection.slug);
    return collection.title && slug ? [{ id: collection._id, title: collection.title, slug }] : [];
  });

  return {
    id: editorial._id,
    commerceProductId: editorial.commerceProductId,
    title: editorial.title,
    slug: slugValue(editorial.slug),
    shortDescription: editorial.shortDescription ?? "",
    description: editorial.description ?? editorial.shortDescription ?? "",
    media: images,
    collections,
    material: editorial.material,
    care: editorial.careInformation,
    includedItems: editorial.includedItems ?? [],
    socialProof: (editorial.socialProof ?? []).map((item) => ({
      platform: item.platform ?? "instagram",
      url: safeHttpUrl(item.contentUrl),
      metric: item.metricValue,
      metricLabel: item.metricLabel,
      verified: Boolean(item.verified),
    })),
    seo: {
      title: editorial.seo?.title,
      description: editorial.seo?.description,
      canonicalUrl: safeHttpUrl(editorial.seo?.canonicalUrl),
    },
    variants,
    price: productPrice === undefined || !currency ? undefined : { amount: productPrice, currency },
    compareAt:
      comparePrices.length > 0 && currency
        ? { amount: Math.max(...comparePrices), currency }
        : undefined,
    availability: available ? "available" : unavailable ? "unavailable" : "unknown",
    updatedAt: editorial._updatedAt,
    newArrival: editorial.newArrival ?? false,
    isDemo: options.isDemo ?? false,
  };
}
