type SlugValue = string | { current?: string } | undefined;

type HomepageSectionLike = {
  _key?: string;
  sectionType?: string;
  title?: string;
  description?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  isHidden?: boolean;
  collection?: Record<string, unknown> | null;
  productReferences?: Array<Record<string, unknown>>;
  image?: Record<string, unknown> | null;
};

type CatalogueLike = {
  products?: Array<{
    slug?: string;
    newArrival?: boolean;
    title?: string;
    media?: Array<{ url?: string }>;
    id?: string;
    isDemo?: boolean;
    commerceProductId?: string;
    price?: { amount?: number; currency?: string };
    variants?: Array<{ availability?: string }>;
  }>;
  collections?: Array<{
    title?: string;
    description?: string;
    slug?: SlugValue;
    heroMedia?: { url?: string };
  }>;
};

type SiteSettingsLike = {
  announcementEnabled?: boolean;
  announcementText?: string;
  brandName?: string;
};

const SECTION_ORDER: Record<string, number> = {
  hero: 0,
  featuredCollection: 1,
  newArrivals: 2,
  editorialStory: 3,
  socialContent: 4,
  collectionGrid: 5,
  personalShoppingCta: 6,
  wholesaleCta: 7,
  newsletter: 8,
};

function sectionRank(sectionType?: string) {
  return SECTION_ORDER[sectionType ?? ""] ?? 99;
}

function cleanSlug(value?: SlugValue) {
  if (typeof value === "string") return value;
  return value?.current ?? "";
}

export function sanitizeCtaUrl(value?: string, fallback = "/shop") {
  if (!value || value.trim() === "") return fallback;
  const trimmed = value.trim();
  if (/^(https?:|mailto:|tel:|javascript:)/i.test(trimmed)) return fallback;
  if (trimmed.startsWith("//")) return fallback;
  if (!trimmed.startsWith("/") && !trimmed.startsWith("#") && !trimmed.startsWith("?")) {
    return fallback;
  }
  return trimmed;
}

export function toProductLink(product: { slug?: SlugValue | string } | null | undefined) {
  const slug = cleanSlug(product?.slug as SlugValue);
  return slug ? `/products/${slug}` : "/shop";
}

export function toCollectionLink(collection: { slug?: SlugValue | string } | null | undefined) {
  const slug = cleanSlug(collection?.slug as SlugValue);
  return slug ? `/collections/${slug}` : "/collections";
}

export function buildHomepageState(
  homepage: { sections?: HomepageSectionLike[] } | null | undefined,
  catalogue: CatalogueLike = { products: [], collections: [] },
  siteSettings: SiteSettingsLike = {},
) {
  const rawSections = Array.isArray(homepage?.sections) ? homepage.sections : [];
  const sections = rawSections
    .filter((section) => !!section && !section.isHidden && !!section.sectionType)
    .sort((a, b) => sectionRank(a.sectionType) - sectionRank(b.sectionType));

  const heroSection = sections.find((section) => section.sectionType === "hero") ?? null;
  const productEntries = Array.isArray(catalogue.products) ? catalogue.products : [];
  const collectionEntries = Array.isArray(catalogue.collections) ? catalogue.collections : [];
  const newArrivals =
    sections
      .find((section) => section.sectionType === "newArrivals")
      ?.productReferences?.filter((product) => cleanSlug(product.slug as SlugValue))
      .slice(0, 4) ?? productEntries.filter((product) => product.newArrival).slice(0, 4);

  const featuredCollection =
    sections.find((section) => section.sectionType === "featuredCollection")?.collection ??
    collectionEntries[0] ??
    null;

  const collectionGrid = sections
    .filter((section) => section.sectionType === "collectionGrid")
    .flatMap((section) => (section.collection ? [section.collection] : []));

  const storySections = sections.filter(
    (section) =>
      section.sectionType === "editorialStory" || section.sectionType === "socialContent",
  );

  const ctaCards = sections.filter(
    (section) =>
      section.sectionType === "personalShoppingCta" || section.sectionType === "wholesaleCta",
  );

  const announcement = siteSettings.announcementEnabled
    ? (siteSettings.announcementText ?? "").trim()
    : "";

  return {
    announcement,
    brandName: siteSettings.brandName ?? "Fenomena",
    hero: heroSection,
    sections,
    newArrivals,
    featuredCollection,
    collectionGrid,
    stories: storySections,
    ctaCards,
    products: productEntries,
    collections: collectionEntries,
  };
}
