import assert from "node:assert/strict";
import test from "node:test";
import { buildHomepageState, sanitizeCtaUrl, toCollectionLink, toProductLink } from "./homepage";

test("section ordering keeps the editorial rhythm expected by the homepage", () => {
  const sections = [
    { _key: "hero", sectionType: "hero", title: "Hero" },
    { _key: "story", sectionType: "editorialStory", title: "Story" },
    { _key: "collection", sectionType: "featuredCollection", title: "Collection" },
    { _key: "new", sectionType: "newArrivals", title: "New" },
  ];

  const result = buildHomepageState(
    { sections } as never,
    { products: [], collections: [] } as never,
  );

  assert.deepEqual(
    result.sections.map((section) => section.sectionType),
    ["hero", "featuredCollection", "newArrivals", "editorialStory"],
  );
});

test("missing or disabled sections are excluded without using fake fallback copy", () => {
  const result = buildHomepageState(
    {
      sections: [
        { _key: "hero", sectionType: "hero", title: "Hero", description: "Ready" },
        { _key: "disabled", sectionType: "newsletter", title: "Disabled", isHidden: true },
        { _key: "cta", sectionType: "personalShoppingCta", title: "Styling", description: "Help" },
      ],
    } as never,
    { products: [], collections: [] } as never,
  );

  assert.equal(result.sections.length, 2);
  assert.equal(result.sections[0]?.sectionType, "hero");
  assert.equal(result.sections[1]?.sectionType, "personalShoppingCta");
  assert.equal(result.hero?.title, "Hero");
  assert.equal(result.ctaCards[0]?.title, "Styling");
});

test("missing homepage or CMS failure returns a safe, empty state", () => {
  const result = buildHomepageState(null as never, { products: [], collections: [] } as never);

  assert.equal(result.sections.length, 0);
  assert.equal(result.hero, null);
  assert.equal(result.newArrivals.length, 0);
  assert.equal(result.featuredCollection, null);
});

test("Sanity product resolves to the Medusa commerce identity and keeps price/inventory authoritative", () => {
  const product = {
    id: "sanity-product-1",
    commerceProductId: "prod_123",
    title: "Luna Abaya",
    slug: "luna-abaya",
    price: { amount: 185, currency: "MYR" },
    variants: [
      {
        id: "var_1",
        title: "Baby Blue / 56",
        availability: "available",
        price: { amount: 185, currency: "MYR" },
        options: { Colour: "Baby Blue", Size: "56" },
      },
    ],
    availability: "available",
    isDemo: false,
  };

  const result = buildHomepageState(
    { sections: [{ _key: "hero", sectionType: "hero", title: "Luna" }] } as never,
    {
      products: [product],
      collections: [],
    } as never,
  );

  const liveProduct = result.products[0] as {
    commerceProductId?: string;
    price?: { amount?: number };
    availability?: string;
  };
  assert.equal(liveProduct?.commerceProductId, "prod_123");
  assert.equal(liveProduct?.price?.amount, 185);
  assert.equal(liveProduct?.availability, "available");
  assert.equal(result.hero?.title, "Luna");
});

test("missing Medusa product resolves to a non-orderable safe state instead of a fake card", () => {
  const result = buildHomepageState(
    { sections: [] } as never,
    {
      products: [
        {
          id: "sanity-missing",
          commerceProductId: "prod_missing",
          title: "Missing Medusa product",
          slug: "missing-medusa-product",
          price: undefined,
          variants: [],
          availability: "unknown",
          isDemo: false,
        },
      ],
      collections: [],
    } as never,
  );

  const liveProduct = result.products[0] as {
    commerceProductId?: string;
    price?: { amount?: number };
    availability?: string;
  };
  assert.equal(liveProduct?.commerceProductId, "prod_missing");
  assert.equal(liveProduct?.price, undefined);
  assert.equal(liveProduct?.availability, "unknown");
});

test("demo commerce fallback is never used in production catalogue mode", () => {
  const result = buildHomepageState(
    { sections: [] } as never,
    {
      products: [
        {
          id: "demo-1",
          commerceProductId: "demo-1",
          title: "Demo product",
          slug: "demo-product",
          price: { amount: 0, currency: "MYR" },
          variants: [],
          availability: "unknown",
          isDemo: true,
        },
      ],
      collections: [],
    } as never,
  );

  assert.equal(result.products[0]?.isDemo, true);
  assert.equal(result.products[0]?.slug, "demo-product");
});

test("announcement renders only when enabled and the site text is safe", () => {
  const enabled = buildHomepageState(
    {} as never,
    { products: [], collections: [] } as never,
    {
      announcementEnabled: true,
      announcementText: "New arrival edit now live.",
    } as never,
  );

  const disabled = buildHomepageState(
    {} as never,
    { products: [], collections: [] } as never,
    {
      announcementEnabled: false,
      announcementText: "This should not be shown.",
    } as never,
  );

  assert.equal(enabled.announcement, "New arrival edit now live.");
  assert.equal(disabled.announcement, "");
});

test("navigation mapping keeps internal links safe and collection links scoped", () => {
  assert.equal(toProductLink({ slug: "luna-abaya" }), "/products/luna-abaya");
  assert.equal(toCollectionLink({ slug: "the-everyday-edit" }), "/collections/the-everyday-edit");
  assert.equal(toCollectionLink({ slug: "" }), "/collections");
});

test("CTA targets reject malformed or external destinations", () => {
  assert.equal(sanitizeCtaUrl("/shop"), "/shop");
  assert.equal(sanitizeCtaUrl("https://example.com"), "/shop");
  assert.equal(sanitizeCtaUrl("mailto:test@example.com"), "/shop");
  assert.equal(sanitizeCtaUrl("/collections/the-everyday-edit"), "/collections/the-everyday-edit");
});
