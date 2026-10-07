# Backup and isolated restoration gate

The daily workflow is a **database archive upload**, not a complete Supabase project backup. No remote backup, credentials, restore or production action was performed during this phase.

## Coverage and missing evidence

| Component | Current coverage | Required operational evidence |
| --- | --- | --- |
| PostgreSQL data, schema and functions | Custom `pg_dump` archive, uploaded with S3 AES256 encryption | Successful recent object, compatible client/server versions, downloaded archive checksum and isolated restore |
| Database roles | Not included by `pg_dump` | Inventory required roles/grants; provision through the target platform, never copy unrestricted role credentials |
| Storage | Database metadata may be present; object bytes are absent | Export every required bucket/object and verify object counts, sizes and checksums after restore |
| Auth | Database tables may be present; platform settings and external providers are absent | Restore supported auth data/settings securely and verify administrator login on the isolated project |
| Edge Functions and hosting | Source exists in Git; deployed secrets/configuration absent | Record immutable code revision, environment variable names, function configuration, allowed origin and routes; provision secrets separately |
| Backups and monitoring | Workflow definition only | Bucket versioning/retention/access, actual upload freshness alert, restoration owner and scheduled drill |

## Complete operational sequence

1. Inventory the source read-only: PostgreSQL version, migration ledger, RLS/grants, publication membership, order/item counts, Storage manifest and platform configuration. Keep customer data and secrets outside Git and logs.
2. Capture a consistent database archive plus Storage export and configuration inventory. Record capture times and code revision. Store encrypted off-site copies and a SHA256 manifest; confirm upload success and verify checksums again after download. A local checksum alone does not prove off-site integrity or provenance.
3. Create a separate isolated project with compatible PostgreSQL version, supported Supabase roles/extensions and no production credentials or outbound customer notifications. Keep online payments disabled. Restore the database, Storage bytes and required configuration there; never restore over production as a test.
4. Compare order/item counts and snapshot checksums **before applying migrations**. Check auth, catalog, Storage images, RLS/grants and Realtime configuration. Record omissions explicitly.
5. Compare the restored migration ledger to Git. Apply only approved pending additive migrations to that restored clone. Never replay the historical migration directory wholesale, reset production or repair its ledger blindly. Preserve the pre-migration restored clone or archive for comparison.
6. Compare historical order/item snapshots again, allowing only documented additive fields/backfills. Run SQL permission/workflow, promotion, financial-attention and public-setting regressions; then TypeScript, application/Edge tests and browser acceptance with isolated fixtures. Verify admin login, acknowledgement/conflicts, tracking privacy, bot checks and connection recovery.
7. Measure elapsed time from requesting the off-site backup to a functioning application, including configuration and object recovery. Record backup age (RPO target <=24 hours), actual RTO, failed steps and operator. The small local drill timing is not a production RTO.

## Storage and configuration export manifest

The database job must be paired with a separate, access-controlled export run. It must write an encrypted off-site manifest containing bucket name, object path, byte count, content metadata and SHA256 of every downloaded object, then verify those hashes after restoring to an isolated project. Metadata alone is not a Storage backup. Do not print object paths if they can identify customers.

For the same capture, record a secret-free configuration manifest: project ref, database version, applied migration ledger, bucket/policy names, Realtime publication membership, deployed Edge function revision, Auth providers and redirect URLs, cron/job names, allowed origins, and the **names** (not values) of required Edge/hosting secrets. Record the source revision for functions and frontend. A designated operator must keep secret values only in the approved secret manager and provision fresh values into the isolated restore project.

The current repository contains the database archive workflow and these runbooks, but no evidence of an off-site Storage export, configuration inventory, bucket versioning, backup retention, or a successful remote restore. Those are deployment gates, not implied by the documentation.

## Local fixture drill

`TEST_DATABASE_URL=postgresql://localhost:5432/ohana_test... node scripts/restore-drill.mjs` accepts only local `ohana_test*`/`ohana_ci*` databases. It creates one UUID-identified historical-payment sentinel, dumps and inspects the archive, restores a temporary database, compares order/item snapshots, reruns all SQL regressions, checks the archive SHA256 and removes only its own sentinel and temporary database. It does **not** exercise downloaded S3 objects, Storage, platform auth, real Realtime, secrets, production scale or a live pre-migration schema. Use `test-database.mjs` separately for baseline-plus-additive installation evidence.

## Rollback implications

Rollback should select an application/Edge revision compatible with the additive schema. Keep new data and unknown historical payment states; do not reopen the legacy guest writer. A full database restore loses changes made after capture and therefore requires a separate incident decision and reconciliation of subsequent orders/payments. If cutover fails, pause new intake while preserving tracking and staff access; reverting the frontend alone to the legacy checkout is unsafe after write permissions are revoked.
