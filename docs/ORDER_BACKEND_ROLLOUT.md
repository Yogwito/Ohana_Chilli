# Order backend rollout and recovery

## Current implementation and evidence

Update 2026-10-07: the internal correction phase is documented in [CORRECTIONS_2026-10-07.md](CORRECTIONS_2026-10-07.md). It adds authoritative promotion ordering, fair failed-payment polling, durable cancelled/paid financial incidents, recovery after uncertain checkout reloads, narrowed analytics ingestion and explicit handling for pending historical orders. Apply the additive migrations from `20261006120000` through `20261006126000` through the same isolated staging/drift-review process before releasing matching frontend/Edge code. Local validation now passes 124 app tests, TypeScript, global lint, build, fresh SQL installation, concurrency, restore and mocked mobile/tablet purchase checks. Edge integration evidence remains the prior network-free suite; the local Deno runtime is unavailable for this final pass, while CI installs and runs Deno. Earlier dated evidence below is historical; no production gate has been bypassed.

The repository now contains additive order/payment migrations, an Edge API, server-priced checkout, admin queues and alerts, private tracking, sandbox hosted payments and full-refund requests. Production data has not been changed. Online payment initiation defaults to disabled in both frontend and backend. The provider API base is deliberately fixed to sandbox; setting production keys cannot enable production payments.

Locally verified on 2026-10-06:

- Fresh PostgreSQL 16 baseline plus both additive migrations and permission/workflow tests.
- Anonymous reads/writes and alternate RPC paths denied; non-admin RLS denial; admin reads.
- Catalog pricing despite forged prices; bowl requirements, extras, atomic rollback, idempotency and status conflicts.
- Pending, approved, rejected, duplicate, delayed, amount/currency/environment mismatch payment cases; full-refund locking, failures and duplicate prevention.
- Real parallel transactions: one order from two submissions; one successful staff update and one version conflict.
- A local fixture backup restored in **0.055–0.217 seconds** across local drills, with matching row counts, preserved unknown historical payment state, and permission tests rerun. This is **not a production RTO measurement**.
- 87 application tests and 5 network-free Edge integration tests passed. TypeScript, production build and Deno check passed. Focused lint passed; full lint still reports one pre-existing `any` in the locally edited `src/test/bowl-builder.test.tsx`.
- Browser fixture walkthrough at tablet/mobile widths, including a 409 status update displaying an error while the original status remains pending. Mobile checkout fixture also paused at a changed canonical quote, updated the accepted total, and generated the WhatsApp handoff from the persisted receipt. Saved tracking links replace the legacy phone-based public history lookup. Screenshots: `output/playwright/orders-tablet-conflict.png`, `orders-mobile-detail.png`, `order-tracking-mobile.png`, `order-quote-review-mobile.png`, `order-created-mobile.png`.

Not verified: live policies/schema/Realtime, staging credentials, actual Turnstile ingress behavior, actual Wompi transactions/refunds/lookup contracts, physical multi-tab audio, production backup restore, off-site destination, monitoring delivery. These remain release blockers, not assumptions.

## Preserve existing installations

Do **not** reset production or replay historical migrations. The history includes a table drop, duplicate delivery-zone creation, catalog foreign-key inconsistencies, and a UUID product-default reference against a text product key. Repository history is not a verified description of the live schema.

1. Connect Supabase or use an authorized read-only database connection. Run `supabase/tests/live-audit.sql`. Securely retain the schema output, table counts, function definitions, grants, migration ledger, and publication membership. Explicitly establish whether any public order-read policy exists. Do not export customer rows into the repository.
2. Compare live identifiers/types to `supabase/baseline/catalog.sql`, especially product/default-ingredient keys, ingredient IDs, prices, category ordering, promotions and recipe metadata. Resolve drift in additional additive migrations; do not alter generated types to hide it.
3. Take a full database backup plus Supabase Storage object export and required project/auth configuration. Keep encrypted, versioned off-site copies. Test restoration in a separate project. Compare order/item counts and snapshots and rerun permission tests. Measure full operational recovery, including auth, Storage and functions. Production RPO target: at most 24 hours; record measured RTO and backup timestamp.
4. Use only the additive `20261006...` migrations from `120000` through `126000` for the existing production schema after audit and restoration approval. They preserve all historical orders and snapshots. Historical payments remain `legacy/unknown`; they do not produce misleading paid indicators or new-order alerts. Pending historical orders can only be accepted through the audited `accept_legacy` transition and a staff note; they are never bulk-promoted. `NOT VALID` constraints enforce new writes without rejecting historical rows; audit old violations before separate validation.

