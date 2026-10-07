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

This keeps the homepage manageable for business owners while still giving editors enough flexibility. In the M8 implementation, the homepage is authored as a published Sanity document and rendered onto the root route as a live editorial storefront. Product cards are still composed through the editorial `commerceProductId` join to Medusa and therefore reflect Medusa-owned price and inventory values.

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

## Editor workflow and preview status

The M8 homepage uses a published-content workflow that is already compatible with the live `production` dataset. Editors can draft a homepage document in Sanity Studio and then publish it for the storefront to consume. The current environment does not include a configured draft-preview route, Sanity preview endpoint, or Visual Editing/click-to-edit setup. That is not a blocker for M8 acceptance because the milestone is defined by the live homepage render and the actual Sanity-to-Medusa composition chain rather than by draft-only authoring tools.

## Environment notes

Studio and CLI configuration both resolve `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET`, with storefront fallbacks `SANITY_PROJECT_ID` / `SANITY_DATASET`; set them to the same project and existing dataset before integration testing. Do not commit credentials or write tokens.

### Stable editorial-to-commerce identity migration

Sanity product documents use the required `commerceIntegrationKey` field, for example `fenomena:luna-abaya`. The corresponding Medusa product uses this same value in `external_id`; generated Medusa product IDs are environment-local and must not be copied into Sanity. Medusa remains authoritative for product IDs, variants, SKU, prices, and inventory.

The existing published Luna document previously stored a generated Medusa ID in `commerceProductId`. After deploying the updated Studio schema and seeding the target Medusa environment, migrate the published document once. Set a private shell variable `SANITY_API_WRITE_TOKEN` to a least-privilege Sanity token (never add it to Vercel, `NEXT_PUBLIC_*`, or a committed env file), then run `pnpm --filter @fenomena/studio migrate:commerce-integration-key` from the repository root with the target Sanity project and dataset selected. The migration preflights that exactly one `luna-abaya` product exists, sets `commerceIntegrationKey` to `fenomena:luna-abaya`, removes the obsolete `commerceProductId`, and does not print the token. It is safe to rerun.

Verify in Studio that the published Luna document shows `fenomena:luna-abaya` in Commerce linkage. Repeat seed/migration with the appropriate matching dataset and Medusa environment when establishing separate environments; use the same integration key in all of them. Do not publish a staging Medusa product ID as editorial identity.
