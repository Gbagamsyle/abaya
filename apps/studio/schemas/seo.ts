import { defineField, defineType } from "sanity";

export const seo = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  fields: [
    defineField({
      name: "title",
      title: "SEO title",
      type: "string",
      description: "Concise browser title, usually under 60 characters.",
      validation: (rule) => rule.max(60),
    }),
    defineField({
      name: "description",
      title: "SEO description",
      type: "text",
      rows: 3,
      description: "Summaries should stay readable and informative without keyword stuffing.",
      validation: (rule) => rule.max(160),
    }),
    defineField({
      name: "canonicalUrl",
      title: "Canonical URL",
      type: "url",
      validation: (rule) => rule.uri({ allowRelative: false }),
    }),
  ],
});
