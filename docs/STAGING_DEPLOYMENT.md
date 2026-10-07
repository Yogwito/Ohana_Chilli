# Staging and deployment gate

This runbook is a plan, not evidence that an environment has been configured. It must be executed by an operator with separate staging and production Supabase projects. Do not point preview deployments, local development, or automated browser fixtures at production.

## Preconditions

1. Record the production project ref, database major version, active migration versions, RLS/grants/functions snapshot, `public` schema CREATE/USAGE privileges, Realtime publication membership, Storage buckets/object count, Edge function deployment revision and environment-secret inventory. Use `supabase/tests/live-audit.sql` through an administrative **read-only** connection; save schema metadata only, never customer rows or secrets. Any `anon` or `authenticated` CREATE privilege on `public` is a blocker until deliberately revoked and re-audited.
2. Compare that snapshot to `supabase/baseline/catalog.sql` plus migrations. Resolve every drift item in an additive migration or a documented exception. Do not run historical migrations on a populated project: historical files include destructive catalog/order rebuilds and are not a production rollout mechanism.
   Record the live counts for invalid historical order amounts, states and item quantities from the audit output. The additive `NOT VALID` constraints protect new writes; they do not clean or validate pre-existing anomalies.
3. Complete the backup and isolated restore gate in `BACKUP_RESTORE.md`. A database dump alone is insufficient because Storage object bytes and project/function configuration are outside it.
4. Create an independent staging Supabase project. Use its own URL, publishable key, Auth users, Storage bucket, Edge secrets, Turnstile test credentials, monitoring endpoint, scheduler secret and backup destination. Payments remain disabled.

## Staging build order

1. Load a sanitized catalog and synthetic users/orders into staging. Do not clone customer data unless an approved retention and masking procedure is used.
2. Apply only the additive migrations from `20261006120000_authoritative_orders.sql` through `20261006127000_operational_retention.sql`, in timestamp order. Capture `supabase_migrations.schema_migrations` before and after.
3. Regenerate `src/integrations/supabase/types.ts` from the migrated staging schema and compare it to the committed generated file. A mismatch is a release blocker.
4. Deploy `order-api` with production payments disabled. Configure `APP_ORIGIN` to the staging application origin, a trusted ingress-only rate header, a random rate-limit secret, staging Turnstile secret, reconciliation secret, and monitoring. Verify the function’s secret inventory without printing values.
5. Apply the reconciliation schedule only after the Edge function and secrets are verified. Confirm one scheduled invocation manually and inspect its status without logging body data.
6. Configure Storage bucket `product-images`, its public/read policy as intended, and staging asset uploads. Verify object listing and sample download with an administrator; compare object count and checksums to the backup manifest if restoring an environment.
7. Deploy the staging frontend with only staging public variables. Keep `VITE_ONLINE_PAYMENTS_ENABLED=false` and backend `ONLINE_PAYMENTS_ENABLED=false`.

## Required staging acceptance

- Run all repository checks, SQL permission/workflow tests and browser fixture tests against isolated resources.
- Run a synthetic cash order through staged Edge functions: quote, create, tracking, acknowledgement, acceptance, preparation, ready and completion. Verify snapshots, history and admin actor. Exercise the analytics Edge route with allowed metadata and prove direct anonymous writes and RPC invocation remain denied.
- Confirm anonymous/direct order inserts, legacy RPC execution, payment/refund reads, tracking-token guessing and non-admin actions are denied.
- Run the Realtime proof: verify `orders` is in `supabase_realtime`; an authenticated admin receives a synthetic order INSERT/UPDATE event; anon/non-admin receive no order payload; then disconnect/reconnect and confirm the dashboard poll reconciles state.
- Test Storage upload/read/delete permissions with a non-admin and an admin. Do not use customer assets.
- Verify monitoring receives code-only failures and reconciliation scheduling reports status. Verify backups and an isolated restore.
- Run `prune_operational_retention()` with the staging service role, then prove anonymous and ordinary authenticated roles cannot invoke it. Schedule that same service-role-only operation daily through the approved scheduler only after its identity and logs have been reviewed; do not grant browser roles access to it.

## Future production release order

1. Freeze schema-changing admin work and record a live read-only drift snapshot.
2. Complete and verify the full backup, including database, Storage bytes and configuration manifest.
3. Restore that backup in isolation and pass integrity checks.
4. Put the compatible Edge function version in place with online payments still disabled; validate secrets and CORS at production origin without creating orders.
5. Apply reviewed additive migrations in the exact timestamp order. Stop at the first unexpected migration version, object mismatch or lock/constraint anomaly.
6. Regenerate/compare types and execute read-only post-migration audits. Run synthetic smoke tests only if the business has approved a non-customer test order path; otherwise use the staged fixture route.
7. Deploy the compatible frontend, leave online payments disabled, and monitor order creation, RLS denials, Edge failures, Realtime and scheduler health.
8. Re-open normal ordering only after owners approve smoke evidence. Wompi remains outside this runbook.

## Rollback reality

| Change | Practical rollback | Limitation |
|---|---|---|
| Additive columns/indexes/functions | Deploy the prior compatible application and disable intake if needed | Do not drop columns/functions while data or an old Edge revision may use them. |
| RLS/grant cutover | Restore the prior policy/grant snapshot deliberately | Reopening historical public writers is not an acceptable rollback. |
| New order/payment records | Preserve them; disable intake or use compensating events | They must never be deleted to “roll back.” |
| Edge function | Redeploy previous compatible function revision | Existing created orders remain on the migrated schema. |
| Catalog/image changes | Restore catalog rows and Storage bytes from a versioned backup | SQL restores do not recreate Storage object content. |
| Irreversible data migration | Restore the entire verified backup to an isolated recovery project first | A production restore has business downtime/data-loss implications and needs an incident decision. |

No production action is authorized by this document.