## Fresh installations and CI

`supabase/baseline/catalog.sql` is a canonical **repository-derived schema-only baseline**, not a live dump. It excludes old destructive migrations and business seed data. Provision Supabase-managed auth/extensions first. Load the baseline, then migrations starting at `20261006120000`. Import the verified catalog separately. Reconcile the migration ledger explicitly with the operator; never run `supabase db reset` or blanket migration repair against production.

For plain local PostgreSQL, create an empty database named `ohana_test...` and run:

```sh
TEST_DATABASE_URL=postgresql://localhost:5432/ohana_test node scripts/test-database.mjs
TEST_DATABASE_URL=postgresql://localhost:5432/ohana_test node scripts/test-order-concurrency.mjs
TEST_DATABASE_URL=postgresql://localhost:5432/ohana_test node scripts/restore-drill.mjs
DATABASE_URL=postgresql://localhost:5432/ohana_test node scripts/generate-db-types.mjs
```

The first script creates local stand-ins for Supabase-managed auth/roles; never deploy `local-bootstrap.sql`. CI runs baseline/migrations, permission tests, concurrency and restore checks, application tests, TypeScript, build and Deno checking. Generated types are from the verified local schema; regenerate from staging after the live drift review. They are not proof of production schema parity.

## Staging and cutover sequence

1. Provision an isolated staging Supabase project. Preview builds must use staging URL/key exclusively; never production. Disable production env inheritance for previews at the hosting provider. Do not publish the new checkout until backend cutover is ready.
2. Configure Turnstile for the precise origin and action `order`. Set `VITE_TURNSTILE_SITE_KEY` in the frontend, `TURNSTILE_SECRET_KEY`, `APP_ORIGIN`, a random `RATE_LIMIT_SECRET`, and an explicit `RATE_LIMIT_TRUSTED_HEADER` in Edge secrets. The ingress must overwrite that header; the function fails closed when it is absent. Test spoofed headers, bot failures, expired tokens and rate limits from independent clients.
3. Deploy `order-api` with `verify_jwt=false`: it authenticates staff routes explicitly, verifies webhooks itself and rate-limits guest routes. The service-role key remains solely in Edge secrets. Exact CORS origin checks are additional browser restrictions, not authentication. Creation is inaccessible by guest RPC or direct writes after migration.
4. Apply additive migrations to staging and verify public catalog reads and administrator catalog management. Test product removals/default extras against actual metadata. Verify catalog ingredient names and IDs match builder pricing and fixed tariffs, including premium extras and upsells. No submitted price or display name is trusted.
5. Test quote review, price changes between quote/create, repeat clicks, uncertain network results, refresh, and changed-content idempotency rejection. Checkout retains a pending key/token in session storage; a recovery action checks whether the order exists. An uncertain missing result retains the original key because creation may still be in flight; retry with the original data. Only definite pre-commit validation failures clear the pending identity. On success, save tracking links locally and include them in WhatsApp. Links expire after 30 days. Treat links as bearer credentials; redact `/pedido/*` from hosting/analytics logs and use no-referrer/noindex.
6. Verify the admin listener is authorized through RLS and `orders` belongs to `supabase_realtime`. Acknowledge and accept separately; verify all transitions, actor records and conflicts. Register agreed replacements as history without modifying paid items or amounts. Financial changes need a separate resolution/refund.
7. Test alert activation, test sound, mute, repeated sound, same-device tab coordination, cross-tab acknowledgement, navigation to other admin tabs, network loss/recovery and refresh on the actual staff tablet/computer. Browser sound needs activation and an awake browser. Polling runs every 15 seconds as a Realtime backup. No online alert until verified payment.
8. Run the production backup/restore gate. Coordinate Edge deployment, migrations and frontend release in a maintenance window: migrations revoke legacy guest writes, so the old frontend cannot order after cutover. Deploy backend safeguards/dashboard first with online payments disabled, then the matching checkout. Smoke-test immediately. Roll back application logic only to an Edge-compatible build; never reopen the insecure legacy public writer. Preserve orders if disabling intake temporarily.

## Wompi sandbox acceptance gates

