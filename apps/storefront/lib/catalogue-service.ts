import { assertUniqueCommerceIntegrationKeys, composeProduct } from "./composition";
import { DEMO_COLLECTIONS, DEMO_PRODUCTS } from "./demo-fixtures";
import type { CatalogueResult, StorefrontCollectionEntry, StorefrontProduct } from "./domain";
import { getMedusaProductByIntegrationKey, MedusaCatalogueLookupError } from "./medusa-adapter";
import {
  getSanityCollections,
  getSanityProductBySlug,
  getSanityProducts,
  mapSanityCollection,
} from "./sanity-adapter";

function demoModeEnabled() {
  return process.env.CATALOGUE_MODE === "demo" && process.env.NODE_ENV !== "production";
}

function failureFrom(error: unknown): CatalogueResult<never> {
  const detail = error instanceof Error ? error.message : "";
  const isConfigError = /not configured/i.test(detail);
  const isCmsError = !(error instanceof MedusaCatalogueLookupError) && /sanity/i.test(detail);
  const diagnosticCode =
    error instanceof MedusaCatalogueLookupError
      ? error.diagnosticCode
      : isConfigError
        ? "configuration-missing"
        : isCmsError
          ? "sanity-request-failed"
          : detail.startsWith("Commerce integration key mismatch")
            ? "integration-key-mismatch"
            : detail.startsWith("Duplicate commerce integration key")
              ? "duplicate-integration-key"
              : "catalogue-request-failed";
  console.error("[storefront.catalogue] load failed", { diagnosticCode });
  return {
    ok: false,
    reason: isConfigError
      ? "not-configured"
      : isCmsError
        ? "cms-unavailable"
        : "commerce-unavailable",
    message: isConfigError
      ? "Set the required server-side Sanity and Medusa variables to enable the production catalogue. Demo content is not used as a fallback."
      : isCmsError
        ? "Editorial content could not be loaded. Please retry later."
        : "Commerce data could not be loaded. No substitute price or availability is being displayed.",
  };
}

export async function loadCollections(): Promise<CatalogueResult<StorefrontCollectionEntry[]>> {
  if (demoModeEnabled()) return { ok: true, data: DEMO_COLLECTIONS, isDemo: true };
  try {
    return {
      ok: true,
      data: (await getSanityCollections()).map(mapSanityCollection),
      isDemo: false,
    };
  } catch (error) {
    return failureFrom(error);
  }
}

export async function loadCatalogue(): Promise<
  CatalogueResult<{ products: StorefrontProduct[]; collections: StorefrontCollectionEntry[] }>
> {
  if (demoModeEnabled()) {
    return {
      ok: true,
      data: { products: DEMO_PRODUCTS, collections: DEMO_COLLECTIONS },
      isDemo: true,
    };
  }

  try {
    const editorialProducts = await getSanityProducts();
    if (editorialProducts.length === 0) {
      console.error("[storefront.catalogue] empty published Sanity product set", {
        reason: "cms-empty",
        count: 0,
      });
      return {
        ok: false,
        reason: "cms-empty",
        message: "No published product documents are available in Sanity for the storefront catalogue.",
      };
    }
    assertUniqueCommerceIntegrationKeys(editorialProducts);
    const collections = (await getSanityCollections()).map(mapSanityCollection);
    const products = await Promise.all(
      editorialProducts.map(async (editorial) => {
        const commerce = await getMedusaProductByIntegrationKey(editorial.commerceIntegrationKey);
        return composeProduct(editorial, commerce);
      }),
    );
    return { ok: true, data: { products, collections }, isDemo: false };
  } catch (error) {
    return failureFrom(error);
  }
}

export async function loadProduct(
  slug: string,
): Promise<CatalogueResult<StorefrontProduct | undefined>> {
  if (demoModeEnabled())
    return { ok: true, data: DEMO_PRODUCTS.find((product) => product.slug === slug), isDemo: true };
  try {
    const editorial = await getSanityProductBySlug(slug);
    if (!editorial) return { ok: true, data: undefined, isDemo: false };
    const commerce = await getMedusaProductByIntegrationKey(editorial.commerceIntegrationKey);
    return { ok: true, data: composeProduct(editorial, commerce), isDemo: false };
  } catch (error) {
    return failureFrom(error);
  }
}

export async function loadCollection(slug: string): Promise<
  CatalogueResult<{
    collection: StorefrontCollectionEntry | undefined;
    products: StorefrontProduct[];
  }>
> {
  const [collectionsResult, catalogueResult] = await Promise.all([
    loadCollections(),
    loadCatalogue(),
  ]);
  if (!collectionsResult.ok) return collectionsResult;
  if (!catalogueResult.ok) return catalogueResult;
  const collection = collectionsResult.data.find((item) => item.slug === slug);
  return {
    ok: true,
    data: {
      collection,
      products: collection
        ? catalogueResult.data.products.filter(
            (product) =>
              collection.productIds.includes(product.id) ||
              product.collections.some((item) => item.slug === slug),
          )
        : [],
    },
    isDemo: catalogueResult.isDemo,
  };
}
