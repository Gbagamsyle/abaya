import { defineField, defineType } from "sanity";

export const productMedia = defineType({
  name: "productMedia",
  title: "Product media",
  type: "object",
  fields: [
    defineField({
      name: "image",
      title: "Image",
      type: "image",
      options: { hotspot: true },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "alt",
      title: "Alt text",
      type: "string",
      description: "Describe the product and styling for accessibility.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "videoUrl",
      title: "Video URL",
      type: "url",
      description: "Optional product video or motion reference.",
      validation: (rule) => rule.uri({ allowRelative: false }),
    }),
  ],
  preview: {
    select: { title: "alt", media: "image" },
  },
});
