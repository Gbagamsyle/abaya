import { defineConfig } from "sanity";
import { schemaTypes } from "./schemas";

export default defineConfig({
  name: "fenomena-studio",
  title: "Fenomena Studio",
  projectId: process.env.SANITY_STUDIO_PROJECT_ID ?? "replace-me",
  dataset: process.env.SANITY_STUDIO_DATASET ?? "production",
  plugins: [],
  schema: { types: schemaTypes },
});
