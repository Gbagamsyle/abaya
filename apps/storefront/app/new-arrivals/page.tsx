import { CatalogueEmptyState, CatalogueFailureState } from "../../components/catalogue-state";
import { CatalogueShell } from "../../components/catalogue-shell";
import { StorefrontProductCard } from "../../components/storefront-product-card";
import { loadCatalogue } from "../../lib/catalogue-service";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const result = await loadCatalogue();
  return {
    title: "New arrivals",
    description: "Explore products marked as new arrivals in the published catalogue.",
    alternates: { canonical: "/new-arrivals" },
    robots: result.ok && result.isDemo ? { index: false, follow: false } : undefined,
  };
}

export default async function NewArrivalsPage() {
  const result = await loadCatalogue();
  if (!result.ok)
    return (
      <CatalogueShell title="New arrivals">
        <CatalogueFailureState reason={result.reason} message={result.message} />
      </CatalogueShell>
    );
  const products = result.data.products.filter((product) => product.newArrival);
  return (
    <CatalogueShell title="New arrivals" isDemo={result.isDemo}>
      <section className="catalogue-inner catalogue-shop-page">
        <p className="catalogue-eyebrow">Editorially marked new arrivals</p>
        {products.length ? (
          <div className="catalogue-product-grid">
            {products.map((product) => (
              <StorefrontProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <CatalogueEmptyState title="No new arrivals published">
            New pieces will appear here when the editorial team marks them as arrivals.
          </CatalogueEmptyState>
        )}
      </section>
    </CatalogueShell>
  );
}
