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
