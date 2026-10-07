import type { MedusaCommerceProduct, SanityEditorialProduct } from "./domain";
import { composeProduct } from "./composition";

// Fictional QA records. They are opt-in for local development only and are never a production fallback.
const editorial: SanityEditorialProduct[] = [
  {
    _id: "demo-product-luna",
    title: "Demo Luna Abaya",
    slug: { current: "luna-abaya" },
    commerceIntegrationKey: "fenomena:demo-luna-abaya",
    shortDescription: "Fictional sample product for catalogue QA.",
    description:
      "A clearly fictional sample description used to validate the storefront experience.",
    images: [{ alt: "Fictional demo product image" }],
    collections: [
      {
        _id: "demo-collection-quiet",
        title: "Demo Quiet Edit",
        slug: { current: "demo-quiet-edit" },
      },
    ],
    material: "Sample material — not a real product claim",
    careInformation: "Demo care text — confirm product care with the seller.",
    includedItems: ["Demo item only"],
    socialProof: [{ platform: "instagram", verified: false }],
    seo: { title: "Demo Luna Abaya", description: "Fictional demo content. Not an offer." },
    _updatedAt: "2026-01-01T00:00:00.000Z",
    newArrival: true,
  },
  {
    _id: "demo-product-sora",
    title: "Demo Sora Set",
    slug: { current: "sora-set" },
    commerceIntegrationKey: "fenomena:demo-sora-set",
    shortDescription: "Fictional sample product for catalogue QA.",
    description:
      "A clearly fictional sample description used to validate search and collection screens.",
    collections: [
      {
        _id: "demo-collection-evening",
        title: "Demo Evening Edit",
        slug: { current: "demo-evening-edit" },
      },
    ],
    includedItems: [],
    socialProof: [],
    _updatedAt: "2026-02-01T00:00:00.000Z",
  },
];

const commerce: MedusaCommerceProduct[] = [
  {
    id: "demo-medusa-luna",
    external_id: "fenomena:demo-luna-abaya",
    title: "Demo Luna Abaya",
    variants: [
      {
        id: "demo-luna-blue-56",
        title: "Baby Blue / 56",
        sku: "DEMO-LUNA-BLUE-56",
        options: [
          { title: "Colour", value: "Baby Blue" },
          { title: "Size", value: "56" },
        ],
        calculated_price: { calculated_amount: 26000, currency_code: "myr" },
        inventory_quantity: 4,
        manage_inventory: true,
      },
      {
        id: "demo-luna-blue-58",
        title: "Baby Blue / 58",
        sku: "DEMO-LUNA-BLUE-58",
        options: [
          { title: "Colour", value: "Baby Blue" },
          { title: "Size", value: "58" },
        ],
        calculated_price: { calculated_amount: 26000, currency_code: "myr" },
        inventory_quantity: 0,
        manage_inventory: true,
      },
      {
        id: "demo-luna-brown-56",
        title: "Rich Brown / 56",
        sku: "DEMO-LUNA-RICH-BROWN-56",
        options: [
          { title: "Colour", value: "Rich Brown" },
          { title: "Size", value: "56" },
        ],
        calculated_price: { calculated_amount: 26000, currency_code: "myr" },
        inventory_quantity: 2,
        manage_inventory: true,
      },
    ],
  },
  {
    id: "demo-medusa-sora",
    external_id: "fenomena:demo-sora-set",
    title: "Demo Sora Set",
    variants: [
      {
        id: "demo-sora-default",
        title: "Default",
        options: [{ title: "Style", value: "One size" }],
        calculated_price: { calculated_amount: 18000, currency_code: "myr" },
        inventory_quantity: 1,
        manage_inventory: true,
      },
    ],
  },
];

export const DEMO_PRODUCTS = editorial.map((item) => {
  const source = commerce.find((product) => product.external_id === item.commerceIntegrationKey);
  if (!source) throw new Error(`Missing demo commerce fixture for ${item.commerceIntegrationKey}`);
  return composeProduct(item, source, { isDemo: true });
});

export const DEMO_COLLECTIONS = [
  {
    id: "demo-collection-quiet",
    title: "Demo Quiet Edit",
    slug: "demo-quiet-edit",
    description: "Fictional collection content for local QA.",
    productIds: ["demo-product-luna"],
  },
  {
    id: "demo-collection-evening",
    title: "Demo Evening Edit",
    slug: "demo-evening-edit",
    description: "Fictional collection content for local QA.",
    productIds: ["demo-product-sora"],
  },
];
