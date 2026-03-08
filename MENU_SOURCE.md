# Fuente de verdad del catálogo

## Fuente principal: Supabase (Lovable Cloud)

Todas las páginas públicas (`/ohana`, `/chilli`, `/bebidas`, `/`) obtienen datos de las tablas de Supabase via React Query hooks en `src/hooks/use-catalog.ts`:

| Dato | Tabla Supabase | Hook |
|------|---------------|------|
| Productos | `products` | `useProducts()`, `useFeaturedProducts()`, `useBeverages()` |
| Categorías | `categories` | `useCategories()`, `useBeverageCategories()` |
| Ingredientes | `ingredients` | `useIngredients()` |
| Reglas de bowl | `bowl_rules` | `useBowlRules()` |
| Número WhatsApp | `settings` | `useWhatsAppNumber()` |
| Zonas de delivery | `delivery_zones` | `useActiveDeliveryZones()` |

## Archivo legacy: `src/data/products.ts`

Este archivo contiene datos hardcoded que se usaban **antes** de la migración a Supabase. **Ya no es la fuente de verdad** — ninguna página pública lo importa.

Se mantiene temporalmente como referencia/respaldo. Para eliminarlo:
1. Verificar que ningún import lo referencie: `grep -r "from.*data/products" src/`
2. Si no hay imports, eliminar el archivo.

## Imágenes

Las imágenes de productos se almacenan en el campo `image_url` de la tabla `products`. El campo `imageUrl` del tipo `Product` lo mapea directamente. Si un producto no tiene imagen asignada, el campo será `undefined` y la UI no renderiza imagen (diseño texto-only por defecto).
