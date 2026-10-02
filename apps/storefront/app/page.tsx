import Link from "next/link";
import { CatalogueShell } from "../components/catalogue-shell";
import { ProductImage } from "../components/product-image";
import { StorefrontProductCard } from "../components/storefront-product-card";
import { loadCatalogue } from "../lib/catalogue-service";
import {
  buildHomepageState,
  sanitizeCtaUrl,
  toCollectionLink,
  toProductLink,
} from "../lib/homepage";
import { getHomepage, getSiteSettings } from "../lib/sanity-adapter";

type ResolvedImage = { url?: string; alt?: string };
type ResolvedProductReference = {
  _id?: string;
  title?: string;
  slug?: string | { current?: string };
  images?: ResolvedImage[];
};

function resolveSlug(value?: string | { current?: string }) {
  return typeof value === "string" ? value : (value?.current ?? "");
}

type ResolvedHomepageSection = {
  _key: string;
  sectionType?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  collection?: {
    _id?: string;
    title?: string;
    slug?: string | { current?: string };
    description?: string;
    heroMedia?: ResolvedImage;
  };
  productReferences?: Array<{
    _id?: string;
    title?: string;
    slug?: string | { current?: string };
    images?: ResolvedImage[];
  }>;
  image?: ResolvedImage;
};

