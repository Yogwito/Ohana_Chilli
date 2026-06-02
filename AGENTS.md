# Repository Guidelines

## Project Overview
This is an Ohana Bowls ordering and admin SPA built with Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui, React Router, TanStack Query, and Supabase. Customers browse the live catalog, build custom bowls, place pickup or delivery orders, and hand the order off to WhatsApp. Admin users manage products, categories, ingredients, bowl rules, delivery zones, settings, promotions, analytics, and orders.

The codebase still contains some historical Ohana/Chilli names and redirects. The active TypeScript `Brand` type is currently only `'ohana'`; `/chilli`, `/ohana`, and `/carta` redirect to `/`, and `CartaPage.tsx`/`HomePage.tsx` are legacy or currently unmounted.

## Project Structure & Module Organization
Main app code lives in `src/`:
- `src/App.tsx`: providers and route definitions.
- `src/pages/`: route-level screens such as `OhanaPage`, `BeveragesPage`, `CheckoutPage`, `OrdersPage`, `AdminPage`, and `AdminLoginPage`.
- `src/components/ohana/`: Ohana menu-specific UI, promotions, and the bowl builder.
- `src/components/products/`: product display, image handling, and customization UI.
- `src/components/cart/`: cart drawer and checkout-facing cart UI.
- `src/components/admin/`: admin tab content for products, promotions, analytics, and related management screens.
- `src/components/layout/`: layout shell, navbar, footer, heroes, and error boundary.
- `src/components/ui/`: shadcn/Radix primitives and shared UI helpers.
- `src/context/CartContext.tsx`: cart reducer, localStorage persistence, and cart hooks.
- `src/hooks/`: Supabase catalog queries, admin auth, catalog cache sync, theme/mobile/intersection helpers.
- `src/domain/`: pure business logic for pricing, bowl summaries, delivery zones, product images, business settings, cart/catalog reconciliation, and WhatsApp formatting.
- `src/lib/`: shared utilities such as `cn()` and fire-and-forget analytics tracking.
- `src/types/`: app-level TypeScript types.
- `src/integrations/supabase/`: generated Supabase client and database types.
- `src/test/`: shared Vitest and Testing Library setup plus regression tests.

Static public assets live in `public/`. Local source/menu images may also exist in `imagenesOhana/`. Database schema and data changes belong in `supabase/migrations/`. Root-level docs and checklists such as `MENU_SOURCE.md`, `AUDIT_CHECKLIST.md`, `QA_CHECKLIST_DELIVERY_ZONES.md`, and `QA_CHECKLIST_PR1_REAL_MENU.md` should be updated or referenced when menu, image, order, or delivery behavior changes.

