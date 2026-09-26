import { defineField } from "sanity";

export const seoFields = [
  defineField({
    name: "seoTitle",
    title: "SEO title",
    type: "string",
    description: "Keep it under roughly 60 characters for a clear browser title.",
    validation: (rule) => rule.max(60),
  }),
  defineField({
    name: "seoDescription",
    title: "SEO description",
    type: "text",
    rows: 3,
    description: "Use a concise summary that helps discoverability without stuffing keywords.",
    validation: (rule) => rule.max(160),
  }),
  defineField({
    name: "canonicalUrl",
    title: "Canonical URL",
    type: "url",
    validation: (rule) => rule.uri({ allowRelative: false }),
  }),
];

export const socialProofFields = [
  defineField({
    name: "platform",
    title: "Platform",
    type: "string",
    options: {
      list: [
        { title: "TikTok", value: "tiktok" },
        { title: "Instagram", value: "instagram" },
      ],
    },
    validation: (rule) => rule.required(),
  }),
  defineField({
    name: "contentUrl",
    title: "Content URL",
    type: "url",
    validation: (rule) => rule.required().uri({ allowRelative: false }),
  }),
  defineField({
    name: "metricValue",
    title: "Public metric value",
    type: "number",
    description: "Optional manually entered public metric, such as 45.2K views.",
  }),
  defineField({
    name: "metricLabel",
    title: "Metric label",
    type: "string",
    description: "Example: views, likes, comments, saves.",
  }),
  defineField({
    name: "verified",
    title: "Verified",
    type: "boolean",
    initialValue: false,
  }),
  defineField({
    name: "caption",
    title: "Caption",
    type: "text",
    rows: 2,
  }),
];

export const documentWithSeo = {
  fields: [...seoFields],
};
