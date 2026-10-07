# SEO + performance notes (2026-10-07)

## Canonical domain (H13)
Canonical = **https://ohanabowls.com**. Evidence: `base.json` Lighthouse report of
`https://ohanabowls.com/`; index.html, sitemap, robots already used it; brand is "Ohana Bowls".
`ohanachilli.com` appeared only in `SEOHead.tsx`, `RestaurantSchema.tsx` (Chilli brand removed from
the TS type) and as a `contact_email` placeholder/seed (`hola@ohanachilli.com` in
`supabase/migrations/20260412174000_public_business_settings.sql` and `businessSettings.ts`) -
left untouched (email, DB seed; confirm the mailbox domain with the owner).

Single source: `src/config/siteConstants.ts` (default URL, public routes, private paths) and
`src/config/site.ts` (`SITE_URL`, honours `VITE_SITE_URL`). `vite.config.ts` plugin `site-seo`
replaces `%SITE_URL%` in index.html and **generates** `sitemap.xml` and `robots.txt` at build
(and serves them in dev). The static files in `public/` were removed. To change domain, set
`VITE_SITE_URL` at build time. No DNS/deploy done.

## Indexing (H19/H20)
- Sitemap: `/`, `/bebidas` (real page, routed in App.tsx), `/nosotros`, `/contacto`.
- robots.txt disallows `/admin`, `/checkout`, `/pedidos`, `/pedido/`.
- `NoIndex` (mounted in App.tsx inside the Router) emits `noindex, nofollow` for those paths, incl. checkout.
- Caveat: SPA; vercel.json (not edited) must keep serving `/robots.txt` and `/sitemap.xml` before the SPA rewrite.

## Bundle (H14) - `npm run build`
| chunk | before | after |
|---|---|---|
| main index js | 727.9 kB (228 gz) | 360.2 kB (119.6 gz) |
| vendor-react | - | 155.3 kB (51.1 gz) |
| vendor-supabase | - | 172.1 kB (45.8 gz) |
| vendor-query | - | 39.7 kB (12.4 gz) |
Admin, Checkout, BowlBuilder, Orders pages were already lazy. Vendor split improves cache reuse across deploys.

## Images / assets (H21-H23, documented, nothing deleted)
- >300 KB: only `public/images/adicionales/01..06_*.png` (1.5-2.0 MB each, ~10.5 MB). Not referenced in `src`;
  not found in migrations by that path, but may be referenced by catalog `image_url` values in the live DB
  -> verify in DB, then convert to WebP (~50-100 KB) and keep URLs, or delete if unreferenced.
- Unsplash: no hardcoded product images in src; only the admin Unsplash picker (`ProductsAdmin.tsx`),
  a test fixture, and migrations `20260531120000_db_cleanup_images.sql` / `20260611090000_update_veggie_bowl_image.sql`.
  Historical migrations must not be edited.
- Fonts: Google Fonts (DM Sans, Space Grotesk, Nunito) loaded render-blocking with `display=swap`; self-hosting/subsetting is a follow-up.
- Only 2 `loading="lazy"` usages in src; audit product image components for below-fold lazy loading (follow-up).
- Hero preload `/images/experience/caribe-hq.webp` is in index.html.
