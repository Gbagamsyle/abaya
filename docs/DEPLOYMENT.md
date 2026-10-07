# Staging Readiness and Deployment Contract

This document defines the repository-side contract only. No Railway/Vercel project, hosted database/cache, domain, or hosted Stripe webhook is created by this checkpoint. M8 is complete; staging deployment follows approval of provider accounts, secrets, and operational ownership. M9 remains not started.

## Architecture and ownership

- `apps/storefront` is the Next.js editorial and shopping experience.
- `apps/studio` is the Sanity authoring application. Sanity owns published editorial/homepage/catalogue presentation content, not transaction prices or inventory.
- `apps/commerce` is Medusa 2.21.1. PostgreSQL is its durable commerce database; Redis provides shared infrastructure for the modules listed below.
- The server-side storefront adapters compose published Sanity content with Medusa product, price, and availability data. Do not copy transaction price or stock into Sanity.
- Keep local, preview, staging, and production projects, data, origins, and credentials separate. Never commit `.env` files or actual credentials.

## Medusa 2.21.1 server and worker model

The installed package source and declarations were inspected, not inferred from Railway service names:

- `projectConfig.workerMode` is the Medusa configuration property. The installed config loader accepts exactly `shared`, `server`, and `worker`. If `projectConfig.workerMode` is absent, it consults `MEDUSA_WORKER_MODE` and then defaults to `shared`.
- The repository explicitly maps `MEDUSA_WORKER_MODE` to `projectConfig.workerMode` in `apps/commerce/medusa-config.ts`. Its mode launcher sets the variable before starting Medusa. This is deliberate and does not depend on Medusa's fallback behavior.
- In the installed loader, `worker` skips HTTP API/admin entrypoints and loads background processors; `server` loads HTTP entrypoints and does not load background jobs; `shared` loads both. The `medusa start --cluster` implementation separately assigns modes to forked children and must not be combined with the two-service configuration below.

