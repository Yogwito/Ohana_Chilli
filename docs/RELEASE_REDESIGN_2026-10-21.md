# Release redesign — 2026-10-21

Rama `release/redesign` = `origin/hotfix/checkout-legacy` (c5e6364, en producción) + solo la capa **visual** de `origin/feature/ohana-experience-redesign` (270c281).

## Qué se portó
| Archivo | Tipo | Decisión |
|---|---|---|
| `src/experience.css` (+ import en `main.tsx`) | visual | Portado + `@font-face` DM Sans / Space Grotesk **self-hosted** (`public/fonts/*-wght.woff2`, OFL) + keyframes CSS que sustituyen GSAP |
| `Navbar.tsx`, `Footer.tsx`, `PageHero.tsx`, `ui/sheet.tsx` | visual | Tomados de 270c281 (no divergían en hotfix) |
| `Layout.tsx`, `CartDrawer.tsx`, `ProductDrawer.tsx`, `PromotionsSection.tsx` | visual | Merge manual: clases/textos del redesign sobre la versión hotfix |
| `ExperienceHero.tsx` | visual | Hero estático (WebP 500×500, 40–60 KB c/u). Sin GSAP ni tilt de puntero; solo transform/opacity CSS, respeta `prefers-reduced-motion` |
| `OhanaPage.tsx` | visual + cableado | Markup del redesign recableado a los hooks del hotfix: `useProducts/useCategories/usePromotions` (`get_public_catalog`), `useAddProduct`, `ProductDrawer` lazy, `DeferredSection` para BowlBuilder y promos |
| `use-experience-motion.ts` | visual | Reescrito sin GSAP (IntersectionObserver + clase CSS) |
| `BowlBuilder.tsx` | UX | Solo el scroll de la tira de pasos (evita salto de página al montar). Precios/selección intactos. Test añadido |
| `CheckoutPage.tsx` | visual | Solo clases y encabezado (4 bloques JSX). `create_order_with_items`, `orderPayload`, validación: sin cambios |
| `BeveragesPage.tsx` | ruta | Redirige a `/#bebidas` |
| `index.html` | perf | Preload de `caribe.webp` + 2 fuentes; eliminado el póster crítico del video |

## Qué se dejó fuera / eliminado
- **ScrollHero + videos** (4 MP4, 4,2 MB) y pósters, `BrandMarquee`, `MagneticButton`, `use-gsap-reveal`, dependencia `gsap`.
- Google Fonts del redesign (sustituidas por fuentes self-hosted).
- `output/playwright/*.png`, `REDESIGN_REVIEW.md` (artefactos del autor).
- `orderPayload`, `CartContext`, checkout, `use-catalog`: se mantienen los del hotfix. El redesign no dependía de order-api ni de `/pedido/:token`.

## Riesgos
- Checkout móvil: el botón de envío deja de ser barra fija inferior; queda al final del formulario.
- `experience.css` usa `:has()` (Safari ≥ 15.4, Chrome ≥ 105); navegadores viejos verían la paleta anterior.
- `tsc` tiene 35 errores preexistentes, idénticos en hotfix (tipos generados desactualizados).
- Verificado visualmente solo con catálogo simulado; validar con datos reales en staging.

## Prueba local contra staging (zsh, un comando por paso)
```zsh
cd ~/Ohana_Chilli
```
```zsh
git fetch origin && git switch release/redesign
```
```zsh
npx supabase@latest projects api-keys --project-ref mbnedymxjplngwqkaabi -o json
```
```zsh
read -rs STAGING_ANON
```
```zsh
printf 'VITE_SUPABASE_URL=https://mbnedymxjplngwqkaabi.supabase.co\nVITE_SUPABASE_PUBLISHABLE_KEY=%s\n' "$STAGING_ANON" > .env.local
```
```zsh
grep -c naoqsypqqgjhdudenevx .env.local
```
Debe imprimir `0`. Solo si se usa una URL de BD para consultas:
```zsh
read -rs STAGING_PW
```
```zsh
case "$STAGING_DB_URL" in *naoqsypqqgjhdudenevx*) echo "ALTO: PROD";; esac
```
(Esta prueba no necesita escrituras en BD aparte de los pedidos creados desde la app.)
```zsh
npm ci
```
```zsh
npm run dev
```
Pedidos (todos deben llegar a WhatsApp con el total correcto):
1. Producto simple.
2. Producto con adicional ×2.
3. Producto con variantes.
4. Bowl con proteína, salsa y complemento extra.
5. Combo de promoción.
6. Manipulación: DevTools → Application → localStorage `ohana-chilli-cart` → cambiar `unitPrice` → recargar → enviar: debe rechazarse con "Precio no coincide" / "Total no coincide".

## Despliegue (solo con aprobación explícita del dueño)
```zsh
git switch release/redesign
```
```zsh
npm ci
```
```zsh
npm run build
```
(con las variables VITE_ de PROD en `.env.production.local`)
```zsh
grep -c mbnedymxjplngwqkaabi dist/assets/*.js
```
Todas las líneas deben ser `0`.
```zsh
npx wrangler pages deploy dist --project-name ohana-bowls --branch main
```

**Rollback:** Cloudflare → Pages → ohana-bowls → Deployments → el despliegue de c5e6364 → *Rollback*.

**Checklist post-deploy:** la home carga sin video y con el hero estático; el menú muestra productos reales; armar un bowl funciona; carrito; el checkout crea el pedido (`create_order_with_items`) y abre WhatsApp con el total correcto; `/bebidas`, `/nosotros`, `/contacto` y `/admin/login` responden; modo oscuro; Lighthouse móvil igual o mejor que antes.