## Build, Test, and Development Commands
- `cp .env.example .env`: copy required Supabase env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`).
- `npm i`: install dependencies. Use npm as the default package manager even though Bun lockfiles are present.
- `npm run dev`: start Vite on port `8080` with host `::`.
- `npm run build`: create a production build in `dist/`.
- `npm run build:dev`: build with development mode settings.
- `npm run preview`: preview the production build locally.
- `npm run lint`: run ESLint across the repo.
- `npm test`: run the Vitest suite once.
- `npm run test:watch`: run Vitest in watch mode.

## Routes
- `/`: main Ohana menu, promotions, and bowl builder.
- `/bebidas`: beverage listing.
- `/checkout`: checkout form, delivery-zone validation, order creation, and WhatsApp handoff.
- `/pedidos`: standalone orders view.
- `/nosotros`: about page.
- `/contacto`: contact page.
- `/admin/login`: Supabase email/password admin login.
- `/admin`: auth-guarded admin panel rendered outside the public layout.
- `/ohana`, `/chilli`, `/carta`: redirects to `/`.
- `*`: not-found page inside the public layout.

## Supabase & Data Model
The app reads and writes Supabase directly from the frontend. Keep migrations in `supabase/migrations/`, and do not hand-edit `src/integrations/supabase/types.ts` unless regenerating types is part of the task.

Important tables/functions used by the app include:
- `products`, `categories`, `brands`: live catalog rows. Products are filtered by `is_active`.
- `ingredients`, `bowl_rules`: bowl builder options, limits, and base prices.
- `product_default_ingredients`: default ingredient metadata for product customization.
- `orders`, `order_items`, `create_order_with_items(...)`: checkout persistence.
- `delivery_zones`: active delivery zones and canonical fees.
- `settings`: business settings such as WhatsApp number, address, hours, social links, ETA, and review rating.
- `promotions`: active promotions for the Ohana page/admin.
- `analytics_events`: page/cart/checkout/WhatsApp events.
- `user_roles`: admin authorization (`role = 'admin'`).

Admin writes rely on Supabase Auth and RLS. Public checkout uses the database RPC for order creation.

## Key Architecture Notes
- Prices are integer Colombian pesos, despite database names such as `price_cents` and `fee_cents`. Use `formatPrice()` for display.
- `use-catalog.ts` owns React Query reads for brands, categories, products, beverages, ingredients, bowl rules, delivery zones, settings, promotions, and default ingredients.
- Catalog data is intentionally live: many queries use `staleTime: 0`, refetch on mount/focus, and delivery zones refetch every 30 seconds.
- Admin catalog mutations should invalidate/refetch and broadcast with `useCatalogMutationSync()` so other tabs update via `BroadcastChannel`/`localStorage`.
- Cart state persists to localStorage key `ohana-bowls-cart` with schema version `cart:v3`; invalid or stale cart data is reset.
- Cart items are reconciled against the live catalog in `cartCatalogSync.ts` so deleted/inactive products or changed bowl rules do not stay stale.
- Bowl builder steps are size, bases, proteins, acompanantes, salsas, complementos, and summary. Premium/extra charges live in `bowlPricing.ts`.
- Checkout defaults to delivery, validates the selected active delivery zone, re-fetches the canonical zone/fee before creating the order, then generates a WhatsApp message.
- WhatsApp URLs are built in `src/domain/whatsapp.ts`; mobile uses `wa.me`, desktop opens WhatsApp Web.
- Analytics calls in `src/lib/analytics.ts` are fire-and-forget and must not block UI flows.

## Coding Style & Naming Conventions
Use TypeScript for app code and keep 2-space indentation. Follow nearby file style; this repo is not fully auto-formatted. Prefer the `@/` alias for imports from `src/`.

Naming conventions:
- React components and pages: PascalCase (`CheckoutPage.tsx`, `BowlBuilder.tsx`).
- Hooks: `use-kebab-case.ts` or existing local style (`use-catalog.ts`).
- Domain utilities: camelCase filenames with pure functions where possible (`formatPrice.ts`, `deliveryZones.ts`).
- Shared UI primitives should stay under `src/components/ui/`.

TypeScript is intentionally loose (`strict: false`, `noImplicitAny: false`, unused checks disabled). Do not assume strict-mode guarantees. UI copy is Spanish-facing; keep customer/admin-visible text in Spanish unless the surrounding UI is already English.

## Testing Guidelines
Vitest runs in `jsdom` with Testing Library and setup in `src/test/setup.ts`. Test files should be named `*.test.ts` or `*.test.tsx`; colocated tests under `src/` are supported.

Add or update focused tests when touching:
- bowl pricing, bowl summaries, or builder behavior
- delivery-zone normalization or checkout validation
- business settings formatting
- product image resolution
- cart/catalog reconciliation or cart persistence
- WhatsApp message formatting and handoff behavior

For UI changes, run the relevant test subset when possible and include screenshots in PRs when visual behavior changes.

## Commit & Pull Request Guidelines
Recent commits use short, focused subjects such as `Bowl builder` and `whatsapp sent fixed`. Keep commit messages brief, imperative, and scoped to one change.

PRs should include:
- a short summary of user-facing changes
- linked issue or task, if available
- screenshots for UI changes
- notes for new env vars, Supabase migrations, CSV/data updates, or image asset changes
- the commands you ran, such as `npm run lint`, `npm test`, and `npm run build`

## Gitflow Branching
Use Gitflow consistently for ongoing work:
- `main`: production-ready branch. Only merge tested release or hotfix work here, then deploy from this branch.
- `develop`: integration branch for completed work before release. Feature branches should merge here first.
- `feature/<short-name>`: new features or non-urgent fixes. Branch from `develop`, then merge back into `develop`.
- `release/<version-or-date>`: final stabilization before production. Branch from `develop`, test and fix release-only issues, then merge into both `main` and `develop`.
- `hotfix/<short-name>`: urgent production fixes. Branch from `main`, then merge into both `main` and `develop`.

Do not commit routine development directly to `main`. Keep branch names lowercase, hyphen-separated, and focused on one change.
