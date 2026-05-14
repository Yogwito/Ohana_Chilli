# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Ohana & Chilli — Project Guide

## Project Overview

Single-page web app serving two Colombian food brands — **Ohana** (healthy bowls) and **Chilli** (hot food) — from one React codebase. Customers browse the menu, build custom bowls, and place orders that are sent via **WhatsApp**. There is no payment processing.

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
```

Run a single test file: `npx vitest run src/test/bowl-pricing.test.ts`

## Routes

| Path | Component | Notes |
|---|---|---|
| `/` | OhanaPage | Main landing — Ohana menu + BowlBuilder |
| `/ohana` | — | Redirects to `/` |
| `/chilli` | — | Redirects to `/` |
| `/carta` | — | Redirects to `/` |
| `/bebidas` | BeveragesPage | Drinks (cross-brand) |
| `/checkout` | CheckoutPage | Order form → WhatsApp |
| `/pedidos` | OrdersPage | Admin-only order list |
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
Brand IDs are string literals `'ohana' | 'chilli'` — not UUIDs — used as foreign keys in products, categories, and order_items.

### Cart
- Persists to `localStorage` with schema version `cart:v2` (key: `ohana-chilli-cart`)
- Split into `CartStateContext` + `CartActionsContext` for render performance
- Backward-compat `useCart()` hook combines both
- Supports two item types: `'product'` and `'custom-bowl'`

### Bowl Builder
- Multi-step wizard: size → bases → proteins → acompanantes → salsas → complementos → summary
- **Currently reads from static `src/config/bowlIngredients.ts`** — NOT from Supabase ingredients table
- Bowl pricing in `src/domain/bowlPricing.ts` — base price from size + extra charges for premium ingredients
- Bowl sizes defined in `bowlIngredients.ts` take priority over `bowl_rules` DB values in the UI

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
All Supabase reads use React Query via hooks in `src/hooks/use-catalog.ts`:
- `useProducts()`, `useCategories()`, `useBrands()`
- `useIngredients()`, `useBowlRules()`
- `useActiveDeliveryZones()` — refetches every 30s, staleTime: 0 (important for live fee accuracy)
- `useWhatsAppNumber()` — stale 1 hour
- `useBusinessSettings()` — typed wrapper around the `settings` table; covers phone, hours, social links, etc.

### Cross-Tab Cache Sync
`src/hooks/use-catalog-sync.ts` keeps React Query caches in sync across browser tabs when the admin makes changes. After any admin mutation, call `useCatalogMutationSync()` with the affected table names — it invalidates/refetches locally and broadcasts via `BroadcastChannel` (falling back to `localStorage` storage events for same-origin tabs). `CatalogSyncBridge` in `App.tsx` wires up the listener side automatically.

## Important Files

```
src/
  App.tsx                    # Routes definition + CatalogSyncBridge
  types/index.ts             # All shared TypeScript types
  config/bowlIngredients.ts  # Static bowl config (sizes + ingredients) — ONLY used by BowlBuilder UI
  context/CartContext.tsx    # Cart state, localStorage persistence
  hooks/
    use-catalog.ts           # All Supabase data hooks
    use-catalog-sync.ts      # Cross-tab React Query cache invalidation
    use-admin-auth.ts        # Admin authentication hook
  domain/
    bowlPricing.ts           # Bowl price calculation
    bowlSummary.ts           # Bowl → readable string / WhatsApp text
    cartCatalogSync.ts       # reconcileCartWithCatalog() — re-prices cart items against live catalog
    businessSettings.ts      # BusinessSettings type + mapBusinessSettings() + formatting helpers
    productImages.ts         # resolveProductImageUrl() — validates/normalizes product image URLs
    deliveryZones.ts         # Zone name normalization
    formatPrice.ts           # COP price display
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

1. **BowlBuilder uses static config, not Supabase**: `src/config/bowlIngredients.ts` has hardcoded ingredients and prices. Changes in the DB `ingredients` / `bowl_rules` tables won't reflect in the BowlBuilder without updating this file or migrating it to `useBowlRules()` / `useIngredients()`.

2. **Duplicate orders views**: `/pedidos` (OrdersPage) and the "Pedidos" tab in AdminPage both show orders but are separate components with different features. OrdersPage is accessible via the public Layout; AdminPage tab also lets you update order status.

3. **WhatsApp handoff in embedded contexts**: The `openWhatsAppHandoff()` function detects if running in an iframe/preview and falls back gracefully. Test checkout on real devices, not previews.

4. **Delivery zone re-validation**: At checkout submit, the zone is re-fetched from Supabase to get the canonical fee. If the zone was deactivated between selection and submit, the order is blocked.

## Conventions

- Component files: PascalCase (`BowlBuilder.tsx`)
- Hooks: `use-kebab-case.ts`
- Domain logic: `camelCase.ts` — pure functions, no React
- All monetary values in **integer COP** (no decimals)
- Spanish UI text throughout; error messages also in Spanish
- `cn()` from `src/lib/utils.ts` for conditional Tailwind classes
- Admin-only DB operations rely on Supabase RLS — admin session is required for writes
