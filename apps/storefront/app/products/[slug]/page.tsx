import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogueFailureState } from "../../../components/catalogue-state";
import { CatalogueShell } from "../../../components/catalogue-shell";
import { ProductGallery } from "../../../components/product-gallery";
import { ProductVariantPurchase } from "../../../components/product-variant-purchase";
import { BreadcrumbJsonLd, ProductJsonLd } from "../../../components/structured-data";
import { StorefrontProductCard } from "../../../components/storefront-product-card";
import { loadCatalogue, loadProduct } from "../../../lib/catalogue-service";
import { getStorefrontConfig } from "../../../lib/storefront-config";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const result = await loadProduct(slug);
  if (!result.ok || !result.data)
    return { title: "Product not found", robots: { index: false, follow: false } };
  const product = result.data;
  const title = product.seo.title ?? product.title;
  const description = product.seo.description ?? product.shortDescription;
  return {
    title,
    description,
    alternates: { canonical: product.seo.canonicalUrl ?? `/products/${product.slug}` },
    robots: product.isDemo ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      images: product.media.flatMap((item) => (item.url ? [item.url] : [])),
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [result, catalogue] = await Promise.all([loadProduct(slug), loadCatalogue()]);
  if (!result.ok)
    return (
      <CatalogueShell title="Product">
        <CatalogueFailureState reason={result.reason} message={result.message} />
      </CatalogueShell>
    );
  const product = result.data;
  if (!product) notFound();
  const related = catalogue.ok
    ? catalogue.data.products
        .filter(
          (item) =>
            item.id !== product.id &&
            item.collections.some((collection) =>
              product.collections.some((match) => collection.slug === match.slug),
            ),
        )
        .slice(0, 3)
    : [];
  const storefrontConfig = getStorefrontConfig();
  const breadcrumbItems = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    ...(product.collections[0]
      ? [
          {
            name: product.collections[0].title,
            path: `/collections/${product.collections[0].slug}`,
          },
        ]
      : []),
    { name: product.title, path: `/products/${product.slug}` },
  ];

  return (
    <CatalogueShell title={product.title} isDemo={product.isDemo}>
      <section className="product-page catalogue-inner">
        <div className="product-page__gallery">
          <ProductGallery title={product.title} media={product.media} />
        </div>

        <div className="product-page__content">
          <p className="catalogue-eyebrow">
            {product.collections[0] ? (
              <Link href={`/collections/${product.collections[0].slug}`}>
                {product.collections[0].title}
              </Link>
            ) : (
              "Product"
            )}
          </p>
          {product.price && (
            <p className="product-page__starting-price">
              From{" "}
              <strong>
                {new Intl.NumberFormat("en", {
                  style: "currency",
                  currency: product.price.currency,
                }).format(product.price.amount)}
              </strong>
            </p>
          )}
          <p className="product-page__description">
            {product.description || product.shortDescription}
          </p>

          {product.isDemo ? (
            <p className="demo-disclaimer" role="note">
              Fictional demo product · all content, variants, prices, and availability are for QA
              only.
            </p>
          ) : null}

          <ProductVariantPurchase
            product={product}
            whatsappPhone={storefrontConfig.whatsappPhone}
            siteUrl={storefrontConfig.siteUrl}
          />

          <div className="product-page__details">
            {product.includedItems.length > 0 && (
              <section>
                <h2>Included</h2>
                <ul>
                  {product.includedItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
            {product.material && (
              <section>
                <h2>Material</h2>
                <p>{product.material}</p>
              </section>
            )}
            {product.care && (
              <section>
                <h2>Care</h2>
                <p>{product.care}</p>
              </section>
            )}
            <section>
              <h2>Size guidance</h2>
              <p>
                Check the garment measurements and contact the seller if you need help choosing.
              </p>
              <Link className="catalogue-link" href="/size-guide">
                View size guide →
              </Link>
            </section>
          </div>
          {product.socialProof
            .filter((proof) => proof.verified)
            .map((proof) => (
              <div className="product-social-proof" key={`${proof.platform}-${proof.url}`}>
                <span>Featured on {proof.platform}</span>
                {proof.metric !== undefined && (
                  <span>
                    {new Intl.NumberFormat("en", { notation: "compact" }).format(proof.metric)}{" "}
                    {proof.metricLabel ?? ""}
                  </span>
                )}
                {proof.url && (
                  <a href={proof.url} target="_blank" rel="noopener noreferrer">
                    View source <span className="ui-visually-hidden">(opens in a new tab)</span>
                  </a>
                )}
              </div>
            ))}
        </div>
        {!product.isDemo && <ProductJsonLd product={product} />}
        <BreadcrumbJsonLd items={breadcrumbItems} />
      </section>
      {related.length > 0 && (
        <section className="catalogue-inner product-related" aria-labelledby="related-heading">
          <h2 id="related-heading">More from this collection</h2>
          <div className="catalogue-product-grid">
            {related.map((item) => (
              <StorefrontProductCard product={item} key={item.id} />
            ))}
          </div>
        </section>
      )}
    </CatalogueShell>
  );
}
