# Secret scan (2026-10-07)

Values are intentionally not printed. Patterns: JWT, `sk_`, `prv_`, `pub_`, PEM private keys, `postgres://user:pass@`, `service_role`, AWS/GitHub tokens, Turnstile secret-style keys. Scope: tracked files, all history (`git log --all -G`), `dist/`, tests, docs, workflows.

| Location | Type | Verdict |
|---|---|---|
| `.env` (tracked, but also in `.gitignore`; present in history in commits 821bf75, 8620589, 5f92ae7, ca74329) | Supabase JWT, decoded role `anon`; project URL/id | Public by design (shipped in the bundle). Not a secret. No `service_role` JWT found anywhere. |
| `dist/assets/index-*.js` | Same anon JWT (role `anon`) | Expected |
| `supabase/functions/order-api/handler.test.ts` | `prv_test_...` strings | Fake test fixtures |
| `.github/workflows/order-ci.yml` | `postgres:<pw>@localhost` URLs | Ephemeral CI service container password, localhost only. Not sensitive |
| migrations, baseline, tests, `docs/LOCAL_READINESS_*.md` | word `service_role` | SQL role grants / documentation, no keys |
| History | JWT only in `.env` commits above; DB URL only in 0863045 (CI localhost); `service_role` word only in migration/doc commits | No leaked private keys, sk_/prv_ keys, PEM, or credentialed remote DB URLs |
| Source maps | `vite.config.ts` has no `sourcemap` option (default off); `dist/assets` contains 0 `.map` files | OK |
| Private-key / cert files tracked | none (`*.pem`, `*.key`, `*.p12`) | OK |

Conclusion: no rotation required. If a service_role or Wompi/Turnstile secret was ever pasted elsewhere (Vercel logs, chat), rotate; none in the repo.

## Tracked `.env` decision

`.env` is tracked even though `.gitignore` lists it (committed before the ignore rule). It holds only the public anon key, URL and project id. `.env.local` is ignored and untracked (verified: only `.env` and `.env.example` are tracked).

Not changed. `src/integrations/supabase/client.ts` throws at runtime if `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` are missing, and I cannot see whether Vercel dashboard env vars are set. If they are not, removing `.env` from the repo would break the production build. To proceed safely:
1. Confirm in Vercel (Project -> Settings -> Environment Variables) that both `VITE_SUPABASE_*` vars exist for Production and Preview (`vercel env ls`).
2. Then `git rm --cached .env`, keep values in `.env.example` with placeholders. CI (`order-ci.yml`) already provides its own VITE_ values.
History retains the anon key; that is acceptable, no history rewrite needed.