Use the official contracts for [hosted checkout](https://docs.wompi.co/docs/colombia/widget-checkout-web/), [events](https://docs.wompi.co/docs/colombia/eventos/) and [sandbox full refunds](https://docs.wompi.co/docs/colombia/reembolsos-sandbox/).

Configure Edge secrets from `supabase/functions/.env.example`. Frontend `VITE_ONLINE_PAYMENTS_ENABLED` and backend `ONLINE_PAYMENTS_ENABLED` are independent flags. Disabling initiation does not disable cash/transfer, incoming webhook processing, reconciliation or tracking. Cash and manual-transfer payment confirmation is a distinct audited admin action requiring a note; legacy orders never infer payment.

Before setting `ONLINE_PAYMENTS_ENABLED=true`:

- Supply sandbox public/private/integrity/event secrets. Configure the webhook at `/functions/v1/order-api/webhook`.
- Verify merchant hosted-checkout settings expose **only** methods with approved refund support, then set `WOMPI_HOSTED_METHODS_VERIFIED=true`. A URL parameter is not a reliable method restriction; restrictions must be enforced in merchant settings. Default refund allowlist is `CARD`.
- Verify sandbox's reference lookup `GET /v1/transactions?reference=...` returns the exact transaction array and includes no unrelated reference, then set `WOMPI_REFERENCE_LOOKUP_VERIFIED=true`. Current public guides explicitly document ID lookup, but do not establish this reference-list contract. If unavailable for the merchant, implement the confirmed provider lookup/event recovery contract before enabling online payment. Unknown attempts remain unresolved, blocking a second charge; expiry alone never authorizes retry.
- Verify refund lookup `GET /v1/refunds/{id}` and the returned `id` versus `v2_refund_id`, then set `WOMPI_REFUND_LOOKUP_VERIFIED=true` to enable pending-refund reconciliation. This lookup is not established by the public sandbox refund guide. A missing/ambiguous refund response stays processing and alerts staff; it is never automatically reposted. A verified declined/error/cancelled result shows failed, with the order still paid. No automatic retry of failed full refunds in V1.
- Set `WOMPI_REFUNDS_ENABLED=true` after approval/decline/error sandbox scenarios pass. Confirm the administrator, order, full amount and reason before submitting.
- Complete approved/rejected/pending/forged/repeated-webhook tests, browser-close delivery, reference/amount/currency/environment mismatch handling, network ambiguity and duplicate refunds against the actual provider. Browser redirect parameters never mark payment paid.

Amounts throughout the app/database remain integer **COP**, even in columns named `*_cents`; Wompi requests multiply by 100 at the boundary. Payment attempts, operational status, refund status and original item snapshots remain independent.

Production payments require a deliberate code/config release after merchant approval, enabled-method refund confirmation, verified credentials and end-to-end acceptance. The current backend cannot switch to production just by setting a flag.

## Scheduling, monitoring and off-site backups

Provision Vault secrets `order_api_url` and `order_reconciliation_secret`, then apply `supabase/operations/schedule-reconciliation.sql` to staging. It schedules one authenticated reconciliation call per minute through `pg_cron`/`pg_net`. Check cron and HTTP response failures and invocation overlap/backlog under load. No tokens are stored in cron SQL. The reference and refund lookup gates above must pass first. Failed/unknown refunds need operator review; the job alerts instead of assuming completion.

Set an HTTPS `MONITORING_URL`/`MONITORING_TOKEN` for a structured error receiver. Events contain only service and error code, with no customer details, request bodies, private links or credentials. Configure receiver alerts for order creation failures, provider mismatches, unresolved payments (>10 minutes), unresolved refunds and pending acknowledgement (>2 minutes). Validate delivery and alert ownership, including failed cron invocations. Do not enable generic body logging or request replay on checkout/tracking endpoints.

The daily GitHub workflow runs at 09:00 UTC and uploads a custom-format database dump to S3 with AES256 encryption. Configure the `production-backup` environment secrets `BACKUP_DATABASE_URL`, `BACKUP_S3_BUCKET`, `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY`, `BACKUP_AWS_REGION`. Use least-privilege upload credentials, versioning/object retention and restricted restore access. A missing secret or failed upload fails visibly. Set external monitoring for **no successful backup within 24 hours**; GitHub schedules alone do not guarantee RPO. Storage objects and platform configuration need their own backup jobs. Credentials have not been provisioned by this implementation.

Monthly restore drill: download the latest encrypted off-site archive securely; restore to an isolated project using matching PostgreSQL major version and required Supabase-managed roles/extensions; restore Storage/config/functions; verify order/item counts and sample historical snapshots, RLS, quotes, payments disabled, admin auth and tracking; record backup age and measured time to a functioning service. Delete drill customer data under the business retention policy. Never restore over production as a test.
