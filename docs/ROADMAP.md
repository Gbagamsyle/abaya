# Delivery Roadmap

Each milestone requires product acceptance criteria, tests, documentation updates, and a review of operational/security impact. Scope is intentionally phased; dates and commercial commitments are not yet defined.

- **M0 — Repository and architecture:** complete.
- **M1 — Design system:** implementation and component tests complete; confirm brand assets and usage rights before production use.
- **M2 — Sanity CMS architecture:** schema set, Studio navigation, validation, and query foundations complete. Editorial records are authored and published separately from transactional data.
- **M3 — Catalogue/product experience: APPROVED.** Sanity/Medusa composition, catalogue routes, URL-backed filters/search/sort, product/variant experience, WhatsApp intent flow, SEO/JSON-LD, loading/error/empty states, and production/demo separation were reviewed and validated.
- **M4 — Medusa cart core: APPROVED.** Medusa 2.21.1 adapter, server cart routes, scoped `httpOnly` cart-ID cookie, add/update/remove, drawer and `/cart`, authoritative Medusa totals, refresh persistence, tests, and validation were reviewed and accepted. Checkout, payment, and authentication remain out of scope.
- **M5 — Live Medusa environment: APPROVED (development).** PostgreSQL 17/Docker setup, database setup/migrations, Malaysia/MYR region, storefront sales channel, development stock location, publishable key, Luna seed, live Store API, unavailable-inventory rejection, and real-cart acceptance were reported verified. Medusa MYR minor-unit conversion was fixed at the adapter boundary; browser acceptance reported RM185 and RM370 for quantity two. Development inventory is not a representation of actual business stock.
- **M5.1 — Sanity → Medusa integration closure: APPROVED.** Studio, storefront, CLI, and TypeGen target the existing `production` dataset. Published `luna-abaya` editorial content links to Medusa product `prod_01M3FVF8CJPWV339XVEQJCQYZ9` and contains no price, SKU, inventory, variant, or media data. Live `composeProduct()` verified the Sanity-to-Medusa join: 15 variants, MYR 185 starting price from Medusa, and no media; `/shop` and `/products/luna-abaya` render live data and the existing missing-image state. PDP add-to-bag created a real Medusa cart at RM185, cart refresh persistence passed, and a server-side attempt to add the zero-stock development variant was rejected without changing the cart. TypeGen generated 26 schema types and 3 GROQ query result types, now consumed by the storefront adapter. Production mode with demo requested fails closed. Full format/lint/typecheck/test/build validation passed. No checkout, payment, account, or M6 work was started.
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
- The development Luna matrix is 3 colours (Baby Blue, Rich Brown, Silver Grey) × 5 sizes (52, 54, 56, 58, 60), 15 unique variants. Baby Blue / 54 is deliberately zero-stock for unavailable-state testing; this is development inventory and is not actual Fenomena stock.

## M5.1 integration closure evidence

- All local ignored environment files and `.env.example` use `production`; no development dataset is required or created.
- The Sanity product document contains only the established product name, slug, and Medusa product reference, plus the schema-required name-based editorial descriptions. No approved local Luna photography/media was found, so `images` is omitted and the storefront's missing-image state is used.
- Sanity TypeGen generated 3 GROQ query types and the storefront consumes those generated types. Live results verified one published editorial record and no commerce-owned fields.
- Live acceptance covered `/shop` → `/products/luna-abaya` → variant selection → Add to Bag → Medusa cart → refresh. Checkout, payment, authentication, and M6 remain explicitly out of scope.
