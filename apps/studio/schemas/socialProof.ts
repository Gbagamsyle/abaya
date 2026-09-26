import { defineField, defineType } from "sanity";

export const socialProof = defineType({
  name: "socialProof",
  title: "Social proof",
  type: "object",
  fields: [
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
      description: "Optional metric such as 45.2K or 12.4K; no fabricated data is allowed.",
    }),
    defineField({
      name: "metricLabel",
      title: "Metric label",
      type: "string",
      description: "Examples: views, likes, saves, comments.",
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
  ],
  preview: {
    select: { title: "platform", subtitle: "contentUrl" },
  },
});
