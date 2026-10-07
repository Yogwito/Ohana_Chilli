# Security headers, XSS and CSRF notes

Headers live in `vercel.json` (applied by Vercel only; `vite preview`/dev do not send them).

## CSP origins (only those actually used)
| Directive | Value | Why |
|---|---|---|
| script-src | `'self'`, sha256 of the anti-flash dark-mode inline script in `index.html`, `https://challenges.cloudflare.com` | Vite bundle; Turnstile (`BotProtection.tsx`). No `unsafe-eval`, no script `unsafe-inline`. |
| style-src | `'self' 'unsafe-inline' https://fonts.googleapis.com` | `unsafe-inline` is required: React `style=` attributes, Radix/Sonner/shadcn runtime-injected styles. Inline styles cannot execute script; accepted risk. |
| font-src | `'self' https://fonts.gstatic.com data:` | Google Fonts in `index.html`. |
| img-src | `'self' data: blob: https:` | Product `image_url` is admin-entered and may be any https host (Supabase storage, Unsplash, etc.); `data:` for CSS noise SVG / data-image URLs. |
| connect-src | `'self'`, Supabase project `https://naoqsypqqgjhdudenevx.supabase.co` + `wss://` (realtime), `challenges.cloudflare.com`, `https://api.unsplash.com` (admin image search) | |
| frame-src | `https://challenges.cloudflare.com` | Turnstile widget iframe. |
| frame-ancestors / object-src / base-uri / form-action | `'none'` / `'none'` / `'self'` / `'self'` | Anti-clickjacking, plugin and base-tag injection. |

Other headers: HSTS (2y, includeSubDomains; no `preload` until the domain owner opts in), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera, mic, geolocation, payment, usb off), `X-Frame-Options: DENY` (legacy), `COOP: same-origin-allow-popups` (keeps WhatsApp `window.open` working).

**Maintenance:** if the inline script in `index.html` changes, recompute its hash (`openssl dgst -sha256 -binary | base64`) and update `script-src`, otherwise dark-mode init is blocked. If the Supabase project changes, update both Supabase entries.

## Probable future Wompi additions (NOT added; payments disabled)
Wompi checkout is a full-page redirect (`window.location.assign`), so likely no CSP change is needed. If the widget/API is embedded: `script-src https://checkout.wompi.co`, `frame-src https://checkout.wompi.co`, `connect-src https://sandbox.wompi.co https://production.wompi.co`, and possibly `form-action https://checkout.wompi.co`. Verify against Wompi docs at activation.

## Verification done
Built the app, served `vite preview`, injected the same CSP via a Playwright route handler, loaded `/`, `/bebidas`, `/checkout`: zero CSP violations or console errors. Turnstile and Supabase live calls were not exercised (no keys/production access), so re-check the console on the first staging deploy.

## XSS / URL audit
- No `dangerouslySetInnerHTML`/`innerHTML`/`eval` in app code (guarded by `src/test/security-xss.test.tsx`).
- WhatsApp URLs: phone stripped to digits, message `encodeURIComponent`-ed, host fixed (`wa.me` / `web.whatsapp.com`), `noopener,noreferrer`.
- `window.location.assign(payment.url)` (CheckoutPage, OrderTrackingPage) navigates to a server-returned URL; origin is trusted (our Edge function) but it is not scheme-checked client-side. Low; recommend asserting `new URL(url).protocol === 'https:'` when payments are enabled.
- Saved tracking links in localStorage are filtered to `/pedido/<token>` paths (existing test).
- Storage contents: cart, saved bowls, theme, tracking-link paths (contain private order tokens: bearer capability, same-device only), pending order in sessionStorage (contains the customer's name/phone/address for crash recovery; cleared on tab close). Contains no passwords; Supabase auth session is stored by supabase-js in localStorage (standard; XSS is the mitigation, hence the CSP).

## CSRF conclusion
The app calls Supabase (PostgREST/Auth/Edge functions) with `Authorization: Bearer <JWT/anon key>` headers set by JS; there are no cookie-based sessions or server-side form posts, so browsers never attach credentials automatically and cross-site requests cannot act as the user. CSRF protection tokens are not needed. Residual risk is XSS (token theft), mitigated by the CSP above; CORS on Edge functions should stay restricted to the site origin. Guest order creation is protected against abuse by Turnstile plus idempotency keys, not CSRF tokens.
