# Ohana experience redesign

Evaluation branch: `feature/ohana-experience-redesign`, created from `develop` at `3181285`.

Run `npm run dev` and open http://127.0.0.1:8080/. This work has not been deployed or merged into production.

## Design

- Grape `#30213E`, orchid `#E8DFF4`, mint `#D6EDCB`, melon `#F6B79D`, and paper `#FAF9F6`.
- Space Grotesk display typography, DM Sans interface text, and restrained Georgia italic accents.
- Interactive flavor photography is the signature: Caribe, Veggie, and Paisa change the photograph, caption, and background. GSAP provides entrance choreography, pointer tilt, flavor transitions, and section reveals.
- Navigation, menus, cards, builder framing, public page headers, footer, cart, and checkout share the new visual system. Admin styling remains independently scoped.
- Catalog search ignores accents and supports category filtering, compact view, recovery from empty results, and retry after API errors. Category filters remain available while scrolling the menu.
- Menus and product dialogs have accessible titles/descriptions, visible focus, and touch-sized close controls. Motion follows `prefers-reduced-motion`; transparency has a solid-surface fallback.

## Functional changes

- The builder tab strip scrolls horizontally without scrolling the entire page on initial mount. A regression test covers this behavior.
- Public route changes start at the top. Category deep links wait for catalog data, then navigate once instead of moving the page again after every refetch.
- `/bebidas` now links directly to `/#bebidas`, preserving the category selection.
- Product customization mounts only when requested. Existing pricing, cart persistence, delivery validation, and WhatsApp order creation are retained.
- Checkout submission remains next to its form and consent controls, so a disabled floating bar no longer obscures the mobile form.

## Assets and dependencies

Added `gsap` and updated `package-lock.json`. No environment variables or database migrations were added.

Three optimized WebP hero photographs were converted from existing repository assets in `imagenesOhana/Imagenes de Productos/`: `Caribean Bowl.png`, `Veggie Bowl.png`, and `Paisa Bowl.png`. Hero photography is editorial; live menu availability and prices still come from Supabase. No catalog rows were changed.

## Verification

- `npm test`: 19 tests passing, including bowl pricing, builder flow, product customization, cart reconciliation, delivery zones, images, and business settings.
- `npm run lint`: passing.
- `npm run build`: passing. Vite still reports a main-bundle size advisory and stale Browserslist data.
- `tsc --noEmit -p tsconfig.app.json`: 39 existing diagnostics. Compared against a clean export of the branch's `develop` base: same diagnostics, no new ones. Existing issues concern Supabase-generated types and older component typings. This check is not green and should be resolved before production release.
- Browser checked at 320, 390, 768, and 1440 pixels; no horizontal page overflow.
- Browser exercised flavor switching, reduced motion, dark mode, mobile navigation, search/no-results recovery, category filters, compact view, direct add-to-cart, product customization, cart-to-checkout navigation, pickup/delivery field switching, and the keyboard skip link.
- Live customization check: Americana with Lechuga removed and Tocineta extra persisted in the cart at $29.900. Checkout started at the top. Local test-cart items were removed afterward.
- No orders were submitted, no WhatsApp messages sent, and no production data modified.

## Review images

- [Desktop menu](output/playwright/redesign-desktop-menu.png)
- [Desktop hero](output/playwright/redesign-desktop.png)
- [Mobile hero](output/playwright/redesign-mobile.png)
- [Mobile dark mode](output/playwright/redesign-mobile-dark.png)
- [Mobile cart](output/playwright/redesign-mobile-cart.png)
- [Product customization](output/playwright/redesign-mobile-customizer.png)
- [Mobile checkout](output/playwright/redesign-mobile-checkout.png)

## Before a production decision

Review the visual direction on real phones, exercise a complete staging checkout with pickup and delivery, confirm the live catalog photography, and resolve the baseline TypeScript failures. Follow the repository's feature → develop → release → main flow after approval.
