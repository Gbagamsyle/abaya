import { defineField, defineType } from "sanity";

export const wholesalePage = defineType({
  name: "wholesalePage",
  title: "Wholesale page",
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
      name: "intro",
      title: "Introductory copy",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "ctaLabel",
      title: "CTA label",
      type: "string",
      initialValue: "Apply for wholesale",
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "seo",
    }),
  ],
  preview: { select: { title: "title" } },
});
