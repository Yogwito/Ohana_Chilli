# Observability and kill switches

Status legend: **[IMPLEMENTED]** in code and tested, **[PENDING]** needs a remote provider or work not yet done.

## 1. Structured logging [IMPLEMENTED]
- `supabase/functions/_shared/log.ts`: one JSON line per request (`ts, level, service, event, request_id, route, status, code, error_category, duration_ms`), plus `event:"monitor"` lines for alertable codes.
- Request id: inbound `x-request-id` is accepted only if `[A-Za-z0-9._-]{8,64}`; otherwise a UUID is generated. Always returned in the `x-request-id` response header (exposed via CORS).
- Error categories: `none, client, conflict, auth, rate_limit, kill_switch, provider, server`.
- Redaction (`redact()`): keys matching password/secret/token/authorization/api key/service role/private/integrity/signature/body/request/payload are replaced; phones masked to last 3 digits; address/notes/names/email redacted; string values scrubbed of `Bearer ...`, Wompi key shapes, JWTs and 64-hex tokens. Request bodies and client IPs are never logged. Covered by tests in `handler.test.ts`.
- Audit: the only `console.*` call in Edge code is inside `log()`. Former `console.error` in `monitor()` now goes through `log()`.

## 2. Health [IMPLEMENTED]
- `GET .../order-api/health` -> `200 {"ok":true}` (liveness, no dependencies).
- `GET .../order-api/health/ready` -> `200 {"ok":true,"status":"ok","components":{"database":"ok"}}` or `503 {"ok":false,"status":"degraded","components":{"database":"down"}}`. Trivial service-role read of `settings` with a 3 s timeout; no error text is returned.
- [PENDING] Point an external uptime monitor at both URLs (see section 6).

## 3. Kill switches [IMPLEMENTED]
| Env (Edge secret) | Default | Effect |
|---|---|---|
| `ORDERS_ENABLED` | enabled when unset; exact `false` disables | `quote` and `create` return `503 {"error":"orders_disabled","code":"orders_disabled","message":"<Spanish>"}`. Tracking, admin `action`/`refund`, `webhook`, `reconcile`, `analytics`, health keep working. |
| `ONLINE_PAYMENTS_ENABLED` | `false` | Online `payment_method` and `payment` return 503 `online_payments_disabled`; cash/transfer ordering unaffected. Wompi also needs the verification flags and `pub_test_/prv_test_` keys. |
Flip with `supabase secrets set ORDERS_ENABLED=false` (takes effect on next cold start / redeploy of the function; verify after setting). The frontend must handle `orders_disabled` (show the message, offer WhatsApp contact).

## 4. Metrics, instrumentation and thresholds
Today metrics are derived from log lines (`event`, `route`, `status`, `code`, `error_category`). Names below are the target metric names; "log source" says how to compute them from logs.

| Metric | Instrumentation point | Log source | Status |
|---|---|---|---|
| `orders_create_success_total` | `route=create status=200` | request log | log line IMPLEMENTED; counter PENDING |
| `orders_create_failure_total{code}` | `route=create status>=400` | request log `code` | log IMPLEMENTED; counter PENDING |
| `checkout_quote_failure_total` | `route=quote status>=400` | request log | log IMPLEMENTED |
| `edge_requests_total{route,status}` / 4xx / 5xx | every request | request log | log IMPLEMENTED |
| `edge_latency_ms{route}` p50/p95 | `duration_ms` | request log | log IMPLEMENTED; percentiles PENDING |
| `orders_disabled_rejections_total` | `error_category=kill_switch` | request log | IMPLEMENTED |
| `rate_limit_events_total{route}` | `status=429`, `code=rate_limited`; `rate_limit_unavailable` (503) | request log | IMPLEMENTED |
| `webhook_failures_total` | `route=webhook status>=400` (`invalid_webhook`, `webhook_mismatch`) | request + monitor log | IMPLEMENTED |
| `reconciliation_failures_total` | monitor codes `payment_reconciliation_failed`, `refund_reconciliation_failed`, `reconciliation_failed` | monitor log | IMPLEMENTED |
| `payments_unresolved` | monitor `payment_unresolved` | monitor log | IMPLEMENTED |
| `late_payments_total` / financial attention | monitor `financial_attention_overdue` (reconcile) | monitor log | IMPLEMENTED |
| `refund_failures_total` / `refund_unresolved` | monitor `refund_unresolved`, `refund_requires_review` | monitor log | IMPLEMENTED |
| `order_ack_overdue` | monitor `order_acknowledgement_overdue` | monitor log | IMPLEMENTED |
| `analytics_failures_total` | `route=analytics status>=400` | request log | log IMPLEMENTED; browser-side `trackEvent` failures PENDING (frontend) |
| Frontend checkout failures / JS errors | browser | - | PENDING (needs RUM/error tracker) |

## 5. Alert definitions [PENDING: no alert sink yet]
| Alert | Condition | Severity |
|---|---|---|
| Edge 5xx rate | 5xx / requests > 2% over 5 min (min 20 requests) | page |
| Create failures | `orders_create_failure_total` (excluding 4xx validation) > 3 in 10 min | page |
| Readiness down | `/health/ready` 503 for 2 consecutive checks (1 min interval) | page |
| p95 latency | `create` p95 > 3000 ms for 10 min | warn |
| Reconciliation failing | any `payment_reconciliation_failed` or no reconcile run in 15 min | page |
| Webhook failures | > 3 `invalid_webhook`/`webhook_mismatch` in 10 min | warn |
| Late payment / financial attention | any `financial_attention_overdue` | page (staff, money) |
| Refund unresolved | any `refund_unresolved` > 2 min | page |
| Order unacknowledged | any `order_acknowledgement_overdue` | page (staff) |
| Rate-limit spike | > 100 `rate_limited`/5 min | warn |
| Analytics failures | > 20% of analytics requests failing for 15 min | info |
| Kill switch active | any `orders_disabled` rejection | info (confirm intentional) |
The existing optional `MONITORING_URL`/`MONITORING_TOKEN` webhook already receives monitor codes (`{service, code}`) and can drive the "page" alerts above once pointed at a provider.

## 6. Needs a remote provider later [PENDING]
- Log drain/aggregation (Supabase log drains to Datadog/Axiom/Logflare) to turn log lines into counters, percentiles and alerts.
- Uptime monitor on `/health` and `/health/ready` (BetterStack, UptimeRobot).
- Alert routing (PagerDuty/Slack/WhatsApp) behind `MONITORING_URL`.
- Frontend error tracking/RUM (Sentry or similar) for checkout failures and analytics send failures.
- Scheduler heartbeat for the reconcile cron (dead-man switch).
