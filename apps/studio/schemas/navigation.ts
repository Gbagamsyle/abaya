import { defineArrayMember, defineField, defineType } from "sanity";

export const navigation = defineType({
  name: "navigation",
  title: "Navigation",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "items",
      title: "Items",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({
              name: "title",
              title: "Title",
              type: "string",
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "url",
              title: "URL",
              type: "url",
              validation: (rule) => rule.required().uri({ allowRelative: false }),
            }),
            defineField({
              name: "section",
              title: "Section",
              type: "string",
              description: "Optional grouping used to organize navigation in the storefront.",
            }),
          ],
        }),
      ],
    }),
  ],
  preview: {
    select: { title: "name" },
  },
});
