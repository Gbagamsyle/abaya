import { defineArrayMember, defineField, defineType } from "sanity";

export const homepageSection = defineType({
  name: "homepageSection",
  title: "Homepage section",
  type: "object",
  fields: [
    defineField({
      name: "_type",
      title: "Section type",
      type: "string",
      options: {
        list: [
          { title: "Hero", value: "hero" },
          { title: "New arrivals", value: "newArrivals" },
          { title: "Featured collection", value: "featuredCollection" },
          { title: "Collection grid", value: "collectionGrid" },
          { title: "Social / trending products", value: "socialTrending" },
          { title: "Editorial story", value: "editorialStory" },
          { title: "Personal shopping CTA", value: "personalShoppingCta" },
          { title: "Wholesale CTA", value: "wholesaleCta" },
          { title: "Testimonials", value: "testimonials" },
          { title: "Social content", value: "socialContent" },
          { title: "Newsletter", value: "newsletter" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "collection",
      title: "Collection reference",
      type: "reference",
      to: [{ type: "collection" }],
    }),
    defineField({
      name: "productReferences",
      title: "Product references",
      type: "array",
      of: [defineArrayMember({ type: "reference", to: [{ type: "product" }] })],
    }),
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "ctaLabel",
      title: "CTA label",
      type: "string",
    }),
    defineField({
      name: "ctaUrl",
      title: "CTA URL",
      type: "url",
      validation: (rule) => rule.uri({ allowRelative: false }),
    }),
  ],
});

export const homepage = defineType({
  name: "homepage",
  title: "Homepage",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      of: [{ type: "homepageSection" }],
      validation: (rule) => rule.min(1),
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "seo",
    }),
  ],
  preview: {
    select: { title: "title" },
  },
});

export default homepageSection;
