# Release process

No step is automated end to end. Nothing merges or deploys without a named human approving it.

1. **Feature**: work on a branch (`feature/*`), never directly on `main`. Migrations are additive and follow `docs/ORDER_BACKEND_ROLLOUT.md`.
2. **CI**: workflow `Order safeguards` must be green on the PR head: `app` (lint, vitest, tsc, build, deno), `browser` (Playwright purchase/recovery), `database` (SQL regression, migrations, concurrency, restore drill), `security` (secret scan; `npm audit` is report-only until existing high findings are fixed). Run `scripts/ci-local.sh` before pushing when possible. Failed browser runs upload `browser-diagnostics` artifacts.
3. **Review**: at least one reviewer other than the author; the reviewer checks migrations, Edge function changes and any new secrets/env. No auto-merge, no merge on red or on a superseded run.
4. **Staging**: deploy the branch to the isolated staging project (`docs/STAGING_DEPLOYMENT.md`, `docs/STAGING_ENVIRONMENT.md`). Apply migrations to staging first and review drift. Never point staging config at production.
5. **Acceptance**: run the checklist on staging on real devices: order pickup and delivery, WhatsApp handoff, closed-hours rejection, price-change review, reload recovery, admin status updates, tracking link. Record results and the commit SHA.
6. **Release candidate**: tag `rc-YYYYMMDD.N` on the accepted SHA only. Take a fresh backup (`docs/BACKUP_RESTORE.md`) and confirm the restore drill passed.
7. **Production**: merge the accepted SHA to `main` by a human, apply migrations (before the matching frontend/Edge code), deploy Edge function, then frontend. Smoke-test one order. Rollback: redeploy the previous tag; restore from backup only for data corruption.

Post-release: watch admin orders and financial-attention incidents for the first day; record the release in `docs/`.
