# Deployment Foundation

## Environments

Keep development, preview, staging, and production projects/data/credentials separate. Store secrets in deployment-provider secret storage; never commit `.env`. `.env.example` contains placeholders only.

## Services

- Deploy `apps/storefront` to a Node-compatible Next.js host.
- Deploy `apps/studio` using Sanity hosting or approved static hosting.
- Deploy `apps/commerce` with managed PostgreSQL, migrations, backups, and private runtime configuration.

For local development, copy `.env.example` to `.env`, replace placeholders, and run `pnpm db:up` for PostgreSQL via Docker Compose. Medusa uses development-only fallback values when its app environment file is absent so framework builds can run, but the service still needs a reachable database to serve requests. Production configuration requires explicit environment variables and fails closed when required values are missing. Studio needs a real Sanity project ID to connect to a dataset.

## Required commerce settings

Medusa expects `DATABASE_URL`, `JWT_SECRET`, and `COOKIE_SECRET`. Set `STORE_CORS`, `ADMIN_CORS`, and `AUTH_CORS` to exact environment origins. Add `REDIS_URL` for the Redis-backed session and queue runtime; the local project default is `redis://localhost:6379` and the generated docker stack includes Redis. Use strong unique secrets and TLS database connections.

The installed Medusa 2.21.1 supports `projectConfig.workerMode` values `shared`, `server`, and `worker`. The commerce config maps `MEDUSA_WORKER_MODE` into `projectConfig.workerMode` (defaulting to `shared` for local development) and rejects any other value. `server` serves HTTP entrypoints only; `worker` runs background jobs only; `shared` runs both. This setting is consumed explicitly by this repository's config; it is not inferred from the Railway service name.

Both Railway commerce services use the supported `medusa start` command. Set the service start command to `pnpm --filter @fenomena/commerce start:server` with service variable `MEDUSA_WORKER_MODE=server` for `medusa-server`, and `pnpm --filter @fenomena/commerce start:worker` with service variable `MEDUSA_WORKER_MODE=worker` for `medusa-worker`. The scripts bind the server and worker health listeners to ports 9000 and 9100 respectively; only the server service should be exposed to storefront traffic. Worker mode does not load API or admin entrypoints, even though the CLI process keeps its own health listener. Both services must share the same `DATABASE_URL`, `REDIS_URL`, and other commerce secrets. Do not use `medusa start --cluster` alongside these separate services; cluster mode itself forks the configured server and worker processes.

### Redis module configuration (Medusa 2.21.1)

`projectConfig.redisUrl` configures the Redis-backed HTTP session store; it does not, by itself, select Redis implementations for all Medusa infrastructure modules in this self-hosted deployment. The commerce config explicitly selects Redis-backed providers for Event Bus (`@medusajs/medusa/event-bus-redis`), Cache (`@medusajs/medusa/cache-redis`), Workflow Engine (`@medusajs/medusa/workflow-engine-redis`, with the installed runtime's nested `options.redis.redisUrl` shape), and Locking (`@medusajs/medusa/locking` with the Redis locking provider). All use the configured `REDIS_URL`. These are independently configured from the session store.

## Required CMS settings

Set `SANITY_STUDIO_PROJECT_ID` and `SANITY_STUDIO_DATASET`. Keep write tokens server-side and grant minimum access.

## Local infrastructure contract

- Run `pnpm db:up` to start PostgreSQL and Redis for local development/test.
- The commerce build copies the generated Medusa admin bundle into `apps/commerce/public/admin`, the path used by the production server loader.
- Ensure the app has a live `DATABASE_URL` and `REDIS_URL` before starting `medusa develop` or `medusa start`.
- Apply migrations with `pnpm --dir apps/commerce exec medusa db:migrate` or the equivalent project-level workflow before database-backed acceptance.
- For staging deployments, provision a managed Redis instance alongside PostgreSQL and keep the `REDIS_URL` out of source control.

## Release checklist

- Approve and test payment, tax, shipping, email, and analytics/consent integrations.
- Apply reviewed migrations and verify backup/restore procedures.
- Validate CORS, HTTPS, access controls, monitoring, and error reporting.
- Run build, lint, typecheck, tests, accessibility checks, and end-to-end commerce tests.
- Maintain rollback, incident-response, and recovery runbooks.

## Unresolved launch requirements

Hosting vendors/regions, database sizing, payment provider, tax/shipping, email, analytics/consent, domains, retention, and recovery objectives remain undecided. Production deployment requires owner approval and tested operational procedures.
