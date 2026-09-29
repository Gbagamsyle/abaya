import type { Metadata } from "next";
import Link from "next/link";
import { CatalogueEmptyState, CatalogueFailureState } from "../../components/catalogue-state";
import { CatalogueShell } from "../../components/catalogue-shell";
import { ProductImage } from "../../components/product-image";
import { BreadcrumbJsonLd } from "../../components/structured-data";
import { loadCollections } from "../../lib/catalogue-service";

export async function generateMetadata(): Promise<Metadata> {
  const result = await loadCollections();
  return {
    title: "Collections",
    description: "Explore the published editorial collections.",
    alternates: { canonical: "/collections" },
    robots: result.ok && result.isDemo ? { index: false, follow: false } : undefined,
    openGraph: {
      title: "Collections",
      description: "Explore the published editorial collections.",
      type: "website",
    },
  };
}
export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  const result = await loadCollections();
  if (!result.ok)
    return (
      <CatalogueShell title="Collections">
        <CatalogueFailureState reason={result.reason} message={result.message} />
      </CatalogueShell>
    );

  return (
    <CatalogueShell title="Collections" isDemo={result.isDemo}>
      <section className="catalogue-inner catalogue-collection-grid">
        {result.data.length === 0 ? (
          <CatalogueEmptyState title="No published collections">
            Collections will appear here when editorial content is published.
          </CatalogueEmptyState>
        ) : (
          result.data.map((collection) => (
            <Link
              key={collection.id ?? collection.slug}
              href={`/collections/${collection.slug}`}
              className="collection-card"
            >
              <ProductImage
                src={collection.heroMedia?.url}
                ratio="collection"
                alt={collection.heroMedia?.alt || `${collection.title} collection`}
              />
              <div className="collection-card__body">
                <p className="catalogue-eyebrow">Collection</p>
                <h2>{collection.title}</h2>
                <p>{collection.description}</p>
              </div>
            </Link>
          ))
        )}
      </section>
      <BreadcrumbJsonLd
        items={[
          { name: "Home", path: "/" },
          { name: "Collections", path: "/collections" },
        ]}
      />
    </CatalogueShell>
  );
}
