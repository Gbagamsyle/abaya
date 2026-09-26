import { defineField } from "sanity";

export const seoFields = [
  defineField({
    name: "seoTitle",
    title: "SEO title",
    type: "string",
    description: "Keep page titles clear and concise for search results.",
  }),
  defineField({
    name: "seoDescription",
    title: "SEO description",
    type: "text",
    rows: 3,
    description: "Summaries should stay readable and informative without stuffing keywords.",
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
  }),
  defineField({
    name: "contentUrl",
    title: "Content URL",
    type: "url",
    validation: (rule) => rule.uri({ allowRelative: false }),
  }),
  defineField({
    name: "metricValue",
    title: "Public metric value",
    type: "number",
  }),
  defineField({
    name: "metricLabel",
    title: "Metric label",
    type: "string",
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
