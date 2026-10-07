# Staging bootstrap and configuration matrix

This file prepares a separate Supabase staging project. It never authorizes a production change. Do not copy production service-role keys, payment credentials, customer rows or Auth users into staging.

## Bootstrap order

1. Create a separate project and a separate frontend deployment origin.
2. Load the canonical baseline plus only additive migrations `20261006120000` through `20261006127000`; seed a sanitized catalog and synthetic staff/customer data.
3. Configure the Storage buckets and policies recorded in the configuration inventory. Upload only staging assets.
4. Create the minimum staging admin account and assign `user_roles.role = 'admin'` by an approved administrative procedure.
5. Deploy `order-api`, set only staging secrets, deploy the frontend, and keep both online-payment flags `false`.
6. Enable and prove Realtime for `public.orders`, then run the smoke checklist in `STAGING_DEPLOYMENT.md`.

## Configuration matrix

| Variable / setting | Local | Staging | Production | Secret | Consumer | Required | Validation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `VITE_SUPABASE_URL` | Local/test project URL | Staging URL | Production URL | No | Frontend | Yes | HTTPS project origin matches deployment |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Local publishable key | Staging publishable key | Production publishable key | No | Frontend | Yes | Browser catalog request works; never use service role |
| `VITE_SUPABASE_PROJECT_ID` | Local ref | Staging ref | Production ref | No | Frontend/tooling | Yes | Matches URL project ref |
| `VITE_TURNSTILE_SITE_KEY` | Test key | Test key restricted to staging origin | Production site key | No | Frontend | Checkout blocks clearly when absent |
| `VITE_ONLINE_PAYMENTS_ENABLED` | `false` | `false` | `false` until later phase | No | Frontend | Yes | Checkout exposes no online payment path |
| `APP_ORIGIN` | Vite local origin | Exact staging frontend origin | Exact production frontend origin | No | Edge | Yes | CORS accepts only this origin |
| `TURNSTILE_SECRET_KEY` | Test secret | Staging test secret | Production secret | Yes | Edge | Yes for public ordering | Invalid/expired test token rejected |
| `RATE_LIMIT_SECRET` | Random local secret | Unique random secret | Unique random secret | Yes | Edge | Yes | Missing secret fails closed |
| `RATE_LIMIT_TRUSTED_HEADER` | Local proxy-set random value | Random ingress-only value | Random ingress-only value | Yes | Edge + trusted proxy | Yes | Proxy **overwrites** it; browser-supplied value is ignored |
| `RECONCILIATION_SECRET` | Random local secret | Unique random secret | Unique random secret | Yes | scheduler/Edge | Yes when schedule enabled | Unauthorized schedule call rejected |
| `SUPABASE_SERVICE_ROLE_KEY` | Tooling only | CI/admin tooling only | Backup/admin tooling only | Yes | backup/export tooling | Never frontend | Absent from browser bundle and Git |
| `STORAGE_BACKUP_OUTPUT_DIR` | Dedicated ignored directory | Controlled encrypted volume | Controlled encrypted volume | No | export script | Per backup | Mode 0700/0600 and manifest verification |
| Wompi variables | Unset/placeholders | Unset/placeholders | Unset/placeholders | Yes | Future phase only | No now | Payments remain disabled |

## Trusted rate-limit header

`RATE_LIMIT_TRUSTED_HEADER` is a shared secret name/value known only to the Edge Function and the ingress layer. The ingress must remove any incoming browser header with that name and inject its own value before forwarding to the Edge Function. Direct browser or CDN bypass access must be prevented by routing/network policy. It is not a client configuration value and must never use a `VITE_` prefix.

## Configuration inventory template

Copy this template outside Git for each environment. Record secret **names** only.

```json
{
  "captured_at": "ISO-8601",
  "project_ref": "staging-project-ref",
  "database_version": "",
  "migration_versions": [],
  "storage": { "buckets": [], "policies": [] },
  "realtime": { "publications": [] },
  "auth": { "providers": [], "redirect_urls": [] },
  "edge_functions": [{ "name": "order-api", "revision": "", "secret_names": [] }],
  "jobs": [],
  "origins": [],
  "frontend_revision": ""
}
```
