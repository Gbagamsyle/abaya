import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  fields: [
    defineField({
      name: "brandName",
      title: "Brand name",
      type: "string",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "contactEmail",
      title: "Contact email",
      type: "string",
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: "whatsappNumber",
      title: "WhatsApp number",
      type: "string",
      description: "Use the canonical storefront destination, not a personal number.",
    }),
    defineField({
      name: "instagramUrl",
      title: "Instagram URL",
      type: "url",
      validation: (rule) => rule.uri({ allowRelative: false }),
    }),
    defineField({
      name: "tiktokUrl",
      title: "TikTok URL",
      type: "url",
      validation: (rule) => rule.uri({ allowRelative: false }),
    }),
    defineField({
      name: "telegramUrl",
      title: "Telegram URL",
      type: "url",
      validation: (rule) => rule.uri({ allowRelative: false }),
    }),
    defineField({
      name: "defaultCurrency",
      title: "Default currency",
      type: "string",
      initialValue: "MYR",
      options: {
        list: [
          { title: "MYR", value: "MYR" },
          { title: "USD", value: "USD" },
          { title: "SGD", value: "SGD" },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "announcementText",
      title: "Announcement text",
      type: "string",
    }),
    defineField({
      name: "announcementEnabled",
      title: "Announcement enabled",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "footerContent",
      title: "Footer content",
      type: "array",
      of: [{ type: "block" }],
    }),
    defineField({
      name: "legalLinks",
      title: "Legal links",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "label", type: "string", validation: (rule) => rule.required() }),
            defineField({
              name: "url",
              type: "url",
              validation: (rule) => rule.required().uri({ allowRelative: false }),
            }),
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: "brandName",
      media: "logo",
    },
  },
});
