export interface ProductSummary {
  id: string;
  title: string;
  handle: string;
  description?: string;
  thumbnail?: string;
}

export interface MoneyAmount {
  amount: number;
  currencyCode: string;
}

export interface CommerceVariant {
  id: string;
  sku: string;
  options: Record<string, string>;
  prices: MoneyAmount[];
  availableForSale: boolean;
}

export type SocialPlatform = "instagram" | "tiktok" | "telegram";

export interface SocialMetadata {
  platform: SocialPlatform;
  url: string;
  manuallyVerifiedViewCount?: number;
  verifiedAt?: string;
  featuredOnSocial: boolean;
}

export interface ProductEditorial extends ProductSummary {
  commerceProductId: string;
  images: Array<{ url: string; alt: string }>;
  social?: SocialMetadata[];
  seo?: { title?: string; description?: string; shareImageUrl?: string };
}

export interface CartItemInput {
  variantId: string;
  quantity: number;
}

export interface WholesaleEnquiryInput {
  name: string;
  business: string;
  country: string;
  websiteOrSocial?: string;
  productsOfInterest: string[];
  approximateQuantity?: string;
  message: string;
}

export interface PersonalShoppingEnquiryInput {
  name: string;
  country: string;
  requestedItem: string;
  budget?: MoneyAmount;
  quantity?: number;
  preferredDate?: string;
  notes?: string;
}
