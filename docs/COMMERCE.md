# Commerce Domain and Workflows

Medusa is the source of truth for transactional commerce. Sanity must never be used as the inventory, cart, payment, or order database.

## Product and SKU relationship

A Medusa product is the sellable merchandising entity; each Medusa variant corresponds to a purchasable SKU with option values, currency/price records, and inventory policy. Editorial copy and media can be joined through an explicit stable Medusa product/variant reference held in Sanity. Do not match by title or mutable slug.

## Variants and inventory

Represent size and colour as explicit option dimensions. Track sellable quantities/stock locations and reservation behavior in Medusa. The storefront must only offer options valid for the selected product and current availability response. Never infer inventory from CMS content or social posts.

## Cart and checkout

A cart is server-owned and identified through the scoped, httpOnly `fenomena_cart_id` cookie. `/api/cart` is the storefront boundary for cart creation, retrieval, and line-item creation; `/api/cart/:lineItemId` handles quantity changes and removal. The browser receives a transformed view of Medusa's response, including authoritative unit prices, line totals, subtotal, and total. Guest checkout is intentionally disabled in M4. If a cart id is missing, expired, or rejected by Medusa, the storefront clears the cookie and presents an empty or recoverable error state. Demo catalogue products remain explicitly unavailable and never create a real Medusa cart.

The M5 development environment is verified live: PostgreSQL 17 through Docker, Medusa setup/migrations, Malaysia/MYR region, storefront sales channel, development stock location, publishable key, Luna seed, Store API, unavailable-inventory rejection, and real cart acceptance. M5.1 reverified the Medusa API, live product composition, and cart route. RM185 is the configured development price, not a confirmed Fenomena retail price; all seeded inventory quantities are for development testing only.

The development bootstrap is `pnpm --filter @fenomena/commerce exec medusa db:setup`, followed by `pnpm --filter @fenomena/commerce seed:development`. The seed creates or reuses a Malaysia region, Fenomena sales channel, development stock location, default shipping profile, MYR Luna Abaya variant matrix, inventory levels, and a publishable key linked to the sales channel. Live verification confirms exactly 15 unique variants: Baby Blue, Rich Brown, and Silver Grey × sizes 52, 54, 56, 58, and 60. Baby Blue / 54 is the single deliberately zero-stock variant and is rejected by the server/cart route. This is development inventory, not actual Fenomena stock. During legacy option migration the script can print a safe migration/addition message and exit successfully; rerun it to continue with the next idempotent setup phase. It prints the region ID and publishable token for local use; tokens must remain untracked.

Review the seed against a disposable development database before running it. Variant-matrix repair currently deletes the product's existing variants when its check fails, and must never target production or a database with real orders. The script must not mutate unrelated price sets; prices belong to the specific development Luna product only.

Medusa 2.21.1 returns MYR prices and cart totals as integer minor units: `18500` represents RM185. The storefront converts this once at the Medusa adapter boundary to `185` for display and never recomputes cart totals in the UI. M5.1 browser acceptance rendered RM185 on the PDP, drawer, and `/cart`; a zero-stock add request was rejected and did not alter the existing cart. Checkout remains disabled and out of scope.

## Payment abstraction

Use a provider-neutral payment orchestration boundary: create/authorize/capture/refund operations behind the commerce provider contract and use Medusa payment-provider modules/adapters. A provider selection (including Malaysia/Singapore payment methods) is an unresolved business decision. Stripe may be integrated as one adapter, not as an architectural assumption. Verify provider webhooks and make event handling idempotent.

## Order lifecycle

Model and expose explicit pending/placed, payment, fulfillment, cancellation, and refund states from Medusa. The exact state transitions and operator permissions must be agreed with operations. Send customer messages only on authoritative state transitions; handle retries and idempotency.

## Customer model

Keep PII in the commerce service, apply data-minimization and retention rules, and avoid placing sensitive customer details in Sanity or analytics. Define consent, account recovery, deletion/export, and guest-to-account linking policies before enabling accounts.

## Promotions

Promotions and transactional eligibility live in Medusa. Validate code, dates, markets, product constraints, usage limits, and final price on the server. CMS may explain a campaign but cannot grant a discount.

## Fulfillment

Medusa owns fulfillment status and fulfillment data. Shipping carriers, rates, markets, delivery promises, returns, and service areas are unselected. Do not display shipping or return claims until reviewed, configured, and represented in authoritative policy content.

## Tests and invariants

Test variant selection validity, money/currency formatting, totals recalculation, discount eligibility, stock races, webhook idempotency, cancellation/refund transitions, and access control. Store money in integer minor units or a rigorously defined decimal representation; never use binary floating point for authoritative arithmetic.
