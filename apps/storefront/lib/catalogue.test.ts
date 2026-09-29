import assert from "node:assert/strict";
import test from "node:test";
import { composeProduct } from "./composition";
import {
  filterAndSortProducts,
  getAvailableOptionValues,
  normalizeSearch,
  resolveVariant,
  searchProducts,
} from "./catalogue-logic";
import type { MedusaCommerceProduct, SanityEditorialProduct, StorefrontProduct } from "./domain";
import { createWhatsAppOrderUrl } from "./whatsapp";
import { DEMO_PRODUCTS } from "./demo-fixtures";

const editorial: SanityEditorialProduct = {
  _id: "sanity-1",
  title: "Sample Luna",
  slug: { current: "sample-luna" },
  commerceProductId: "medusa-1",
  shortDescription: "Lightweight blue abaya",
  description: "Editorial description",
  images: [{ url: "https://cdn.sanity.io/sample.jpg", alt: "Blue garment" }],
  collections: [{ _id: "c1", title: "Quiet Edit", slug: { current: "quiet-edit" } }],
  material: "Cotton blend",
  careInformation: "Cold wash",
  includedItems: ["Belt"],
  socialProof: [
    {
      platform: "instagram",
      contentUrl: "https://instagram.com/sample",
      metricValue: 120,
      metricLabel: "views",
      verified: true,
    },
  ],
  seo: { title: "SEO title", description: "SEO description" },
  _updatedAt: "2026-01-01T00:00:00.000Z",
  newArrival: true,
};

const commerce: MedusaCommerceProduct = {
  id: "medusa-1",
  title: "Commerce identity",
  variants: [
    {
      id: "v-blue-56",
      title: "Baby Blue / 56",
      sku: "LUNA-BLUE-56",
      options: [
        { title: "Colour", value: "Baby Blue" },
        { title: "Size", value: "56" },
      ],
      calculated_price: { calculated_amount: 25900, currency_code: "myr" },
      inventory_quantity: 2,
      manage_inventory: true,
    },
    {
      id: "v-blue-58",
      title: "Baby Blue / 58",
      options: [
        { title: "Colour", value: "Baby Blue" },
        { title: "Size", value: "58" },
      ],
      calculated_price: { calculated_amount: 25900, currency_code: "myr" },
      inventory_quantity: 0,
      manage_inventory: true,
    },
    {
      id: "v-oat-56",
      title: "Oat / 56",
      options: [
        { title: "Colour", value: "Oat" },
        { title: "Size", value: "56" },
      ],
      calculated_price: { calculated_amount: 25900, currency_code: "myr" },
      inventory_quantity: 1,
      manage_inventory: true,
    },
  ],
};

const product = composeProduct(editorial, commerce);

function makeProduct(overrides: Partial<StorefrontProduct> = {}): StorefrontProduct {
  return { ...product, ...overrides };
}

test("composeProduct joins editorial identity and commerce-authoritative variants", () => {
  assert.equal(product.id, "sanity-1");
  assert.equal(product.commerceProductId, "medusa-1");
  assert.equal(product.title, "Sample Luna");
  assert.equal(product.price?.amount, 259);
  assert.equal(product.price?.currency, "MYR");
  assert.equal(product.variants[0]?.availability, "available");
  assert.equal(product.variants[1]?.availability, "unavailable");
  assert.equal(product.material, "Cotton blend");
  assert.equal(product.isDemo, false);
  assert.throws(() => composeProduct(editorial, { ...commerce, id: "different-id" }), /mismatch/);
});

test("fictional demo records use the exact storefront composition contract", () => {
  assert.ok(DEMO_PRODUCTS.length > 0);
  assert.equal(
    DEMO_PRODUCTS.every((item) => item.isDemo),
    true,
  );
  assert.equal(typeof DEMO_PRODUCTS[0]?.commerceProductId, "string");
  assert.equal(DEMO_PRODUCTS[0]?.variants[0]?.options.Colour, "Baby Blue");
});

test("variant resolution distinguishes valid and impossible option combinations", () => {
  assert.equal(resolveVariant(product, { Colour: "Baby Blue", Size: "56" })?.id, "v-blue-56");
  assert.equal(resolveVariant(product, { Colour: "Baby Blue", Size: "60" }), undefined);
  assert.equal(
    resolveVariant(product, { Colour: "Baby Blue", Size: "58" })?.availability,
    "unavailable",
  );
});