export default async function HomePage() {
  const [siteSettings, homepage, catalogueResult] = (await Promise.all([
    getSiteSettings().catch(() => null),
    getHomepage().catch(() => null),
    loadCatalogue().catch(() => ({ ok: false, reason: "cms-unavailable", message: "" })),
  ])) as [
    Awaited<ReturnType<typeof getSiteSettings>> | null,
    Awaited<ReturnType<typeof getHomepage>> | null,
    Awaited<ReturnType<typeof loadCatalogue>> | { ok: false; reason: string; message: string },
  ];

  const products = catalogueResult.ok ? catalogueResult.data.products : [];
  const collections = catalogueResult.ok ? catalogueResult.data.collections : [];
  const homepageState = buildHomepageState(
    homepage,
    { products, collections },
    siteSettings ?? undefined,
  );
  const defaultTitle = homepageState.brandName;
  const sections = homepageState.sections as ResolvedHomepageSection[];
  const heroSection = homepageState.hero as ResolvedHomepageSection | null;
  const featuredCollection = homepageState.featuredCollection as
    ResolvedHomepageSection["collection"] | null;
  const featuredCollectionSlug =
    featuredCollection?.slug && typeof featuredCollection.slug !== "string"
      ? (featuredCollection.slug.current ?? "")
      : (featuredCollection?.slug ?? "");
  const newArrivals = homepageState.newArrivals as Array<{
    slug?: string;
    title?: string;
    images?: ResolvedImage[];
    id?: string;
    _id?: string;
  }>;
  const collectionGrid = homepageState.collectionGrid as Array<
    NonNullable<ResolvedHomepageSection["collection"]>
  >;

  return (
    <CatalogueShell>
      {homepageState.announcement ? (
        <div className="catalogue-announcement-bar" role="status">
          {homepageState.announcement}
        </div>
      ) : null}

      <div className="editorial-homepage">
        <section className="editorial-hero">
          <div className="editorial-hero__content">
            <p className="catalogue-eyebrow">{defaultTitle}</p>
            <h1>{heroSection?.title ?? "Curated essentials for everyday elegance"}</h1>
            <p>
              {heroSection?.description ??
                "Shop considered silhouettes, elevated layers, and editorial staples built for modern movement."}
            </p>
            <div className="editorial-hero__actions">
              <Link
                href={sanitizeCtaUrl(heroSection?.ctaUrl)}
                className="editorial-button editorial-button--primary"
              >
                {heroSection?.ctaLabel ?? "Shop the edit"}
              </Link>
              <Link href="/collections" className="editorial-button editorial-button--secondary">
                Explore collections
              </Link>
            </div>
          </div>
          <div className="editorial-hero__media">
            <ProductImage
              src={heroSection?.image?.url ?? products[0]?.media?.[0]?.url}
              alt={heroSection?.title ?? "Featured storefront imagery"}
              ratio="editorial-landscape"
              priority
            />
          </div>
        </section>

        {featuredCollection ? (
          <section className="editorial-featured-collection">
            <div className="editorial-featured-collection__copy">
              <p className="catalogue-eyebrow">Featured collection</p>
              <h2>{featuredCollection.title}</h2>
              <p>
                {featuredCollection.description ?? "A refined assortment shaped for the season."}
              </p>
              <Link
                href={toCollectionLink({ slug: featuredCollectionSlug })}
                className="editorial-button editorial-button--primary"
              >
                View collection
              </Link>
            </div>
            <div className="editorial-featured-collection__media">
              <ProductImage
                src={featuredCollection.heroMedia?.url}
                alt={featuredCollection.title ?? "Featured collection"}
                ratio="collection"
              />
            </div>
          </section>
        ) : null}

        {newArrivals.length > 0 ? (
          <section className="editorial-section">
            <div className="catalogue-intro-row">
              <div>
                <p className="catalogue-eyebrow">New arrivals</p>
                <h2>Freshly added</h2>
              </div>
              <Link href="/new-arrivals" className="editorial-link">
                View all →
              </Link>
            </div>
            <div className="catalogue-product-grid editorial-product-grid">
              {newArrivals.map((product) => {
                const slug = resolveSlug(product.slug);
                if (!slug) return null;

                const productDetail = products.find((item) => item.slug === slug);
                if (productDetail) {
                  return <StorefrontProductCard key={productDetail.id} product={productDetail} />;
                }

                const fallbackProduct = product as ResolvedProductReference;
                return (
                  <article key={slug} className="editorial-simple-card">
                    <Link href={toProductLink({ slug })}>
                      <ProductImage
                        src={fallbackProduct.images?.[0]?.url}
                        alt={fallbackProduct.title ?? "Featured product"}
                        ratio="product"
                      />
                    </Link>
                    <div className="editorial-simple-card__body">
                      <h3>{fallbackProduct.title}</h3>
                      <Link href={toProductLink({ slug })} className="editorial-subtle-link">
                        View product
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {collectionGrid.length > 0 ? (
          <section className="editorial-section">
            <div className="catalogue-intro-row">
              <div>
                <p className="catalogue-eyebrow">Collections</p>
                <h2>Shop by story</h2>
              </div>
            </div>
            <div className="catalogue-collection-grid editorial-collection-grid">
              {collectionGrid.slice(0, 3).map((collection) => {
                const slug = resolveSlug(collection.slug);
                const title = collection.title ?? "Collection";
                return (
                  <article key={slug || title} className="editorial-collection-card">
                    <Link href={toCollectionLink({ slug })}>
                      <ProductImage
                        src={collection.heroMedia?.url}
                        alt={title}
                        ratio="collection"
                      />
                    </Link>
                    <div className="editorial-collection-card__body">
                      <h3>{title}</h3>
                      <p>{collection.description ?? "Explore the latest curation."}</p>
                      <Link href={toCollectionLink({ slug })} className="editorial-subtle-link">
                        Shop collection
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        {sections.filter(
          (section) =>
            section.sectionType === "editorialStory" || section.sectionType === "socialContent",
        ).length > 0 ? (
          <section className="editorial-section editorial-story-grid">
            {sections
              .filter(
                (section) =>
                  section.sectionType === "editorialStory" ||
                  section.sectionType === "socialContent",
              )
              .map((section) => (
                <article key={section._key} className="editorial-story">
                  {section.image?.url ? (
                    <ProductImage
                      src={section.image.url}
                      alt={section.title ?? "Editorial story"}
                      ratio="editorial-portrait"
                    />
                  ) : null}
                  <div className="editorial-story__body">
                    <p className="catalogue-eyebrow">
                      {section.sectionType === "socialContent"
                        ? "Social spotlight"
                        : "Editorial story"}
                    </p>
                    <h3>{section.title ?? "Curated for everyday rituals"}</h3>
                    <p>
                      {section.description ??
                        "Explore the wardrobe stories behind each silhouette."}
                    </p>
                    {section.ctaLabel && section.ctaUrl ? (
                      <Link href={sanitizeCtaUrl(section.ctaUrl)} className="editorial-subtle-link">
                        {section.ctaLabel}
                      </Link>
                    ) : null}
                  </div>
                </article>
              ))}
          </section>
        ) : null}

        {sections.some(
          (section) =>
            section.sectionType === "personalShoppingCta" || section.sectionType === "wholesaleCta",
        ) ? (
          <section className="editorial-cta-grid">
            {sections
              .filter(
                (section) =>
                  section.sectionType === "personalShoppingCta" ||
                  section.sectionType === "wholesaleCta",
              )
              .map((section) => (
                <article key={section._key} className="editorial-cta-card">
                  <p className="catalogue-eyebrow">
                    {section.sectionType === "personalShoppingCta"
                      ? "Personal shopping"
                      : "Wholesale"}
                  </p>
                  <h3>
                    {section.title ??
                      (section.sectionType === "personalShoppingCta"
                        ? "Styling support"
                        : "Wholesale enquiries")}
                  </h3>
                  <p>
                    {section.description ??
                      "Speak with our team for tailored recommendations or account support."}
                  </p>
                  <Link
                    href={sanitizeCtaUrl(
                      section.ctaUrl ??
                        (section.sectionType === "personalShoppingCta" ? "/shop" : "/collections"),
                    )}
                    className="editorial-button editorial-button--primary"
                  >
                    {section.ctaLabel ?? "Get in touch"}
                  </Link>
                </article>
              ))}
          </section>
        ) : null}

        {products.length > 0 &&
        !sections.some((section) => section.sectionType === "newArrivals") ? (
          <section className="editorial-section">
            <div className="catalogue-intro-row">
              <div>
                <p className="catalogue-eyebrow">Featured</p>
                <h2>Popular now</h2>
              </div>
            </div>
            <div className="catalogue-product-grid editorial-product-grid">
              {products.slice(0, 3).map((product) => (
                <StorefrontProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="editorial-newsletter">
          <div>
            <p className="catalogue-eyebrow">Stay informed</p>
            <h2>Style notes, new edits, and private drops.</h2>
          </div>
          <Link
            href={siteSettings?.contactEmail ? `mailto:${siteSettings.contactEmail}` : "/shop"}
            className="editorial-button editorial-button--primary"
          >
            {siteSettings?.contactEmail ? "Email the studio" : "Shop the latest"}
          </Link>
        </section>
      </div>
    </CatalogueShell>
  );
}
