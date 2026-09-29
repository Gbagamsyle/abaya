import type { Metadata } from "next";
import { CatalogueEmptyState, CatalogueFailureState } from "../../components/catalogue-state";
import { CatalogueShell } from "../../components/catalogue-shell";
import { StorefrontProductCard } from "../../components/storefront-product-card";
import { searchProducts } from "../../lib/catalogue-logic";
import { loadCatalogue } from "../../lib/catalogue-service";

export const metadata: Metadata = {
  title: "Search catalogue",
  description: "Search the published product catalogue.",
  robots: { index: false, follow: true },
};
export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? (params.q[0] ?? "") : (params.q ?? "");
  const result = await loadCatalogue();
  if (!result.ok)
    return (
      <CatalogueShell title="Search">
        <CatalogueFailureState reason={result.reason} message={result.message} />
      </CatalogueShell>
    );
  const found = searchProducts(result.data.products, query);

  return (
    <CatalogueShell title="Search" isDemo={result.isDemo}>
      <section className="catalogue-inner search-page">
        <form action="/search" method="get" className="search-page__panel">
          <label htmlFor="search-products">
            <span className="catalogue-eyebrow">
              Search products, collections, and descriptions
            </span>
          </label>
          <div className="search-page__input-row">
            <input
              id="search-products"
              name="q"
              defaultValue={query}
              placeholder="Try a product or collection"
            />
            <button type="submit">Search</button>
          </div>
        </form>
        {query.trim() ? (
          <p className="catalogue-result-count" aria-live="polite">
            {found.length} {found.length === 1 ? "result" : "results"} for “{query.trim()}”
          </p>
        ) : (
          <p className="catalogue-search-empty-query">
            Enter a search term to find a product by name, collection, description, material, or
            option.
          </p>
        )}
        <div className="search-page__results">
          {!query.trim() ? (
            <CatalogueEmptyState title="Start with a search">
              Search is limited to products in the current published catalogue.
            </CatalogueEmptyState>
          ) : found.length === 0 ? (
            <CatalogueEmptyState title="No matches found">
              Try another product name, collection, material, or colour.
            </CatalogueEmptyState>
          ) : (
            <div className="catalogue-product-grid">
              {found.map((product) => (
                <StorefrontProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>
    </CatalogueShell>
  );
}
