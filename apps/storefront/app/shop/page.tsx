import type { Metadata } from "next";
import { CatalogueEmptyState, CatalogueFailureState } from "../../components/catalogue-state";
import { CatalogueShell } from "../../components/catalogue-shell";
import { ShopControls, type ShopFilterValues } from "../../components/shop-controls";
import { StorefrontProductCard } from "../../components/storefront-product-card";
import { BreadcrumbJsonLd } from "../../components/structured-data";
import { filterAndSortProducts } from "../../lib/catalogue-logic";
import { loadCatalogue } from "../../lib/catalogue-service";

export async function generateMetadata(): Promise<Metadata> {
  const result = await loadCatalogue();
  return {
    title: "Shop the collection",
    description: "Browse the published product catalogue.",
    alternates: { canonical: "/shop" },
    robots: result.ok && result.isDemo ? { index: false, follow: false } : undefined,
    openGraph: {
      title: "Shop the collection",
      description: "Browse the published product catalogue.",
      type: "website",
    },
  };
}
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const value = (params: Record<string, string | string[] | undefined>, name: string) => {
  const found = params[name];
  return Array.isArray(found) ? found[0] : found;
};
const numericFilter = (raw: string | undefined) => {
  if (raw === undefined || raw.trim() === "") return undefined;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const result = await loadCatalogue();
  if (!result.ok)
    return (
      <CatalogueShell title="Shop">
        <CatalogueFailureState reason={result.reason} message={result.message} />
      </CatalogueShell>
    );

  const filters: ShopFilterValues = {
    collection: value(params, "collection"),
    colour: value(params, "colour"),
    size: value(params, "size"),
    availability: value(params, "availability"),
    minPrice: value(params, "minPrice"),
    maxPrice: value(params, "maxPrice"),
    sort: value(params, "sort"),
  };
  const filtered = filterAndSortProducts(result.data.products, {
    collection: filters.collection,
    colour: filters.colour,
    size: filters.size,
    availability: filters.availability === "available" ? "available" : undefined,
    minPrice: numericFilter(filters.minPrice),
    maxPrice: numericFilter(filters.maxPrice),
    sort:
      filters.sort === "price-asc" || filters.sort === "price-desc" || filters.sort === "newest"
        ? filters.sort
        : "newest",
  });

  return (
    <CatalogueShell title="Shop the edit" isDemo={result.isDemo}>
      <section className="catalogue-inner catalogue-shop-page">
        <div className="catalogue-intro-row">
          <div>
            <p className="catalogue-eyebrow">Published catalogue</p>
            <h2>Find the piece that feels like you.</h2>
          </div>
          <p className="catalogue-result-count" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
          </p>
        </div>
        <ShopControls
          collections={result.data.collections}
          products={result.data.products}
          values={filters}
        />
        <BreadcrumbJsonLd
          items={[
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop" },
          ]}
        />
        {filtered.length === 0 ? (
          <CatalogueEmptyState title="No products match those filters">
            Try adjusting the filters or clear them to explore the full catalogue.
          </CatalogueEmptyState>
        ) : (
          <div className="catalogue-product-grid">
            {filtered.map((product) => (
              <StorefrontProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </CatalogueShell>
  );
}
