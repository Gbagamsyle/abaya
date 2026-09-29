# CMS and Content Model

Sanity Studio lives in `apps/studio` and is the editorial system for product storytelling, homepage structure, service content, and site configuration. Medusa remains the transactional catalog and order system.

## M2 schema structure

The Studio now includes the required document types:

- product
- collection
- category
- homepage
- personalShoppingPage
- wholesalePage
- contentPage
- faq
- siteSettings
- navigation
- announcement
- seo
- socialProof
- productMedia

The schema set is organized around the business ownership boundary: Sanity owns presentation, merchandising language, and SEO; Medusa owns price, inventory, and order states.

## Product document contract

The product document is designed to support:

- title
- slug
- commerceProductId
- short description
- full description
- images
- optional video
- collection references
- material/fabric information
- care information
- included items
- styling/details
- featured flag
- new arrival editorial flag
- editorial labels
- social proof metadata
- SEO

The required `commerceProductId` field makes the Sanity-to-Medusa linkage explicit and reviewable in Studio.

## Homepage model

Homepage content uses a controlled set of section types instead of an unrestricted page builder:

- hero
- new arrivals
- featured collection
- collection grid
- social/trending products
- editorial story
- personal shopping CTA
- wholesale CTA
- testimonials placeholder structure
- social content
- newsletter

This keeps the homepage manageable for business owners while still giving editors enough flexibility.

## Collections and categories

Collections are editorial grouping documents with hero media, description, editorial copy, features, and SEO. The product membership relationship is intentionally reference-based and documented in the schema, while actual transactional inventory remains in Medusa.

A `category` document exists only where editorial grouping is justified. It is not a second source of truth for commerce identities.

## Site settings and global content

`siteSettings` centralizes:

- brand name
- logo
- contact information
- WhatsApp destination
- Instagram, TikTok, Telegram URLs
- default currency display configuration
- announcement configuration
- footer content
- legal links

This guarantees that storefront components read one source of truth.

## Studio UX and validation

The Studio structure groups content into a non-technical navigation tree:

- Products
- Collections
- Homepage
- Personal Shopping
- Wholesale
- FAQs
- Site Settings

Validation includes required titles, slugs, URL checks, and the required `commerceProductId` on sellable products. It also uses straightforward field descriptions to guide editors without exposing architecture details.

## Query layer and typings

The project includes Studio query helpers in `apps/studio/lib/queries.ts` and a separate server-side storefront adapter in `apps/storefront/lib/sanity-adapter.ts`. Storefront GROQ queries use `defineQuery`, and `apps/studio/sanity-typegen.json` generates schema/query types in `apps/storefront/lib/sanity.types.ts`; the adapter uses those generated query result types and normalizes nullable editorial fields into its domain model. The last TypeGen run generated 26 schema types and 3 GROQ query types.

## Demo content and constraints

Demo content is intentionally marked as reference-only. The Luna Abaya example, if used, is treated as fictional demo reference material and not as production inventory, pricing, or review data.

## Environment notes

Studio and CLI configuration both resolve `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET`, with storefront fallbacks `SANITY_PROJECT_ID` / `SANITY_DATASET`; set them to the same project and existing dataset before integration testing. Do not commit credentials or write tokens.

### M5.1 live-data verification status

Studio, CLI, TypeGen, and storefront are configured for the existing `production` dataset; no `development` dataset was created. A published `product` document at slug `luna-abaya` is linked to Medusa product `prod_01M3FVF8CJPWV339XVEQJCQYZ9`. It contains only known product identity/editorial text and the commerce reference: no price, SKU, inventory, variant, or media fields. No approved/public Luna media was available in the workspace, so `images` is optional in the schema and the storefront's existing missing-image state is used. Live TypeGen and storefront reads pass; the composed product is non-demo and its transactional price/options/availability come from Medusa.
