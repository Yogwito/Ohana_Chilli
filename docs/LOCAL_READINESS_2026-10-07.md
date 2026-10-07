# Local readiness and external-access package (2026-10-07)

Scope: everything verifiable without production Supabase, a remote staging project, GitHub credentials or Wompi. Wompi stays disabled (`VITE_ONLINE_PAYMENTS_ENABLED=false`). Nothing was deployed or changed remotely.

## Evidence (fresh clone of `feature/production-readiness`, `npm ci`, no local caches)

| Check | Result |
|---|---|
| ESLint / `tsc -p tsconfig.app.json` | ✅ clean |
| Vitest | ✅ 124 tests, 26 files |
| `vite build` | ✅ |
| SQL baseline + migrations 120000–127000 + regressions (incl. `operational-retention.sql`) | ✅ |
| Migration scenarios A / B / C | ✅ |
| Order concurrency / idempotency | ✅ |
| Restore drill (PostgreSQL 18 client vs 18 server) | ✅ local fixture only, not a production RTO |
| Deno 2.9.7: `deno check` + `deno test` order-api | ✅ 12 passed |
| Playwright purchase scenarios (mobile reload recovery, tablet changed quote) | ✅ network intercepted |
| Whole sequence via `scripts/ci-local.sh` | ✅ |
| GitHub Actions run | ⚪ not executable (no remote access); workflow commands replicated locally |

Local note: a `pg_dump` older than the server fails the restore drill. Use `PG_BIN=/path/to/matching/bin scripts/ci-local.sh`. CI uses Postgres 16 for both.

## Findings
- **H10 PARTIAL**: `accept_legacy` has migration + regression (`supabase/tests/legacy-order-transition.sql`). Run `supabase/tests/h10-legacy-orders-readonly.sql` (SELECT only, counts) against production to close it.
- **H11 SOLUCIONADO LOCALMENTE / PENDIENTE DE VALIDACIÓN STAGING** (direct-insert block, allowlist, rate limit, retention `prune_operational_retention()` service_role only).
- **H16 PARTIAL**: all CI commands pass locally; no remote CI run.

## Retention scheduling
`prune_operational_retention()` is not scheduled anywhere. Schedule it with the service role (see `supabase/operations/`); browser roles have no delete path.

## External dependencies

| Dependency | Why | Access needed | R/W | Next test |
|---|---|---|---|---|
| GitHub | Push branch, run Actions | Contents: write on this repo; Actions: read; Pull requests: write (if PR) | W | Push branch, read `order-ci` logs |
| Supabase production | Drift/RLS/ledger audit, H10 count, Storage inventory | Read-only Postgres role (SELECT + catalog) via `live-audit.sql` and `h10-legacy-orders-readonly.sql`; read-only Storage listing | R | Run both scripts, compare ledger to migrations |
| Supabase staging | Apply migrations, Edge, Realtime, Storage, Auth | Project owner/admin on a NEW empty project (db password, `supabase link`, secrets set, functions deploy) | W | Follow `docs/STAGING_ENVIRONMENT.md`, then smoke tests |
| Storage | Object backup | Service-role key for the backup operator only, `export-storage-backup.mjs` | R | Export + verify manifest |
| Edge | Deploy `order-api` | Part of staging project access | W | Spoofed-header, bot, rate-limit tests |
| Realtime | Order alerts | Staging project config | W | Two-client alert test |
| Wompi | Payments | FASE POSTERIOR — NO NECESARIO TODAVÍA | — | — |

Never share production write access for the next phase; a read-only role is enough for audit, and writes should go to staging only.

## Blockers that need external access
GitHub credentials; production read-only audit (drift, H10 count, Storage inventory); a remote staging project; remote CI run; integral backup against real data.

## Verdict
- Reproduced from Git: YES (locally; remote push not done).
- Local work ready for staging: YES.
- Next block is external access, not local development: YES.
- Wompi: NO.
