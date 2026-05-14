# Repository Guidelines

## Project Structure & Module Organization
The app is a Vite + React + TypeScript frontend. Main code lives in `src/`:
- `src/pages/` route-level screens
- `src/components/` shared UI, layout, admin, cart, and product components
- `src/domain/` business logic such as pricing, WhatsApp formatting, and delivery zones
- `src/hooks/`, `src/context/`, `src/lib/`, and `src/types/` for shared behavior and types
- `src/integrations/supabase/` for generated Supabase client/types

Static assets live in `public/`. Database work belongs in `supabase/migrations/`. Root-level checklists such as `QA_CHECKLIST_DELIVERY_ZONES.md` and `QA_CHECKLIST_PR1_REAL_MENU.md` should be updated or referenced when menu or delivery behavior changes.

## Build, Test, and Development Commands
- `cp .env.example .env`: copy env vars (required for Supabase client)
- `npm i`: install dependencies
- `npm run dev`: start the local Vite dev server
- `npm run build`: create a production build in `dist/`
- `npm run build:dev`: build with development mode settings
- `npm run lint`: run ESLint across the repo
- `npm test`: run the Vitest suite once
- `npm run test:watch`: run Vitest in watch mode

## Coding Style & Naming Conventions
Use TypeScript for app code and keep 2-space indentation. Follow nearby file style for quotes and JSX formatting; this repo is not fully auto-formatted. Use PascalCase for React components and page filenames (`CheckoutPage.tsx`), `use-*` names for hooks (`use-catalog.ts`), and camelCase for domain utilities (`formatPrice.ts`). Prefer the `@/` alias for imports from `src/`.

Do not hand-edit generated Supabase client/types files unless the generation step is part of the change.

## Testing Guidelines
Vitest runs in `jsdom` with Testing Library and setup in `src/test/setup.ts`. Name tests `*.test.ts` or `*.test.tsx`; colocated tests under `src/` are supported, and shared regression tests already live in `src/test/`. Add or update tests for domain logic, delivery rules, and route behavior when fixing bugs.

## Commit & Pull Request Guidelines
Recent commits use short, focused subjects such as `Bowl builder` and `whatsapp sent fixed`. Keep commit messages brief, imperative, and scoped to one change. PRs should include:
- a short summary of user-facing changes
- linked issue or task, if available
- screenshots for UI changes
- notes for new env vars, Supabase migrations, or CSV/data updates
- the commands you ran (`npm run lint`, `npm test`, `npm run build`)

## Gitflow Branching
Use Gitflow consistently for ongoing work:
- `main`: production-ready branch. Only merge tested release or hotfix work here, then deploy from this branch.
- `develop`: integration branch for completed work before release. Feature branches should merge here first.
- `feature/<short-name>`: new features or non-urgent fixes. Branch from `develop`, then merge back into `develop`.
- `release/<version-or-date>`: final stabilization before production. Branch from `develop`, test and fix release-only issues, then merge into both `main` and `develop`.
- `hotfix/<short-name>`: urgent production fixes. Branch from `main`, then merge into both `main` and `develop`.

Do not commit routine development directly to `main`. Keep branch names lowercase, hyphen-separated, and focused on one change.
