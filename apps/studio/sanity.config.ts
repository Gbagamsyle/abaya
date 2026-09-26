import { defineConfig } from "sanity";
import { type StructureBuilder, structureTool } from "sanity/structure";
import { schemaTypes } from "./schemas";

export default defineConfig({
  name: "fenomena-studio",
  title: "Fenomena Studio",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "replace-me",
  dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  plugins: [structureTool()],
  schema: { types: schemaTypes },
  structure: (S: StructureBuilder) =>
    S.list()
      .title("Content")
      .items([
        S.listItem()
          .title("Products")
          .schemaType("product")
          .child(S.documentTypeList("product").title("Products")),
        S.listItem()
          .title("Collections")
          .schemaType("collection")
          .child(S.documentTypeList("collection").title("Collections")),
        S.listItem()
          .title("Homepage")
          .schemaType("homepage")
          .child(S.documentTypeList("homepage").title("Homepage")),
        S.listItem()
          .title("Personal Shopping")
          .schemaType("personalShoppingPage")
          .child(S.documentTypeList("personalShoppingPage").title("Personal Shopping")),
        S.listItem()
          .title("Wholesale")
          .schemaType("wholesalePage")
          .child(S.documentTypeList("wholesalePage").title("Wholesale")),
        S.listItem().title("FAQs").schemaType("faq").child(S.documentTypeList("faq").title("FAQs")),
        S.listItem()
          .title("Site Settings")
          .schemaType("siteSettings")
          .child(S.documentTypeList("siteSettings").title("Site Settings")),
        S.listItem()
          .title("Navigation")
          .schemaType("navigation")
          .child(S.documentTypeList("navigation").title("Navigation")),
        S.listItem()
          .title("Announcements")
          .schemaType("announcement")
          .child(S.documentTypeList("announcement").title("Announcements")),
        S.listItem()
          .title("Content Pages")
          .schemaType("contentPage")
          .child(S.documentTypeList("contentPage").title("Content Pages")),
      ]),
});
