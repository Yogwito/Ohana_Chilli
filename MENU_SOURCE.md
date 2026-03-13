# Fuente de verdad del catalogo y precios

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

Todas las vistas deben formatear precios con:

- `src/domain/formatPrice.ts`

Nunca se debe multiplicar por 100 ni dividir por 100 en frontend para productos, bowls, ordenes o domicilios.
