# Delivery Roadmap

Each milestone requires product acceptance criteria, tests, documentation updates, and a review of operational/security impact. Scope is intentionally phased; dates and commercial commitments are not yet defined.

- **M0 — Repository and architecture:** complete.
- **M1 — Design system:** implementation and component tests complete; confirm brand assets and usage rights before production use.
- **M2 — Sanity CMS architecture:** schema set, Studio navigation, validation, and query foundations complete. Editorial records are authored and published separately from transactional data.
- **M3 — Catalogue/product experience: APPROVED.** Sanity/Medusa composition, catalogue routes, URL-backed filters/search/sort, product/variant experience, WhatsApp intent flow, SEO/JSON-LD, loading/error/empty states, and production/demo separation were reviewed and validated.
- **M4 — Medusa cart core: APPROVED.** Medusa 2.21.1 adapter, server cart routes, scoped `httpOnly` cart-ID cookie, add/update/remove, drawer and `/cart`, authoritative Medusa totals, refresh persistence, tests, and validation were reviewed and accepted. Checkout, payment, and authentication remain out of scope.
- **M5 — Live Medusa environment: APPROVED (development).** PostgreSQL 17/Docker setup, database setup/migrations, Malaysia/MYR region, storefront sales channel, development stock location, publishable key, Luna seed, live Store API, unavailable-inventory rejection, and real-cart acceptance were reported verified. Medusa MYR minor-unit conversion was fixed at the adapter boundary; browser acceptance reported RM185 and RM370 for quantity two. Development inventory is not a representation of actual business stock.
- **M5.1 — Sanity → Medusa integration closure: IN PROGRESS / BLOCKED ON DATA AND RUNTIME.** Align the configured storefront dataset with an existing Sanity dataset, create and publish the Luna editorial document linked to Medusa product `prod_01M3FVF8CJPWV339XVEQJCQYZ9`, then verify live composition, catalogue/PDP/cart flow, refresh persistence, production no-demo-fallback behavior, and full validation. The current review confirmed local schema extraction/type generation, but generated 0 GROQ query types; the storefront's configured `development` dataset returns 404, the available `production` dataset has no published `luna-abaya` record, and Medusa/storefront services were not reachable during this review. No write token was found in the inspected local environment files, so no CMS document was created. See the M5.1 gate below.
- **M6 — Checkout preparation:** cart hardening, shipping/tax requirements, checkout data model, and operational review before payment work.
- **M7 — Checkout/payment abstraction:** shipping/tax requirements, selected replaceable provider adapter, signed webhook/idempotency, and guest checkout.
- **M8 — Customer accounts:** identity, consent, profile, addresses, order history, and account privacy policy.
- **M9 — Inventory/order workflows:** stock reservation, order lifecycle, notifications, cancellation/refund, fulfillment operations.
- **M10 — WhatsApp commerce:** configured phone destination, safe prefilled product/variant/price/canonical URL message, and analytics event.
- **M11 — Personal shopping and wholesale:** validated forms, spam controls, consent, secure delivery/storage, and operator workflow.
- **M12 — Social commerce:** manually verified social URLs/metrics, content moderation, optional feed/API integration after platform review.
- **M13 — SEO and analytics:** metadata, canonical URLs, structured data, sitemap/robots, consent-aware measurement.
- **M14 — Accessibility, performance, security:** WCAG audit, Core Web Vitals, load/security testing, privacy and threat-model review.
- **M15 — Production deployment:** approved providers/policies, data migration, runbooks, backup/restore, monitoring, rollback, and launch approval.

## M3–M5 completion architecture and acceptance

- Published Sanity product content joins Medusa store products through `commerceProductId` in server-side adapters and `composeProduct()`. UI/routes consume `StorefrontProduct` only.
- Demo editorial and commerce fixtures are opt-in with `CATALOGUE_MODE=demo` outside production and compose into the same model. Production has no fixture fallback.
- Variant choices resolve against actual option combinations; unavailable and unknown variants are not orderable.
- `/shop` filters/sort use query parameters. `/search?q=` searches normalized titles, collections, descriptions, materials, included items, and options; search is noindex.
- Product/collection routes use composed content and data-safe states. Structured data is emitted only for non-demo composed prices with configured canonical origin, and never invents ratings, shipping, or stock.
- `/` remains a neutral temporary placeholder and does not redirect to `/shop`.
- The development Luna matrix is 3 colours (Baby Blue, Rich Brown, Silver Grey) × 5 sizes (52, 54, 56, 58, 60), 15 variants total. Baby Blue / 54 is deliberately zero-stock for unavailable-state testing; this is not actual business inventory.

## M5.1 integration closure gate

1. Ensure Studio, TypeGen, and storefront target the same real Sanity project and an existing dataset. Do not put tokens in source control or report their values.
2. Run schema extraction and TypeGen; use or otherwise verify generated types for the actual storefront GROQ queries (a successful local schema extraction alone does not prove live query compatibility).
3. Create/publish the Luna editorial product at slug `luna-abaya`, with the real Medusa ID above, required editorial fields and media. Sanity owns editorial data only; Medusa owns price, SKU, variants, and inventory.
4. Verify `composeProduct()`, `/shop`, `/products/luna-abaya`, live variant/price rendering, PDP → Add to Bag → real Medusa cart, and refresh persistence.
5. Verify live/production configuration fails closed without a silent demo fallback. Run formatting, lint, typecheck, tests, and builds; record evidence before approving M5.1.
6. Stop at M5.1. Checkout, payments, authentication, and M6 are not authorized by this integration closure.
