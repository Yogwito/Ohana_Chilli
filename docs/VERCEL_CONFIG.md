# Vercel / deployment configuration audit (2026-10-07)

Evidence labels: VERIFICADO EN VERCEL READ-ONLY (`vercel env ls`, `vercel ls`, `vercel domains ls`), LOCAL (repo), NO VERIFICABLE.
Project: `juansearias21-4096s-projects/ohanachilli` (prj_bZZbWmE87AB5adBQEEAr5V1sjml5).

## 1. Environment matrix

Real variable names used by code (LOCAL): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (NOT `ANON_KEY`), `VITE_SUPABASE_PROJECT_ID`, `VITE_TURNSTILE_SITE_KEY`, `VITE_ONLINE_PAYMENTS_ENABLED`, `VITE_SITE_URL` (optional, default https://ohanabowls.com), `VITE_UNSPLASH_API_KEY` (optional).
All `VITE_*` are bundled into client JS: public by design, never put secrets in them. Server-side secrets (service role, Wompi, Turnstile secret) live in Supabase Edge secrets, not Vercel.

| Variable | Development | Preview | Production | Secret? | Side |
|---|---|---|---|---|---|
| VITE_SUPABASE_URL | missing | present | MISSING | no (public) | client |
| VITE_SUPABASE_PUBLISHABLE_KEY | missing | present | MISSING | no (public anon/publishable) | client |
| VITE_SUPABASE_PROJECT_ID | missing | present | MISSING | no | client |
| VITE_TURNSTILE_SITE_KEY | missing | missing | missing | no (site key public) | client |
| VITE_ONLINE_PAYMENTS_ENABLED | missing | missing | missing | no | client (defaults false: OK) |
| VITE_SITE_URL | missing | missing | missing | no | client (default OK) |
| VITE_UNSPLASH_API_KEY | missing | missing | missing | treat as sensitive | client (optional) |

VERIFICADO EN VERCEL READ-ONLY: only 3 variables exist, all Preview-only, created ~1d ago, values Encrypted (not visible).
Findings:
- BLOCKER: Production has NO Supabase vars. A Vercel Production build would have no backend (check how `client.ts` behaves without them). Add them to Production before any production deploy.
- Missing `VITE_TURNSTILE_SITE_KEY` in Preview/Production: checkout captcha cannot work if the Edge function enforces Turnstile.
- Preview-vs-production Supabase project: NO VERIFICABLE via ls (values encrypted). `vercel.json` CSP hardcodes `naoqsypqqgjhdudenevx.supabase.co`, so a Preview pointing at a different project would be BLOCKED by CSP connect-src. Manual check: Vercel dashboard > Settings > Environment Variables > reveal VITE_SUPABASE_URL for Preview and compare the project-ref (subdomain) with Production/Supabase prod ref. Preview must NOT use the production ref (use staging; see docs/ORDER_BACKEND_ROLLOUT.md) and the CSP must then list the staging host.
- Development target empty: expected if devs use local `.env`.

## 2. Domains and headers

VERIFICADO EN VERCEL READ-ONLY: `vercel domains ls` = 0 domains; all recent deployments (`vercel ls`) are Preview; no Production deployment visible.
Consequence: ohanabowls.com is NOT attached to this Vercel project.

Current production (live) responses, via curl (not the branch):
- DNS: ohanabowls.com resolves to Cloudflare IPs (104.21.x / 172.67.x), `server: cloudflare`. `www.ohanabowls.com`, `ohanachilli.com`, `www.ohanachilli.com` do not resolve / no response (empty curl).
- http://ohanabowls.com -> 301 https://ohanabowls.com/ (OK). HTTPS 200.
- Headers served: only `x-content-type-options: nosniff` and `referrer-policy: strict-origin-when-cross-origin` (likely Cloudflare/old host). MISSING vs vercel.json: CSP, HSTS, X-Frame-Options, Permissions-Policy, COOP. These come only from vercel.json, so they apply once the new build is served by Vercel.
- /robots.txt 200 text/plain (Sitemap points to https://ohanabowls.com/sitemap.xml); /sitemap.xml 200 application/xml with ohanabowls.com URLs. Consistent with `SITE_URL` (src/config/siteConstants.ts).
- Certs: NO VERIFICABLE on Vercel (no domains). Cloudflare serves valid TLS for apex.
Actions: decide hosting target; if Vercel, add ohanabowls.com + www (redirect www -> apex) in Vercel, update DNS (Cloudflare proxy on top of Vercel may mask/duplicate headers), then re-curl headers. Decide whether ohanachilli.com is retained (redirect to apex) or dropped; it currently does not resolve.

## 3. Contact email (BUSINESS CONFIGURATION REQUIRED BEFORE GO-LIVE)

`hola@ohanachilli.com` occurrences (LOCAL):
- src/domain/businessSettings.ts:11: admin form PLACEHOLDER only (not displayed to customers). No change needed.
- supabase/migrations/20260412174000_public_business_settings.sql:24: historical seed for `settings.contact_email` (not edited).
- docs/SEO_PERFORMANCE.md:7: mention.
The email shown in the app is read from the `settings` table (`contact_email` via `useBusinessSettings`; null by default). No hardcoded customer-facing email in src, so no new config constant was added.
BUSINESS CONFIGURATION REQUIRED BEFORE GO-LIVE: confirm the mailbox hola@ohanachilli.com actually exists (domain ohanachilli.com does not currently resolve, so MX is unlikely) or set a real address in Admin > settings (`contact_email`), and verify the production DB value.