Each Railway service uses the monorepo root as its source root (leave Railway's Root Directory at repository root). The start launcher honors Railway's `PORT`; local defaults are server `9000` and worker `9100`.

### Railway Medusa server

- Root directory: repository root (`/`; no app subdirectory root)
- Build command: `pnpm --filter @fenomena/commerce build`
- Pre-deploy/migration command: `pnpm --dir apps/commerce exec medusa db:migrate`
- Start command: `pnpm --filter @fenomena/commerce start:server`
- Effective worker mode: `server` (the start command enforces it)
- HTTP health check path: `/health`; expose this service to the storefront only after its origin and CORS are configured.

### Railway Medusa worker

- Root directory: repository root (`/`; no app subdirectory root)
- Build command: `pnpm --filter @fenomena/commerce build`
- Start command: `pnpm --filter @fenomena/commerce start:worker`
- Effective worker mode: `worker` (the start command enforces it)
- Keep it private; it is not a second Store API. Medusa's CLI binds a health listener, but the worker-mode loader does not register Store/Admin API entrypoints.
- Both services use identical `DATABASE_URL`, `REDIS_URL`, `REDIS_PREFIX`, `JWT_SECRET`, `COOKIE_SECRET`, and applicable Stripe settings. Run migrations once in the server service's pre-deploy step; do not race migrations from both processes.

### Railway staging seed

Only run on an isolated staging QA database before customer traffic, never against production data:

`pnpm --filter @fenomena/commerce seed:development`

Set the Railway seed-job environment variable `ALLOW_DEVELOPMENT_SEED=true` for this invocation only. The command itself was run twice locally; the production guard was separately verified to reject execution without the opt-in. The seed explicitly warns that quantities/prices are fictional QA fixtures. Review its idempotency and the resulting baseline before exposing a QA storefront. It is not a product/inventory import for real Fenomena commerce.

## Redis subsystem matrix (Medusa 2.21.1)

`REDIS_URL` or `projectConfig.redisUrl` alone proves a connection setting, not that every subsystem selects a Redis implementation. This repository configures official Medusa providers explicitly:

| Medusa subsystem | Provider configured | Redis option shape | Local runtime evidence |
|---|---|---|---|
| HTTP session store | Framework session store via `projectConfig.redisUrl` | `projectConfig.redisUrl` | Configured; independent of module provider selection |
| Event Bus | `@medusajs/medusa/event-bus-redis` | `{ redisUrl }` | Connected during migration and both runtime startups |
| Cache | `@medusajs/medusa/cache-redis` | `{ redisUrl }` | Connected during migration and both runtime startups |
| Workflow Engine | `@medusajs/medusa/workflow-engine-redis` | `{ redis: { redisUrl } }` | Redis and PubSub connected during migration and both runtime startups |
| Locking | `@medusajs/medusa/locking` with `@medusajs/medusa/locking-redis` as default provider | provider `options: { redisUrl }` | Connected during migration and both runtime startups |

All use the same local/staging `REDIS_URL`. `REDIS_PREFIX` is set in project config for the project-level/session path; provider-specific queue/lock namespaces retain their own Medusa defaults unless configured separately. Do not describe a Redis URL alone as proof; the module names, installed option shapes, live connection logs, and local Redis service together establish Redis-backed infrastructure. No community Redis providers are installed.

## Local PostgreSQL and Redis

Docker Compose provides PostgreSQL 17 and Redis 7, each with a health check. Start and inspect them with:

```sh
docker compose up -d postgres redis
docker compose ps
```

The accepted local run reported both services `healthy`. `pnpm db:up` starts the same pair. Copy the placeholder-only root `.env.example` to `.env` and set `POSTGRES_PASSWORD` and `DATABASE_URL` consistently. If an ignored `apps/commerce/.env` also exists, keep its `DATABASE_URL` aligned; local Medusa configuration now loads the root `.env` as the canonical development contract while preserving the launcher's worker mode. Never put secrets in versioned files.

Run migrations without resetting data:

```sh
pnpm --dir apps/commerce exec medusa db:migrate
```

The acceptance migration completed and reported modules current. Do not use database reset/drop commands as a staging-readiness shortcut.

The production commerce build runs `medusa build`, then copies the generated dashboard to `apps/commerce/public/admin`, where the production server loader expects `index.html`. That generated directory is ignored and is rebuilt with the service.

## Seed contract and baseline

The seed creates/reuses one Malaysia region, one `Fenomena Storefront` sales channel, and one local development stock location (its address is marked `Development only`). It creates/reuses the `luna-abaya` QA product and the matrix:

- Colours: Baby Blue, Rich Brown, Silver Grey
- Sizes: 52, 54, 56, 58, 60
- 15 unique variants total
- Baby Blue / 54 is intentionally zero-stock for unavailable-state testing

The seed was run twice locally. Both runs returned the same region, channel, location, product, fulfillment, and shipping IDs. Read-only PostgreSQL checks after the second run confirmed counts: Malaysia region 1; storefront channel 1; development location 1; Luna product 1; Luna variants 15; option values match the matrix; Baby Blue / 54 stocked quantity 0. The sample RM185 price, shipping amount, and quantities are fictional QA fixtures—not approved Fenomena prices, rates, or inventory. Never represent these quantities as real stock.

## Vercel storefront contract

Create one Vercel project for the shared monorepo and use:

- Root Directory: `apps/storefront`
- Framework Preset: `Next.js`
- Install Command: `pnpm install --frozen-lockfile` (pnpm 10 is pinned at the repository root; retain the root workspace lockfile/workspace context)
- Build Command: `pnpm --filter @fenomena/storefront build`
- Node requirement: `>=22.0.0` from the repository engine; select Node.js 22.x for the first deployment to match local acceptance.

Enable the Vercel monorepo option to include source files outside the Root Directory because the storefront imports `packages/ui` and `packages/utils`. The storefront production build command above passed locally. Set its `SITE_URL` to the actual Vercel-provided origin after project creation; do not hardcode a guessed hostname. Runtime Medusa and Sanity values come from environment configuration, not `localhost` defaults.

## Environment-variable matrix

All values in `.env.example` are placeholders. The actual required hosted values are stored in Railway/Vercel/Sanity secret or project settings, not committed.

| App / purpose | Variable names | Hosted configuration |
|---|---|---|
| Commerce database | `DATABASE_URL` | Managed PostgreSQL URL shared by server and worker |
| Commerce Redis | `REDIS_URL`, `REDIS_PREFIX` | Managed Redis URL and an environment-specific prefix |
| Commerce auth/session | `JWT_SECRET`, `COOKIE_SECRET` | Separate, unique strong secrets; same values on server and worker |
| Commerce CORS | `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS` | Exact HTTPS storefront/Studio/admin origins; comma-separated where multiple origins are supported |
| Commerce mode | `MEDUSA_WORKER_MODE` | Local default `shared`; Railway start wrappers enforce `server` or `worker` respectively |
| Commerce Stripe, if enabled | `STRIPE_API_KEY`, `STRIPE_WEBHOOK_SECRET` | Test-mode key only for staging; endpoint-specific signing secret in private storage |
| Storefront origin | `SITE_URL`, `NEXT_PUBLIC_SITE_URL` | Actual environment origin; `SITE_URL` is used server-side, public variable is public by design |
| Storefront Medusa | `MEDUSA_BACKEND_URL`, `MEDUSA_PUBLISHABLE_KEY`, `MEDUSA_REGION_ID` | Actual server API origin, publishable key, and configured region ID |
| Storefront Sanity reads | `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_API_VERSION` | Approved Sanity project/dataset and API version; storefront reads published editorial content |
| Storefront Stripe UI | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe test publishable key only for staging |
| Sanity Studio | `SANITY_STUDIO_PROJECT_ID`, `SANITY_STUDIO_DATASET` | Approved project/dataset. Do not place a Sanity write token in client-visible variables |

Local host defaults in examples (for example `localhost:3000` and `localhost:9000`) are local-only. Source code reads hosted origins from the variables above. `MEDUSA_PUBLISHABLE_KEY` is a public API key, not a secret; database, Redis credentials, JWT/cookie secrets, Stripe secret keys, and webhook signing secrets are secrets.

## CORS and Stripe test-mode strategy

- Set `STORE_CORS` to the storefront's exact staging origin; `ADMIN_CORS` to the approved admin origin; and `AUTH_CORS` to only the storefront/admin origins that perform authentication. Do not use wildcard origins with credentials.
- The Medusa config rejects non-`sk_test_` Stripe API keys and requires a `whsec_` webhook signing secret when Stripe is configured. Keep `capture: false` as currently implemented; do not infer live-payment readiness from test-mode acceptance.
- Local Stripe CLI acceptance forwards to `http://localhost:9000/hooks/payment/stripe_stripe`; the active listener's `whsec_` value belongs only in local `.env`. For hosted staging, after infrastructure exists, configure a Stripe **test-mode** endpoint for the actual Medusa server origin and store that endpoint's own signing secret in Railway. Do not reuse the local CLI secret or create that hosted endpoint in this repository checkpoint.
- Keep Sanity content published and editorial-only. Use the approved Sanity Studio project/dataset; do not author prices, SKU, availability, or transactional variants into CMS documents.

## Health, deploy order, rollback, and recovery

- Medusa `GET /health` returns `200 OK` after startup. It is a liveness check, not a deep dependency readiness probe. Startup must also complete PostgreSQL initialization and the explicit Redis provider connections; monitor logs and add provider-level monitoring/alerts for staging.
- The server mode exposes the Medusa API; the worker mode does not register those API/admin entrypoints. Keep the worker private even though its CLI process has a health listener.
- Recommended order: approve accounts/region/billing; create isolated PostgreSQL and Redis; provision secrets; build services; run the migration once; start server and worker; verify server and worker health/logs; run `pnpm --filter @fenomena/commerce seed:development` on the target Railway Medusa service to assign/verify the stable Luna `external_id`; run the documented Sanity integration-key migration against the matching dataset; configure Stripe test settings; deploy Vercel with the real Medusa/Sanity origins; test storefront, checkout preparation, and Stripe test events.
- Before migrations, take a database backup and verify restoration instructions. Application rollback does not reverse schema changes. Prefer a forward migration fix; restore a pre-migration snapshot only under the recovery runbook after assessing writes and data loss.
- Keep deployment images and database backups according to an approved retention policy. Define monitoring, access control, incident response, RPO/RTO, and recovery owners before production use.

### Railway Free/Trial limitations (checked 2026-10-03)

Railway's current trial documentation describes a one-time $5 credit with a 30-day period, a five-service project limit, and 1 GB total trial memory. Limited trials can restrict outbound networking and available ports; full network access requires verification or plan upgrade. Trial volume data is deleted 30 days after credits expire. These are not production guarantees or a fit assessment: the two Medusa processes plus PostgreSQL and Redis must be measured against the account's current limits and billing before staging. Verify current terms in [Railway Free Trial](https://docs.railway.com/pricing/free-trial) and [Railway plans](https://docs.railway.com/reference/pricing/plans) at provisioning time.

## Pre-deployment gate

Before creating hosted resources, retain the test evidence for healthy local PostgreSQL/Redis, explicit simultaneous server/worker modes, successful migration, idempotent baseline seed, all repository tests/builds, clean secret scan, committed deployment contract, and empty worktree. This checkpoint does not create Railway/Vercel resources, hosted domains, or hosted webhooks.
