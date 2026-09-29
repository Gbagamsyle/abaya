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

const PRODUCT_QUERY = `*[_type == "product" && defined(commerceProductId)]|order(title asc){
  _id, _updatedAt, title, slug, commerceProductId, shortDescription, newArrival,
  "description": pt::text(description),
  "images": images[]{"url": image.asset->url, "alt": coalesce(alt, "")},
  "collections": collections[]->{_id, title, slug}, material, careInformation, includedItems,
  socialProof[]{platform, contentUrl, metricValue, metricLabel, verified},
  "seo": {"title": seo.title, "description": seo.description, canonicalUrl}
}`;

const COLLECTION_QUERY = `*[_type == "collection"]|order(title asc){
  _id, title, slug, description,
  "heroMedia": {"url": heroMedia.asset->url, "alt": coalesce(heroMedia.alt, "")},
  "productIds": productReferences[]._ref,
  "seo": {"title": seo.title, "description": seo.description, canonicalUrl}
}`;

const PRODUCT_BY_SLUG_QUERY = `*[_type == "product" && slug.current == $slug][0]{
  _id, _updatedAt, title, slug, commerceProductId, shortDescription, newArrival,
  "description": pt::text(description),
  "images": images[]{"url": image.asset->url, "alt": coalesce(alt, "")},
  "collections": collections[]->{_id, title, slug}, material, careInformation, includedItems,
  socialProof[]{platform, contentUrl, metricValue, metricLabel, verified},
  "seo": {"title": seo.title, "description": seo.description, canonicalUrl}
}`;

export async function getSanityProducts() {
  return querySanity<SanityEditorialProduct[]>(PRODUCT_QUERY);
}

export async function getSanityProductBySlug(slug: string) {
  return querySanity<SanityEditorialProduct | null>(PRODUCT_BY_SLUG_QUERY, { slug });
}

export async function getSanityCollections() {
  return querySanity<
    Array<{
      _id: string;
      title: string;
      slug?: { current?: string } | string;
      description?: string;
      heroMedia?: { url?: string; alt?: string };
      productIds?: string[];
      seo?: StorefrontCollectionEntry["seo"];
    }>
  >(COLLECTION_QUERY);
}

export function mapSanityCollection(
  input: Awaited<ReturnType<typeof getSanityCollections>>[number],
): StorefrontCollectionEntry {
  return {
    id: input._id,
    title: input.title,
    slug: typeof input.slug === "string" ? input.slug : (input.slug?.current ?? ""),
    description: input.description,
    heroMedia: input.heroMedia
      ? { url: input.heroMedia.url, alt: input.heroMedia.alt ?? "" }
      : undefined,
    productIds: input.productIds ?? [],
    seo: input.seo
      ? { ...input.seo, canonicalUrl: safeHttpUrl(input.seo.canonicalUrl) }
      : undefined,
  };
}
