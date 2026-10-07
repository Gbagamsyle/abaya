export const siteSettingsQuery = `*[_type == "siteSettings"][0]{
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
}`;

export const homepageQuery = `*[_type == "homepage"][0]{
  title,
  slug,
  sections[]{
    sectionType,
    title,
    description,
    ctaLabel,
    ctaUrl,
    collection->{title, slug},
    productReferences[]->{_id, title, slug, commerceIntegrationKey},
    image
  },
  seo
}`;

export const productsQuery = `*[_type == "product"]|order(title asc){
  _id,
  title,
  slug,
  commerceIntegrationKey,
  shortDescription,
  featured,
  newArrival,
  images,
  collections[]->{title, slug},
  seo
}`;

export const productBySlugQuery = `*[_type == "product" && slug.current == $slug][0]{
  _id,
  title,
  slug,
  commerceIntegrationKey,
  shortDescription,
  description,
  images,
  material,
  careInformation,
  includedItems,
  stylingDetails,
  collections[]->{title, slug},
  socialProof,
  seo
}`;

export const collectionsQuery = `*[_type == "collection"]|order(title asc){
  _id,
  title,
  slug,
  description,
  heroMedia,
  featured,
  seo
}`;

export const collectionBySlugQuery = `*[_type == "collection" && slug.current == $slug][0]{
  _id,
  title,
  slug,
  description,
  heroMedia,
  editorialContent,
  productReferences[]->{_id, title, slug, commerceIntegrationKey},
  seo
}`;

export const faqQuery = `*[_type == "faq"]|order(_createdAt asc){
  _id,
  question,
  answer,
  category
}`;

export const personalShoppingQuery = `*[_type == "personalShoppingPage"][0]{
  title,
  slug,
  intro,
  body,
  ctaLabel,
  seo
}`;

export const wholesaleQuery = `*[_type == "wholesalePage"][0]{
  title,
  slug,
  intro,
  body,
  ctaLabel,
  seo
}`;
