# Fuente de verdad del catalogo y precios

## Fotos de la landing

Las tres fotos del hero (Caribe, Veggie y Paisa) son imágenes ilustrativas regeneradas con IA a partir de las fotos anteriores. Se guardan en `public/images/experience/*-hq.webp` (1254 × 1254); los originales se conservan. Prompts y procedencia: [docs/landing-photo-prompts.md](docs/landing-photo-prompts.md). Esta actualización no modifica las fotos ni los datos del catálogo en Supabase.

## Fotos estandarizadas del menú

Los 35 productos visibles utilizan imágenes ilustrativas regeneradas en formato 4:3, WebP de 1200 × 900, bajo `public/images/menu/`. `src/domain/menuImages.ts` asigna cada archivo al ID del producto y tiene prioridad sobre `image_url`; al reemplazar fotos desde admin, también se debe actualizar o retirar la asignación local. Las tarjetas, el detalle y los extras del bowl comparten el resolvedor. No se modificaron precios, recetas ni registros de Supabase. Prompts y procedencia: [docs/menu-photo-refresh.md](docs/menu-photo-refresh.md).

## Regla unica

Todos los precios del sitio se manejan como `pesos enteros`.

Ejemplos validos:

- `23900`
- `5000`
- `9800`

No se convierten a centavos reales en frontend. Los nombres legacy como `price_cents`, `fee_cents`, `unit_price_cents` y `total_cents` siguen existiendo en base de datos, pero en la practica almacenan pesos enteros.

## Fuente de verdad

La fuente unica de verdad para catalogo y precios visibles del sitio es Supabase:

- `products.price_cents`
- `ingredients.price_cents`
- `bowl_rules.price_cents`
- `delivery_zones.fee_cents`

Las paginas publicas consumen esos valores desde:

- `src/hooks/use-catalog.ts`

El admin edita esos mismos registros directamente en Supabase desde:

- `src/pages/AdminPage.tsx`

## Flujo esperado

1. Admin actualiza precio en Supabase.
2. Hooks publicos leen ese precio activo.
3. Product card usa ese mismo valor.
4. Carrito guarda ese mismo valor sin multiplicarlo.
5. Checkout envia ese mismo valor en el payload.
6. WhatsApp formatea ese mismo valor.

## Formato UI

Auditoría de ingredientes visibles en las imágenes: [docs/menu-ingredient-audit.md](docs/menu-ingredient-audit.md). El queso rallado del constructor tiene fotografía propia, distinta de la salsa de queso. La composición del bowl Veggie está pendiente de confirmación porque su descripción solo enumera cantidades personalizables.

Todas las vistas deben formatear precios con:

- `src/domain/formatPrice.ts`

Nunca se debe multiplicar por 100 ni dividir por 100 en frontend para productos, bowls, ordenes o domicilios.
