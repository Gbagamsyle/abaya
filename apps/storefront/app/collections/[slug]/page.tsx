import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogueEmptyState, CatalogueFailureState } from "../../../components/catalogue-state";
import { CatalogueShell } from "../../../components/catalogue-shell";
import { StorefrontProductCard } from "../../../components/storefront-product-card";
import { ProductImage } from "../../../components/product-image";
import { BreadcrumbJsonLd } from "../../../components/structured-data";
import { loadCollection } from "../../../lib/catalogue-service";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadCollection(slug);
  if (!result.ok || !result.data.collection)
    return { title: "Collection not found", robots: { index: false, follow: false } };
  const collection = result.data.collection;
  const title = collection.seo?.title ?? collection.title;
  const description =
    collection.seo?.description ?? collection.description ?? "Explore this editorial collection.";
  return {
    title,
    description,
    alternates: { canonical: collection.seo?.canonicalUrl ?? `/collections/${collection.slug}` },
    robots: result.isDemo ? { index: false, follow: false } : undefined,
    openGraph: { title, description, type: "website", images: collection.heroMedia?.url },
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await loadCollection(slug);
  if (!result.ok)
    return (
      <CatalogueShell title="Collection">
        <CatalogueFailureState reason={result.reason} message={result.message} />
      </CatalogueShell>
    );
  const { collection, products } = result.data;
  if (!collection) notFound();

  return (
    <CatalogueShell title={collection.title} isDemo={result.isDemo}>
      <section className="catalogue-inner">
        <div className="collection-hero">
          <ProductImage
            src={collection.heroMedia?.url}
            ratio="editorial-landscape"
            alt={collection.heroMedia?.alt || `${collection.title} collection`}
          />
          <div>
            <p className="catalogue-eyebrow">Collection</p>
            <h2>{collection.description}</h2>
            <Link href="/shop" className="catalogue-link">
              Shop all products →
            </Link>
          </div>
        </div>
        {products.length === 0 ? (
          <CatalogueEmptyState title="No products in this collection">
            This collection has no published product references yet.
          </CatalogueEmptyState>
        ) : (
          <div className="catalogue-product-grid">
            {products.map((product) => (
              <StorefrontProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
        <BreadcrumbJsonLd
          items={[
            { name: "Home", path: "/" },
            { name: "Collections", path: "/collections" },
            { name: collection.title, path: `/collections/${collection.slug}` },
          ]}
        />
      </section>
    </CatalogueShell>
  );
}
