# ReCart Recovery Console

Merchant console for monitoring checkout abandonment, diagnosing payment failures, and running bounded Razorpay-style recovery actions.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/recart-recovery-console/src/` — React dashboard, recovery feed, detail audit trail, and guardrail settings.
- `artifacts/api-server/src/routes/recovery.ts` — synthetic recovery API and in-memory demo state.
- `lib/api-spec/openapi.yaml` — source-of-truth contract for summary, attempts, audit, activity, config, and simulation endpoints.
- `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` — generated frontend hooks and server schemas.

## Architecture decisions

- The first demo uses deterministic in-memory data so the full recovery loop is immediately visible without Razorpay credentials or live payment traffic.
- Retry and configuration mutations are served by the API and invalidate the corresponding React Query caches.
- The recovery policy is intentionally bounded: max attempts, cooldown, recovery window, and discount cap are explicit merchant controls.

## Product

- Dashboard summary of recovered revenue, amount at risk, recovery rate, and attempt volume.
- Searchable recovery attempts feed with status, failure diagnosis, channel, and retry progress.
- Per-attempt audit trail showing detect → diagnose → act → outcome.
- Guardrails screen for changing bounded automation policy.
- Synthetic attempt simulation for demos and judge-facing before/after storytelling.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Re-run API codegen after editing `lib/api-spec/openapi.yaml`.
- This workspace's generated Zod client currently emits `zod.int()` for OpenAPI `integer`; use `number` in the contract until the Zod generator version is upgraded.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
