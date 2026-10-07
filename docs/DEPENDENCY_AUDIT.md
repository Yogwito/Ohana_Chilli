# Dependency audit (2026-10-07)

Before: 35 advisories (all), 16 (`--omit=dev`). After safe `npm audit fix` plus playwright 1.55.0 -> 1.63.0 (minor): 15 (all), 9 (`--omit=dev`). No major upgrades applied; no `--force`.

Verification after changes: build OK; tsc, lint and one vitest test (`checkout-maintenance`) fail only in files being edited by other agents (not dependency related; confirm after they finish).

## Remaining advisories

"Runtime" = ends up in the shipped browser bundle. Almost all "prod" hits are build-time tooling (tailwind/postcss) placed in `dependencies`/`devDependencies` of the build, never shipped.

| Package | Sev | Dev/Runtime | Usage path | Exploitable here | Action |
|---|---|---|---|---|---|
| react-router-dom 6.30.6 / react-router / @remix-run/router | moderate | Runtime | direct; `Link` x10, `useNavigate` x7, `Navigate` x1 | UNKNOWN (open redirect via `//` or backslash in navigated paths; only exploitable if user-controlled strings are passed to Link/navigate; app uses static paths and `/pedido/:token`) | Needs v7 (major). Audit navigate targets for user input; plan v7 migration separately |
| tailwindcss 3.4.19 -> braces, chokidar, micromatch, fast-glob, postcss-nested, postcss-selector-parser | high/moderate | Build-time only | direct; vite/postcss build | NO (ReDoS/DoS on glob/selector input from our own source/config; not in bundle) | Fix requires tailwind 4 (major). Defer |
| @tailwindcss/typography | moderate | Build-time | via postcss-selector-parser | NO | fix = downgrade to 0.5.4 (breaking); defer |
| vitest 3.2.7, @vitest/mocker, tinypool | critical/moderate | Dev only | `npm test`; RCE needs Vitest UI/API server listening (`--ui`/`--api`) and attacker access | NO (UI server not used; CI runs `vitest run`) | Fix requires vitest 5 (major). Never run `vitest --ui` on shared networks |
| lovable-tagger 1.3.5 | moderate | Dev only | `vite.config.ts` componentTagger (dev mode) | NO | Candidate for removal (Lovable-specific); optional |
| playwright | high | Dev only | e2e scripts | NO | Fixed (1.63.0). Remaining listing, if any, is the advisory range metadata |

Fixed by `npm audit fix` (lockfile only): vite (7.3.7), ws, yaml, postcss, source-map-js, nanoid, picomatch, brace-expansion, browserslist, form-data, js-yaml, esbuild, @typescript-eslint/*, @humanfs/node, @tootallnate/once.

## Other checks

- Install scripts (`hasInstallScript`): `@swc/core`, `esbuild`, `fsevents`, `lovable-tagger/node_modules/esbuild`, `postcss` (benign: binary selection / platform optional). Playwright downloads browsers only when invoked.
- Unmaintained: `lovable-tagger` (platform-specific tooling); `tailwindcss-animate` is stable but low-activity. No abandoned runtime deps found.
- Runtime third-party loads: Google Fonts CSS/woff2 (`index.html`), Cloudflare Turnstile `challenges.cloudflare.com/turnstile/v0/api.js` (`BotProtection.tsx`, loaded dynamically), Supabase, `api.unsplash.com` (CSP only). All covered by CSP in `vercel.json`. No SRI possible for Turnstile/Google Fonts (dynamic); consider self-hosting fonts.
- Dependabot configured in `.github/dependabot.yml` (npm + actions, weekly).

## Workflow pin recommendations

(Workflows are owned by another change; apply manually.) SHAs resolved with `gh api repos/<o>/<r>/commits/<tag>`:

- `actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4`
- `actions/setup-node@49933ea5288caeca8642d1e84afbd3f7d6820020 # v4`
- `denoland/setup-deno@22d081ff2d3a40755e97629de92e3bcbfa7cf2ed # v2`

Also set `permissions: contents: read` at workflow level and add `npm audit --omit=dev --audit-level=critical` as an informational job.

## Re-analysis (close-out, 2026-10-07)

Current `npm audit`: 15 advisories (all), 9 (`--omit=dev`; all build tooling or react-router). Installed: react-router-dom 6.30.6, react-router 6.30.6, @remix-run/router 1.23.4.

### react-router-dom 6.x: verdict NOT APPLICABLE (no upgrade)

| Advisory | Needs | Evidence in this repo |
|---|---|---|
| GHSA-wrjc-x8rr-h8h6 (open redirect via backslash in `<Link>`/`useNavigate`, CVE-2025-68470 bypass; range >=6.0.0 <7.18.0) | A navigate/Link target built from untrusted input (backslash or `//` host) | App uses `<BrowserRouter>` (src/App.tsx). All `navigate()`/`<Navigate>` targets are literals or built from internal values: `/checkout`, `/`, `/#menu`, `/admin...`, `/pedido/${token}` (64-hex token generated client-side by `randomTrackingToken`, not read from the URL), `/?editar-bowl=${encodeURIComponent(id)}#...`. `useParams` (OrderTrackingPage) only feeds API calls. `useSearchParams` (AdminPage `section`) is checked against an allow-list. The one dynamic `<Link to={link}>` (RecentOrders.tsx) validates same origin and `^/pedido/[a-f0-9]{64}$` first. `CheckoutPage` `continueShoppingPath` comes from `location.state.from` (history state set only by in-app `navigate` from `pathname+search+hash`, so it starts with a single `/`; not settable by a cross-site link), `/checkout` excluded. No server data reaches a redirect target. |
| GHSA-337j-9hxr-rhxg (constructor injection via `deserializeErrors()` in SSR hydration; range >=6.4.0 <7.18.0) | SSR with data routers / `__staticRouterHydrationData` | No SSR, no `createBrowserRouter`, `RouterProvider`, `createStaticHandler`, loaders or hydration data in src (grep). Pure client-side SPA. |

Action: none; stay on 6.30.6 (the only audit fix is the v7 major). No vitest test added because no untrusted path to a navigate/redirect target exists. Revisit if SSR, data routers, or a user-supplied redirect (`?next=`) is introduced.

### Other remaining advisories

| Package | Advisory | Runtime? | Applies | Notes |
|---|---|---|---|---|
| braces <=3.0.3 (via micromatch, fast-glob, chokidar, tailwindcss) | GHSA-vfj7-8cjw-p6xm stack exhaustion, nested patterns | Build only | NO | Patterns are our own tailwind `content` globs. Fix = tailwind 4 (major). |
| postcss-selector-parser <7.1.6 (via postcss-nested, tailwindcss, @tailwindcss/typography) | GHSA-rj75-hqrm-r3gf quadratic selector parsing | Build only | NO | Parses our own CSS at build time. |
| vitest 3.2.7 + @vitest/mocker | GHSA-82fw-gwwq-j7x9 path traversal/file read via mock redirect | Dev/CI only | NO | Needs attacker-reachable Vitest server; CI runs `vitest run`. |
| tinypool <=2.1.1 | GHSA-5gmw-xhrv-c9v3, GHSA-85c8-ppgw-ccpr prototype pollution to RCE | Dev/CI only | NO | Needs attacker-controlled pool options. Fix = vitest 5 (major). |
| lovable-tagger (via tailwindcss) | transitive | Dev only | NO | Optional removal. |

Regression test for the orders_disabled-after-uncertain-create scenario: `src/test/checkout-disabled-after-uncertain.test.tsx`.
