# Fenomena Commerce workspace guidance

- This repository is a pnpm workspace. Run package commands from the repository root and use workspace filters where possible.
- Keep the storefront, CMS content, and transactional commerce responsibilities separated as described in `docs/ARCHITECTURE.md`.
- Use TypeScript for new application and shared-package code; follow defaults in `packages/config/typescript.json`.
- Keep shared packages business-neutral; follow domain ownership and provider abstraction contracts documented in `docs/`.
- Never commit credentials or real environment files. Update `.env.example` when adding required variables, and keep examples placeholder-only.
- Do not publish unverified prices, sizes, colors, social metrics, policies, inventory, or business contact details.
- Update relevant documentation in `docs/` when changing scope, architecture, design conventions, CMS schemas, or deployment requirements.
- Validate changes with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and the relevant workspace build.
