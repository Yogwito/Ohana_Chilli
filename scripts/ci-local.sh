#!/usr/bin/env bash
# Local replica of .github/workflows/order-ci.yml. Needs node, deno, psql and a local
# PostgreSQL server (superuser). Usage: scripts/ci-local.sh [--skip-browser]
# Set PG_BIN to a directory whose pg_dump matches the server major version if they differ.
set -euo pipefail
cd "$(dirname "$0")/.."
[ -n "${PG_BIN:-}" ] && export PATH="$PG_BIN:$PATH"
DB=ohana_ci
export TEST_DATABASE_URL="${TEST_DATABASE_URL:-postgresql://$(whoami)@localhost:5432/$DB}"
export VITE_SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_PUBLISHABLE_KEY=isolated-ci-key VITE_ONLINE_PAYMENTS_ENABLED=false
step() { printf '\n=== %s\n' "$*"; }
step lint;  npm run lint
step tsc;   npx tsc --noEmit -p tsconfig.app.json
step vitest; npm test
step build; npm run build
step deno;  deno check supabase/functions/order-api/index.ts
deno test --allow-env supabase/functions/order-api/handler.test.ts
dropdb --if-exists "$DB"; createdb "$DB"
for s in test-database test-migration-scenarios test-order-concurrency restore-drill; do step "$s"; node "scripts/$s.mjs"; done
if [ "${1:-}" != "--skip-browser" ]; then
  step browser
  npx playwright install chromium
  VITE_SUPABASE_URL=https://isolated.supabase.co VITE_TURNSTILE_SITE_KEY=isolated-turnstile-site-key \
    npm run dev -- --host 127.0.0.1 --port 8089 >/tmp/ohana-vite.log 2>&1 &
  VITE_PID=$!; trap 'kill $VITE_PID 2>/dev/null || true' EXIT
  for _ in $(seq 10); do curl -sf http://127.0.0.1:8089/ >/dev/null && break; sleep 1; done
  BROWSER_TEST_ORIGIN=http://127.0.0.1:8089 node scripts/test-purchase-browser.cjs
fi
echo; echo "CI-LOCAL OK"
