import { defineQuery } from "groq";
import type {
  COLLECTION_QUERYResult,
  Homepage,
  PRODUCT_BY_SLUG_QUERYResult,
  PRODUCT_QUERYResult,
  SiteSettings,
} from "./sanity.types";
import type { SanityEditorialProduct, StorefrontCollectionEntry } from "./domain";
import { safeHttpUrl } from "./safe-url";

const API_VERSION = process.env.SANITY_API_VERSION ?? "2025-02-19";

function requiredSanityConfig() {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET;
  if (!projectId || !dataset || projectId === "replace-me") {
    throw new Error("Sanity is not configured. Set SANITY_PROJECT_ID and SANITY_DATASET.");
  }
  return { projectId, dataset };
}

async function querySanity<T>(query: string, params: Record<string, string> = {}): Promise<T> {
  const { projectId, dataset } = requiredSanityConfig();
  const url = new URL(`https://${projectId}.api.sanity.io/v${API_VERSION}/data/query/${dataset}`);
  url.searchParams.set("query", query);
  for (const [key, value] of Object.entries(params))
    url.searchParams.set(`$${key}`, JSON.stringify(value));

  const response = await fetch(url, { next: { revalidate: 60 } });
  if (!response.ok) throw new Error(`Sanity query failed (${response.status}).`);
  const payload = (await response.json()) as { result: T };
  return payload.result;
}

const SITE_SETTINGS_QUERY = defineQuery(`*[_type == "siteSettings"][0]{
  _id,
  brandName,
  logo,
  contactEmail,
  whatsappNumber,
  instagramUrl,
  tiktokUrl,
  telegramUrl,
  defaultCurrency,
  announcementText,
  announcementEnabled,
  footerContent,
  legalLinks
}`);

const HOMEPAGE_QUERY = defineQuery(`*[_type == "homepage"][0]{
  _id,
  title,
  slug,
  seo,
  sections[]{
    _key,
    sectionType,
    title,
    description,
    ctaLabel,
    ctaUrl,
    collection->{_id, title, slug},
    productReferences[]->{_id, title, slug, commerceIntegrationKey, shortDescription, newArrival,
      "images": images[]{"url": image.asset->url, "alt": coalesce(alt, "")}
    },
    "image": {"url": image.asset->url, "alt": coalesce(image.alt, "")}
  }
}`);

const PRODUCT_QUERY =
  defineQuery(`*[_type == "product" && defined(commerceIntegrationKey)]|order(title asc){
  _id, _updatedAt, title, slug, commerceIntegrationKey, shortDescription, newArrival,
  "description": pt::text(description),
  "images": images[]{"url": image.asset->url, "alt": coalesce(alt, "")},
  "collections": collections[]->{_id, title, slug}, material, careInformation, includedItems,
  socialProof{platform, contentUrl, metricValue, metricLabel, verified},
  "seo": {"title": seo.title, "description": seo.description, "canonicalUrl": seo.canonicalUrl}
}`);

const COLLECTION_QUERY = defineQuery(`*[_type == "collection"]|order(title asc){
  _id, title, slug, description,
  "heroMedia": {"url": heroMedia.asset->url, "alt": coalesce(heroMedia.alt, "")},
  "productIds": productReferences[]._ref,
  "seo": {"title": seo.title, "description": seo.description, "canonicalUrl": seo.canonicalUrl}
}`);

const PRODUCT_BY_SLUG_QUERY = defineQuery(`*[_type == "product" && slug.current == $slug][0]{
  _id, _updatedAt, title, slug, commerceIntegrationKey, shortDescription, newArrival,
  "description": pt::text(description),
  "images": images[]{"url": image.asset->url, "alt": coalesce(alt, "")},
  "collections": collections[]->{_id, title, slug}, material, careInformation, includedItems,
  socialProof{platform, contentUrl, metricValue, metricLabel, verified},
  "seo": {"title": seo.title, "description": seo.description, "canonicalUrl": seo.canonicalUrl}
}`);

type ProductQueryRecord = PRODUCT_QUERYResult[number] | NonNullable<PRODUCT_BY_SLUG_QUERYResult>;

function mapSanityProduct(input: ProductQueryRecord): SanityEditorialProduct {
  if (!input.title || !input.commerceIntegrationKey) {
    throw new Error("Sanity product is missing its title or commerce integration key.");
  }

  const socialProof = input.socialProof
    ? [
        {
          platform: input.socialProof.platform ?? undefined,
          contentUrl: input.socialProof.contentUrl ?? undefined,
          metricValue: input.socialProof.metricValue ?? undefined,
          metricLabel: input.socialProof.metricLabel ?? undefined,
          verified: input.socialProof.verified ?? undefined,
        },
      ]
    : undefined;

  return {
    _id: input._id,
    _updatedAt: input._updatedAt,
    title: input.title,
    slug: input.slug ?? undefined,
    commerceIntegrationKey: input.commerceIntegrationKey,
    shortDescription: input.shortDescription ?? undefined,
    description: input.description ?? undefined,
    images: input.images?.flatMap((image) =>
      image.url ? [{ url: image.url, alt: image.alt ?? "" }] : [],
    ),
    collections: input.collections?.flatMap((collection) =>
      collection.title && collection.slug
        ? [{ _id: collection._id, title: collection.title, slug: collection.slug }]
        : [],
    ),
    material: input.material ?? undefined,
    careInformation: input.careInformation ?? undefined,
    includedItems: input.includedItems ?? undefined,
    socialProof,
    newArrival: input.newArrival ?? undefined,
    seo: input.seo
      ? {
          title: input.seo.title ?? undefined,
          description: input.seo.description ?? undefined,
          canonicalUrl: input.seo.canonicalUrl ?? undefined,
        }
      : undefined,
  };
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  return querySanity<SiteSettings | null>(SITE_SETTINGS_QUERY);
}

export async function getHomepage(): Promise<Homepage | null> {
  return querySanity<Homepage | null>(HOMEPAGE_QUERY);
}

export async function getSanityProducts() {
  const products = await querySanity<PRODUCT_QUERYResult>(PRODUCT_QUERY);
  return products.map(mapSanityProduct);
}

export async function getSanityProductBySlug(slug: string) {
  const product = await querySanity<PRODUCT_BY_SLUG_QUERYResult>(PRODUCT_BY_SLUG_QUERY, { slug });
  return product ? mapSanityProduct(product) : null;
}

export async function getSanityCollections() {
  return querySanity<COLLECTION_QUERYResult>(COLLECTION_QUERY);
}

export function mapSanityCollection(
  input: Awaited<ReturnType<typeof getSanityCollections>>[number],
): StorefrontCollectionEntry {
  return {
    id: input._id,
    title: input.title ?? "",
    slug: input.slug?.current ?? "",
    description: input.description ?? undefined,
    heroMedia: input.heroMedia.url
      ? { url: input.heroMedia.url, alt: input.heroMedia.alt ?? "" }
      : undefined,
    productIds: input.productIds ?? [],
    seo: input.seo
      ? {
          title: input.seo.title ?? undefined,
          description: input.seo.description ?? undefined,
          canonicalUrl: safeHttpUrl(input.seo.canonicalUrl ?? undefined),
        }
      : undefined,
  };
}
