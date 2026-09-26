import { defineField, defineType } from "sanity";

export const announcement = defineType({
  name: "announcement",
  title: "Announcement content",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "content",
      title: "Content",
      type: "text",
      rows: 3,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "active",
      title: "Active",
      type: "boolean",
      initialValue: true,
    }),
    defineField({
      name: "linkUrl",
      title: "Link URL",
      type: "url",
      validation: (rule) => rule.uri({ allowRelative: false }),
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "content" },
  },
});
