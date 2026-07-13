# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Ohana & Chilli — Project Guide

## Project Overview

Single-page ordering and admin app for **Ohana Bowls**. Customers browse the live catalog, customize products, build bowls, choose pickup or delivery, persist orders in Supabase, and hand the order off through **WhatsApp**. Admin users manage the catalog, settings, promotions, analytics, and orders. There is no payment processing.

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
cp .env.example .env  # set VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, VITE_SUPABASE_PROJECT_ID
npm i                 # install deps (use npm, even though bun.lock/bun.lockb are present)
npm run dev           # start dev server on port 8080 (host "::")
npm run build         # production build
npm run build:dev     # build in development mode (unminified)
npm run test          # run tests once
npm run test:watch    # watch mode
npm run lint          # eslint
```

Run a single test file: `npx vitest run src/test/bowl-pricing.test.ts`

## Routes

| Path | Component | Notes |
|---|---|---|
| `/` | OhanaPage | Main landing — Ohana menu + BowlBuilder |
| `/ohana` | — | Redirects to `/` |
| `/chilli` | — | Redirects to `/` |
| `/bebidas` | BeveragesPage | Drinks |
| `/carta` | — | Redirects to `/` (legacy route) |
| `/checkout` | CheckoutPage | Order form → WhatsApp |
| `/pedidos` | OrdersPage | Standalone orders view |
| `/nosotros` | AboutPage | About page |
| `/contacto` | ContactPage | Contact |
| `/admin` | AdminPage | Admin panel (auth-guarded) |
| `/admin/login` | AdminLoginPage | Supabase auth login |

Admin routes (`/admin`, `/admin/login`) render without `<Layout>`. All public routes are lazy-loaded via `React.lazy` + `Suspense`.

## Database Tables (Supabase)

| Table | Key Columns | Notes |
|---|---|---|
| `products` | id, name, brand_id, category_id, price_cents, is_active | Live catalog only renders active rows |
| `ingredients` | id, name, type, price_cents, is_active | type: base/protein/acompanante/sauce/topping |
| `bowl_rules` | size (PK), name, price_cents, bases, proteins, accompaniments | small/medium/large |
| `categories` | id, name, brand_id, slug, icon | |
| `brands` | id, name | Historical Chilli data may remain; the active frontend brand is Ohana |
| `orders` | id, customer_name, phone, order_type, address, delivery_zone, delivery_fee_cents, total_cents, status, notes | status: pending/confirmed/preparing/ready/delivered/cancelled |
| `order_items` | id, order_id, brand_id, name, quantity, unit_price_cents, details (JSON) | details holds bowl config or product_id |
| `delivery_zones` | id, name, fee_cents, is_active | |
| `settings` | key, value | e.g., `whatsapp_number`, address, hours, social links, ETA, review rating |
| `promotions` | — | active promotions surfaced on the Ohana page/admin |
| `product_default_ingredients` | — | default ingredient metadata for product customization |
| `analytics_events` | id, event_type, metadata, created_at | |
| `user_roles` | user_id, role | role = 'admin' grants admin access |

Order creation goes through the `create_order_with_items(...)` RPC (called from `CheckoutPage.tsx`) rather than raw inserts. Keep schema changes in `supabase/migrations/`; don't hand-edit `src/integrations/supabase/types.ts` unless regenerating types.

## Key Architecture

### Prices
All prices are stored and computed in **Colombian pesos as integers (cents = whole COP)**. Display via `formatPrice()` in `src/domain/formatPrice.ts`.

### Brands
The active `Brand` type in `src/types/index.ts` is `'ohana'` only. The DB tables use `brand_id` as a string FK, and historical `'chilli'` rows or names may remain, but `/chilli`, `/ohana`, and `/carta` all redirect to the Ohana home page.

### Cart
- Persists to `localStorage` with schema version `cart:v3` (key: `ohana-bowls-cart`, defined in `src/context/CartContext.tsx`); invalid/stale cart data is reset
- Split into `CartStateContext` + `CartActionsContext` for render performance
- Backward-compat `useCart()` hook combines both
- Supports two item types: `'product'` and `'custom-bowl'`
- Cart items are reconciled against the live catalog in `src/domain/cartCatalogSync.ts` so deleted/inactive products or changed bowl rules don't stay stale
- `src/hooks/use-saved-bowls.ts` persists reusable bowl configurations separately from the cart

### Bowl Builder
- Multi-step wizard: size → bases → proteins → acompanantes → salsas → complementos → summary
- Reads live data from Supabase via `useBowlRules()` and `useIngredients()` hooks
- Bowl pricing in `src/domain/bowlPricing.ts` — base price from size + extra charges for premium ingredients

### Home Hero
- `src/components/ohana/ScrollHero.tsx` drives a scroll-scrubbed bowl assembly video with staged text reveals
- The optimized video and poster live at `public/videos/bowl-hero.mp4` and `public/images/bowl-hero-poster.jpg`
- Keep the poster fallback and reduced-motion/mobile behavior intact when changing the hero

### Product Customization
- `ProductDrawer.tsx` handles product option changes using defaults from `product_default_ingredients`
- Pure customization rules live in `src/domain/productCustomizations.ts`; keep pricing and selection logic out of the UI where possible

### Order Flow
1. Customer fills checkout form (name, phone, pickup/delivery, zone)
2. Delivery zone validated against Supabase at submit time (re-fetches canonical fee)
3. Order inserted into `orders` + `order_items` tables
4. WhatsApp message generated via `src/domain/whatsapp.ts`
5. `openWhatsAppHandoff()` attempts to open WhatsApp (handles embedded/iframe contexts)
6. Fallback: copy message or direct link

### Admin Auth
- Login at `/admin/login` via `supabase.auth.signInWithPassword()`
- Checks `user_roles` table for `role = 'admin'` after login
- `useAdminAuth` hook subscribes to `onAuthStateChange` + initial session check

### Data Fetching
Catalog and business-data reads use React Query via hooks in `src/hooks/use-catalog.ts`:
- `useProducts()`, `useCategories()`, `useBrands()`
- `useIngredients()`, `useBowlRules()`
- `useActiveDeliveryZones()` — refetches every 30s, staleTime: 0 (important for live fee accuracy)
- `useBusinessSettings()` — typed wrapper around the `settings` table; covers phone, hours, social links, etc.
- Promotions, beverages, product defaults, and settings are also exposed from this module

### Cross-Tab Cache Sync
`src/hooks/use-catalog-sync.ts` keeps React Query caches in sync across browser tabs when the admin makes changes. After any admin mutation, call `useCatalogMutationSync()` with the affected table names — it invalidates/refetches locally and broadcasts via `BroadcastChannel` (falling back to `localStorage` storage events for same-origin tabs). `CatalogSyncBridge` in `App.tsx` wires up the listener side automatically.

## Important Files

```
src/
  App.tsx                    # Routes definition + CatalogSyncBridge
  types/index.ts             # All shared TypeScript types
  context/CartContext.tsx    # Cart state, localStorage persistence
  hooks/use-catalog.ts       # All Supabase data hooks
  hooks/use-catalog-sync.ts  # Cross-tab React Query cache synchronization
  hooks/use-admin-auth.ts    # Admin authentication hook
  hooks/use-add-product.ts   # Shared add-to-cart product flow
  hooks/use-order-history.ts # Customer-side recent order history
  hooks/use-saved-bowls.ts   # Persisted reusable bowl configurations
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
    admin/                   # Products, promotions, settings, and analytics management
    cart/                    # CartDrawer
    checkout/                # RecentOrders
    layout/                  # Layout, Navbar, Footer, PageHero, ErrorBoundary
    ohana/                   # BowlBuilder, PromotionsSection, ScrollHero
    products/                # ProductCard, ProductDrawer, ProductImage
  integrations/supabase/
    client.ts                # Supabase client instance
    types.ts                 # Auto-generated DB types
  lib/
    analytics.ts             # trackEvent() → analytics_events table
```

## Known Issues / Gotchas

1. **Duplicate orders views**: `/pedidos` (OrdersPage) and the "Pedidos" tab in AdminPage are separate implementations with different features. Check both flows when changing order display or status behavior.

2. **WhatsApp handoff in embedded contexts**: The `openWhatsAppHandoff()` function detects if running in an iframe/preview and falls back gracefully. Test checkout on real devices, not previews.

3. **Delivery zone re-validation**: At checkout submit, the zone is re-fetched from Supabase to get the canonical fee. If the zone was deactivated between selection and submit, the order is blocked.

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

## Gitflow Branching

- `main`: production-ready; only merge tested release/hotfix work, then deploy from here
- `develop`: integration branch; feature branches merge here first
- `feature/<short-name>`: branch from `develop`, merge back into `develop`
- `release/<version-or-date>`: branch from `develop`, merge into both `main` and `develop`
- `hotfix/<short-name>`: branch from `main` for urgent prod fixes, merge into both `main` and `develop`

Don't commit routine development directly to `main`.
