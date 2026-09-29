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

The project includes Studio query helpers in `apps/studio/lib/queries.ts` and a separate server-side storefront adapter in `apps/storefront/lib/sanity-adapter.ts`. The storefront currently uses raw GROQ strings and hand-maintained adapter result types; Sanity TypeGen is configured in `apps/studio/sanity-typegen.json` and generates schema types in `apps/studio/sanity.types.ts`, but it currently reports zero typed GROQ queries. Do not treat successful schema extraction as verification that the storefront query results are typed or match live content.

## Demo content and constraints

Demo content is intentionally marked as reference-only. The Luna Abaya example, if used, is treated as fictional demo reference material and not as production inventory, pricing, or review data.

## Environment notes

Studio and CLI configuration both resolve `SANITY_STUDIO_PROJECT_ID` / `SANITY_STUDIO_DATASET`, with storefront fallbacks `SANITY_PROJECT_ID` / `SANITY_DATASET`; set them to the same project and existing dataset before integration testing. Do not commit credentials or write tokens.

### M5.1 live-data verification status

The configured Sanity project responds to the project ping, and local schema extraction plus TypeGen completed against the local schema (26 schema types, zero GROQ query types). During the current M5.1 review, the storefront's configured `development` dataset returned 404 because it does not exist; the only dataset listed for the authenticated CLI project was `production`, where a read-only query found no published product at slug `luna-abaya`. No Sanity write-token variable was present in the inspected local environment files. Consequently, the Luna editorial document has not been created or linked, and the storefront-to-Medusa live join remains unverified. Match the environment to the intended dataset and create/publish the editorial record through authenticated Studio access before accepting the integration.
