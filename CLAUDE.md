# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Ohana & Chilli — Project Guide

## Project Overview

Single-page web app serving two Colombian food brands — **Ohana** (healthy bowls) and **Chilli** (hot food) — from one React codebase. Customers browse the menu, build custom bowls, and place orders. Orders are priced and persisted server-side (Supabase Edge function), then handed off via **WhatsApp**. Online payments (Wompi) exist but are **sandbox-only and disabled by default** (`VITE_ONLINE_PAYMENTS_ENABLED=false`).

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, TypeScript 5.8, Vite 7 (SWC) |
| Styling | Tailwind CSS 3, shadcn/ui (Radix UI), Lucide icons |
| Routing | React Router v6 |
| Server state | TanStack React Query v5 |
| Client state | React Context + useReducer (cart) |
| Backend/DB | Supabase (PostgreSQL + Auth + RLS) |
| Validation | Zod |
| Toasts | Sonner |
| Testing | Vitest + Testing Library |

## Commands

```bash
npm run dev          # start dev server
npm run build        # production build
npm run build:dev    # build in development mode (unminified)
npm run test         # run tests once
npm run test:watch   # watch mode
npm run lint         # eslint
npx tsc --noEmit -p tsconfig.app.json   # typecheck (run in CI)
node scripts/test-database.mjs          # SQL regression tests against isolated local PostgreSQL (supabase/tests/*.sql)
```

Run a single test file: `npx vitest run src/test/bowl-pricing.test.ts`

## Routes

| Path | Component | Notes |
|---|---|---|
| `/` | OhanaPage | Main landing — Ohana menu + BowlBuilder |
| `/ohana` | — | Redirects to `/` |
| `/chilli` | — | Redirects to `/` |
| `/bebidas` | BeveragesPage | Drinks |
| `/carta` | — | Redirects to `/` (CartaPage exists but is not mounted) |
| `/checkout` | CheckoutPage | Order form → WhatsApp |
| `/pedidos` | OrdersPage | Admin-only order list |
| `/pedido/:token` | OrderTrackingPage | Private order tracking via token (no Layout) |
| `/nosotros` | AboutPage | About page |
| `/contacto` | ContactPage | Contact |
| `/admin` | AdminPage | Admin panel (auth-guarded) |
| `/admin/login` | AdminLoginPage | Supabase auth login |

Admin routes (`/admin`, `/admin/login`) render without `<Layout>`. All public routes are lazy-loaded via `React.lazy` + `Suspense`.

## Database Tables (Supabase)

| Table | Key Columns | Notes |
|---|---|---|
| `products` | id, name, brand_id, category_id, price_cents, is_active | brand_id is `'ohana'` or `'chilli'` (not UUID) |
| `ingredients` | id, name, type, price_cents, is_active | type: base/protein/acompanante/sauce/topping |
| `bowl_rules` | size (PK), name, price_cents, bases, proteins, accompaniments | small/medium/large |
| `categories` | id, name, brand_id, slug, icon | |
| `brands` | id, name | Only 'ohana' and 'chilli' |
| `orders` | id, customer_name, phone, order_type, address, delivery_zone, delivery_fee_cents, total_cents, status, notes | status: pending/confirmed/preparing/ready/delivered/cancelled |
| `order_items` | id, order_id, brand_id, name, quantity, unit_price_cents, details (JSON) | details holds bowl config or product_id |
| `delivery_zones` | id, name, fee_cents, is_active | |
| `settings` | key, value | e.g., `whatsapp_number` |
| `analytics_events` | id, event_type, metadata, created_at | |
| `user_roles` | user_id, role | role = 'admin' grants admin access |

## Key Architecture

### Prices
All prices are stored and computed in **Colombian pesos as integers (cents = whole COP)**. Display via `formatPrice()` in `src/domain/formatPrice.ts`.

### Brands
The `Brand` type in `src/types/index.ts` is currently `'ohana'` only. The DB tables (products, categories, order_items) use `brand_id` as a string FK, and `'chilli'` rows may still exist in the DB — but the TypeScript type only covers `'ohana'`.

### Cart
- Persists to `localStorage` with schema version `cart:v2` (key: `ohana-chilli-cart`)
- Split into `CartStateContext` + `CartActionsContext` for render performance
- Backward-compat `useCart()` hook combines both
- Supports two item types: `'product'` and `'custom-bowl'`

### Bowl Builder
- Multi-step wizard: size → bases → proteins → acompanantes → salsas → complementos → summary
- Reads live data from Supabase via `useBowlRules()` and `useIngredients()` hooks
- Bowl pricing in `src/domain/bowlPricing.ts` — base price from size + extra charges for premium ingredients

### Order Flow
1. Customer fills checkout form (name, phone, pickup/delivery, zone; Turnstile key via `VITE_TURNSTILE_SITE_KEY`)
2. `src/lib/orderApi.ts` calls the **`order-api` Edge function** (`supabase/functions/order-api/handler.ts`). The server re-prices everything from the catalog (client prices are ignored), validates zone/hours/promotions, and returns a canonical quote; if the quote changed, checkout pauses for user review
3. Order is created atomically via SQL RPCs, with idempotency key + tracking token. The pending request is kept in `sessionStorage` (`ohana-pending-order:v1`) so a reload can recover with the same identity
4. WhatsApp message generated via `src/domain/whatsapp.ts` from the persisted receipt; `openWhatsAppHandoff()` handles embedded/iframe contexts (fallback: copy message or direct link)
5. Optional Wompi sandbox payment / full-refund requests; late payments on cancelled orders raise a persistent "financial attention" incident in the admin orders dashboard

