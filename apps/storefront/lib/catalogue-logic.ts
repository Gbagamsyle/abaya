import type { StorefrontProduct, StorefrontVariant } from "./domain";

export type CatalogueFilters = {
  collection?: string;
  colour?: string;
  size?: string;
  availability?: "available";
  minPrice?: number;
  maxPrice?: number;
  sort?: "newest" | "price-asc" | "price-desc";
};

function matchesVariant(variant: StorefrontVariant, filters: CatalogueFilters) {
  if (
    filters.colour &&
    !Object.values(variant.options).some(
      (value) => normalizeSearch(value) === normalizeSearch(filters.colour),
    )
  )
    return false;
  if (
    filters.size &&
    !Object.values(variant.options).some(
      (value) => normalizeSearch(value) === normalizeSearch(filters.size),
    )
  )
    return false;
  if (filters.availability === "available" && variant.availability !== "available") return false;
  if (
    filters.minPrice !== undefined &&
    (variant.price?.amount === undefined || variant.price.amount < filters.minPrice)
  )
    return false;
  if (
    filters.maxPrice !== undefined &&
    (variant.price?.amount === undefined || variant.price.amount > filters.maxPrice)
  )
    return false;
  return true;
}

export function resolveVariant(
  product: StorefrontProduct,
  selection: Record<string, string>,
): StorefrontVariant | undefined {
  const selectedOptions = Object.entries(selection).filter(([, value]) => value.trim());
  if (!selectedOptions.length)
    return product.variants.length === 1 ? product.variants[0] : undefined;
  return product.variants.find((variant) =>
    selectedOptions.every(
      ([name, value]) => normalizeSearch(variant.options[name]) === normalizeSearch(value),
    ),
  );
}

export function getAvailableOptionValues(
  product: StorefrontProduct,
  selection: Record<string, string>,
  optionName: string,
): string[] {
  const otherSelections = Object.fromEntries(
    Object.entries(selection).filter(([name]) => name !== optionName),
  );
  return [
    ...new Set(
      product.variants
        .filter((variant) => variant.availability !== "unavailable")
        .filter((variant) =>
          Object.entries(otherSelections).every(
            ([name, value]) =>
              !value || normalizeSearch(variant.options[name]) === normalizeSearch(value),
          ),
        )
        .map((variant) => variant.options[optionName])
        .filter((value): value is string => Boolean(value)),
    ),
  ];
}

export function filterAndSortProducts(
  products: readonly StorefrontProduct[],
  filters: CatalogueFilters,
): StorefrontProduct[] {
  const filtered = products.filter((product) => {
    if (
      filters.collection &&
      !product.collections.some((collection) => collection.slug === filters.collection)
    )
      return false;
    const relevantVariants = product.variants.filter((variant) => matchesVariant(variant, filters));
    if (
      (filters.colour ||
        filters.size ||
        filters.availability ||
        filters.minPrice !== undefined ||
        filters.maxPrice !== undefined) &&
      !relevantVariants.length
    )
      return false;
    return true;
  });

  switch (filters.sort) {
    case "price-asc":
      return filtered.sort((a, b) => (a.price?.amount ?? Infinity) - (b.price?.amount ?? Infinity));
    case "price-desc":
      return filtered.sort(
        (a, b) => (b.price?.amount ?? -Infinity) - (a.price?.amount ?? -Infinity),
      );
    case "newest":
      return filtered.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
    default:
      return filtered;
  }
}

export function normalizeSearch(value: string | undefined): string {
  return (value ?? "").normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/g, " ");
}

export function searchProducts(
  products: readonly StorefrontProduct[],
  query: string,
): StorefrontProduct[] {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return [...products];
  const terms = normalizedQuery.split(" ");
  return products.filter((product) => {
    const searchable = normalizeSearch(
      [
        product.title,
        product.shortDescription,
        product.description,
        ...product.collections.map((collection) => collection.title),
        ...product.collections.map((collection) => collection.slug),
        ...product.variants.flatMap((variant) => Object.values(variant.options)),
        ...product.includedItems,
        product.material,
      ]
        .filter(Boolean)
        .join(" "),
    );
    return terms.every((term) => searchable.includes(term));
  });
}
