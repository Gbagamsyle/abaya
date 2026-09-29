export type ProductAvailability = "available" | "unavailable" | "unknown";

export type StorefrontMedia = {
  url?: string;
  alt: string;
};

export type StorefrontCollection = {
  id?: string;
  title: string;
  slug: string;
};

export type StorefrontVariant = {
  id: string;
  title: string;
  sku?: string;
  options: Record<string, string>;
  price?: { amount: number; currency: string };
  compareAt?: { amount: number; currency: string };
  availability: ProductAvailability;
};

export type StorefrontProduct = {
  id: string;
  commerceProductId: string;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  media: StorefrontMedia[];
  collections: StorefrontCollection[];
  material?: string;
  care?: string;
  includedItems: string[];
  socialProof: Array<{
    platform: "instagram" | "tiktok" | "telegram";
    url?: string;
    metric?: number;
    metricLabel?: string;
    verified: boolean;
    verifiedAt?: string;
  }>;
  seo: {
    title?: string;
    description?: string;
    canonicalUrl?: string;
  };
  variants: StorefrontVariant[];
  price?: { amount: number; currency: string };
  compareAt?: { amount: number; currency: string };
  availability: ProductAvailability;
  updatedAt?: string;
  newArrival: boolean;
  isDemo: boolean;
};

export type StorefrontCollectionEntry = StorefrontCollection & {
  description?: string;
  heroMedia?: StorefrontMedia;
  seo?: { title?: string; description?: string; canonicalUrl?: string };
  productIds: string[];
};

export type CatalogueFailure = "not-configured" | "cms-unavailable" | "commerce-unavailable";

export type CatalogueResult<T> =
  { ok: true; data: T; isDemo: boolean } | { ok: false; reason: CatalogueFailure; message: string };

export type SanityEditorialProduct = {
  _id: string;
  _updatedAt?: string;
  newArrival?: boolean;
  title: string;
  slug?: { current?: string } | string;
  commerceProductId: string;
  shortDescription?: string;
  description?: string;
  images?: Array<{ url?: string; alt?: string }>;
  collections?: Array<{ _id?: string; title?: string; slug?: { current?: string } | string }>;
  material?: string;
  careInformation?: string;
  includedItems?: string[];
  socialProof?: Array<{
    platform?: "instagram" | "tiktok" | "telegram";
    contentUrl?: string;
    metricValue?: number;
    metricLabel?: string;
    verified?: boolean;
  }>;
  seo?: { title?: string; description?: string; canonicalUrl?: string };
};

export type MedusaCommerceProduct = {
  id: string;
  title: string;
  description?: string;
  status?: string;
  variants?: Array<{
    id: string;
    title?: string;
    sku?: string;
    options?: Array<{ title?: string; value?: string; option?: { title?: string } }>;
    calculated_price?: {
      calculated_amount?: number;
      original_amount?: number;
      currency_code?: string;
    };
    prices?: Array<{ amount?: number; currency_code?: string }>;
    inventory_quantity?: number;
    manage_inventory?: boolean;
    allow_backorder?: boolean;
  }>;
};