### Admin Auth
- Login at `/admin/login` via `supabase.auth.signInWithPassword()`
- Checks `user_roles` table for `role = 'admin'` after login
- `useAdminAuth` hook subscribes to `onAuthStateChange` + initial session check

### Data Fetching
All Supabase reads use React Query via hooks in `src/hooks/use-catalog.ts`:
- `useProducts()`, `useCategories()`, `useBrands()`
- `useIngredients()`, `useBowlRules()`
- `useActiveDeliveryZones()` — refetches every 30s, staleTime: 0 (important for live fee accuracy)
- `useWhatsAppNumber()` — stale 1 hour
- `useBusinessSettings()` — typed wrapper around the `settings` table; covers phone, hours, social links, etc.

### Backend (Supabase)
- `supabase/migrations/2026100612*` are **additive** order/payment migrations; apply only via the isolated staging/drift-review process in `docs/ORDER_BACKEND_ROLLOUT.md` before releasing matching frontend/Edge code. Never point local/staging config at production.
- `src/integrations/supabase/types.ts` is generated (`scripts/generate-db-types.mjs`); regenerate after migrations.
- Backup/restore scripts live in `scripts/` (see `docs/BACKUP_RESTORE.md`). Edge tests run with Deno (`handler.test.ts`); CI (`.github/workflows/order-ci.yml`) runs lint, tests, tsc, build and Deno.
- Dated change/audit notes in `docs/` (e.g. `CORRECTIONS_2026-10-07.md`) record what is verified locally vs. not deployed.

### Cross-Tab Cache Sync
`src/hooks/use-catalog-sync.ts` keeps React Query caches in sync across browser tabs when the admin makes changes. After any admin mutation, call `useCatalogMutationSync()` with the affected table names — it invalidates/refetches locally and broadcasts via `BroadcastChannel` (falling back to `localStorage` storage events for same-origin tabs). `CatalogSyncBridge` in `App.tsx` wires up the listener side automatically.

## Important Files

```
src/
  App.tsx                    # Routes definition + CatalogSyncBridge
  types/index.ts             # All shared TypeScript types
  context/CartContext.tsx    # Cart state, localStorage persistence
  hooks/use-catalog.ts       # All Supabase data hooks
  hooks/use-catalog-sync.ts  # Cart ↔ catalog sync logic
  hooks/use-admin-auth.ts    # Admin authentication hook
  domain/
    bowlPricing.ts           # Bowl price calculation
    bowlSummary.ts           # Bowl → readable string / WhatsApp text
    businessSettings.ts      # Business-level settings helpers
    cartCatalogSync.ts       # Keeps cart items in sync with catalog changes
    deliveryZones.ts         # Zone name normalization
    formatPrice.ts           # COP price display
    productImages.ts         # Product image URL resolution
    whatsapp.ts              # WhatsApp URL + message builder
  components/
    admin/                   # AnalyticsAdmin, PromotionsAdmin
    cart/                    # CartDrawer
    layout/                  # Layout, Navbar, Footer, PageHero, ErrorBoundary
    ohana/                   # BowlBuilder, PromotionsSection
    products/                # ProductCard, ProductImage
  integrations/supabase/
    client.ts                # Supabase client instance
    types.ts                 # Auto-generated DB types
  lib/
    analytics.ts             # trackEvent() → analytics_events table
```

## Known Issues / Gotchas

1. **Duplicate orders views**: `/pedidos` (OrdersPage) and the "Pedidos" tab in AdminPage both show orders but are separate components with different features. OrdersPage shows all orders and is accessible to any admin; AdminPage tab also lets you update order status.

2. **WhatsApp handoff in embedded contexts**: The `openWhatsAppHandoff()` function detects if running in an iframe/preview and falls back gracefully. Test checkout on real devices, not previews.

3. **Delivery zone re-validation**: Zone and fee are validated server-side at order creation. If the zone was deactivated between selection and submit, the order is blocked.

4. **Hours/banner settings**: Business hours use Bogotá time (incl. overnight ranges); the backend rejects orders when closed. Only specific `settings` keys are anonymously readable (RLS).

## TypeScript

- `strict: false` and `noImplicitAny: false` — type gaps are tolerated; don't assume strict mode
- Path alias `@/*` maps to `./src/*` — use it for all internal imports

## Conventions

- Component files: PascalCase (`BowlBuilder.tsx`)
- Hooks: `use-kebab-case.ts`
- Domain logic: `camelCase.ts` — pure functions, no React
- All monetary values in **integer COP** (no decimals)
- Spanish UI text throughout; error messages also in Spanish
- `cn()` from `src/lib/utils.ts` for conditional Tailwind classes
- Admin-only DB operations rely on Supabase RLS — admin session is required for writes
