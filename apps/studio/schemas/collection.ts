import { defineArrayMember, defineField, defineType } from "sanity";

export const collection = defineType({
  name: "collection",
  title: "Collection",
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
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "heroMedia",
      title: "Hero media",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "editorialContent",
      title: "Editorial content",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "featured",
      title: "Featured collection",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "productReferences",
      title: "Referenced products",
      description:
        "Collection membership is managed here as a single editorial association; the Medusa source of truth remains in the commerce layer.",
      type: "array",
      of: [
        defineArrayMember({
          type: "reference",
          to: [{ type: "product" }],
        }),
      ],
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "seo",
    }),
  ],
  preview: {
    select: { title: "title", media: "heroMedia" },
  },
});
