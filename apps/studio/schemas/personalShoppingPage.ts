import { defineField, defineType } from "sanity";

export const personalShoppingPage = defineType({
  name: "personalShoppingPage",
  title: "Personal shopping page",
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
      initialValue: "Book a consultation",
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "seo",
    }),
  ],
  preview: { select: { title: "title" } },
});