test("option availability responds to changes in the other selected option", () => {
  assert.deepEqual(getAvailableOptionValues(product, { Colour: "Baby Blue" }, "Size"), ["56"]);
  assert.deepEqual(getAvailableOptionValues(product, { Size: "56" }, "Colour"), [
    "Baby Blue",
    "Oat",
  ]);
  assert.equal(resolveVariant(product, { Colour: "Oat", Size: "56" })?.id, "v-oat-56");
});

test("single-option products resolve a sole default variant", () => {
  const single = makeProduct({
    variants: [
      {
        id: "one",
        title: "One size",
        options: { Size: "One size" },
        availability: "available",
        price: { amount: 90, currency: "MYR" },
      },
    ],
  });
  assert.equal(resolveVariant(single, {})?.id, "one");
  assert.equal(resolveVariant(single, { Size: "One size" })?.id, "one");
});

test("composition resolves Medusa nested option relation names", () => {
  const nested = composeProduct(editorial, {
    ...commerce,
    variants: [
      {
        id: "nested-option",
        options: [
          { option: { title: "Colour" }, value: "Blue" },
          { option: { title: "Size" }, value: "56" },
        ],
        calculated_price: { calculated_amount: 2590, currency_code: "myr" },
        inventory_quantity: 1,
        manage_inventory: true,
      },
    ],
  });
  assert.equal(resolveVariant(nested, { Colour: "Blue", Size: "56" })?.id, "nested-option");
  assert.equal(nested.price?.amount, 25.9);
});

test("catalogue filters collection, option combination, availability, price and sorting", () => {
  const other = makeProduct({
    id: "sanity-2",
    title: "Other item",
    price: { amount: 120, currency: "MYR" },
    variants: product.variants.map((variant) => ({
      ...variant,
      price: { amount: 120, currency: "MYR" },
    })),
    collections: [{ title: "Other", slug: "other" }],
    updatedAt: "2026-02-01",
  });
  const products = [product, other];
  assert.deepEqual(
    filterAndSortProducts(products, {
      collection: "quiet-edit",
      colour: "Baby Blue",
      size: "56",
      availability: "available",
    }).map((item) => item.id),
    ["sanity-1"],
  );
  assert.deepEqual(
    filterAndSortProducts(products, { minPrice: 200, sort: "price-asc" }).map((item) => item.id),
    ["sanity-1"],
  );
  assert.deepEqual(
    filterAndSortProducts(products, { sort: "newest" }).map((item) => item.id),
    ["sanity-2", "sanity-1"],
  );
  assert.deepEqual(
    filterAndSortProducts(products, { sort: "price-desc" }).map((item) => item.id),
    ["sanity-1", "sanity-2"],
  );
});

test("search normalizes whitespace, case, unicode, collection and descriptive fields", () => {
  assert.equal(normalizeSearch("  BABY   BLUE "), "baby blue");
  assert.deepEqual(
    searchProducts([product], "  QUIET   cotton ").map((item) => item.id),
    ["sanity-1"],
  );
  assert.deepEqual(searchProducts([product], "missing term"), []);
});

test("WhatsApp URL contains encoded selected details and rejects missing configuration", () => {
  const selected = product.variants[0];
  const titleWithReservedCharacters = { ...product, title: "Sample & Luna" };
  const url = createWhatsAppOrderUrl(titleWithReservedCharacters, selected, {
    phone: "+60 12-345 6789",
    siteUrl: "https://shop.example",
  });
  assert.ok(url);
  assert.match(url, /Sample%20%26%20Luna/);
  const parsed = new URL(url);
  const message = parsed.searchParams.get("text") ?? "";
  assert.equal(parsed.hostname, "wa.me");
  assert.match(message, /Sample & Luna/);
  assert.match(message, /Baby Blue \/ 56/);
  assert.match(message, /MYR\s?259/);
  assert.match(message, /https:\/\/shop\.example\/products\/sample-luna/);
  assert.equal(
    createWhatsAppOrderUrl(product, undefined, {
      phone: "60123456789",
      siteUrl: "https://shop.example",
    })?.includes("selection%20to%20confirm"),
    true,
  );
  assert.equal(
    createWhatsAppOrderUrl(product, selected, { siteUrl: "https://shop.example" }),
    undefined,
  );
  assert.equal(createWhatsAppOrderUrl(product, selected, { phone: "60123456789" }), undefined);
  assert.equal(
    createWhatsAppOrderUrl(product, selected, { phone: "123", siteUrl: "https://shop.example" }),
    undefined,
  );
});
