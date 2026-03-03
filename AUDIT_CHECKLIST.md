# Audit Checklist — Full E2E Verification

## 1. Build & Dev
- [x] `npm install` — sin errores
- [x] `npm run build` — compila sin errores ni warnings de TypeScript
- [x] `npm run dev` — arranca correctamente en localhost

## 2. Base de datos (Supabase)
- [x] Tabla `brands` existe con `ohana` y `chilli`
- [x] Tabla `categories` tiene 10 categorías (5 chilli, 5 ohana incl. bebidas)
- [x] Tabla `products` tiene 30 productos activos (6 ohana, 14 chilli, 10 bebidas)
- [x] Tabla `ingredients` tiene 28 ingredientes activos (5 base, 6 protein, 12 acomp, 5 sauce)
- [x] Tabla `bowl_rules` tiene 3 tamaños (small/medium/large)
- [x] Tabla `settings` tiene `whatsapp_number = 573215667170`
- [x] Tabla `delivery_zones` existe con RLS (public read active, admin CRUD)
- [x] Tabla `orders` tiene columnas `delivery_zone` y `delivery_fee_cents`
- [x] Tabla `order_items` existe con RLS (public insert, admin read)
- [x] Tabla `user_roles` existe con `has_role()` function

## 3. Rutas clave
- [ ] `/` — Hero con cards Ohana/Chilli, productos destacados, bebidas preview
- [ ] `/ohana` — Tab "Bowls sugeridos" muestra 6 bowls de `ohana-premade`; tab "Arma tu Bowl" funciona
- [ ] `/chilli` — Filtro por categoría, muestra 14 productos de 5 categorías
- [ ] `/bebidas` — Filtro por categoría, muestra 10 bebidas (sodas/jugos/agua)
- [ ] `/checkout` — Carrito vacío → redirige; con items → formulario completo
- [ ] `/admin/login` — Login email/password funciona
- [ ] `/admin` — Panel con tabs: Pedidos, Productos, Ingredientes, Bowl Rules, Domicilios, Config

## 4. Escenarios funcionales
- [ ] **Agregar producto Ohana**: Ir a `/ohana`, click "Agregar" en un bowl → toast + badge carrito
- [ ] **Agregar producto Chilli**: Ir a `/chilli`, click "Agregar" en un burger → toast + badge carrito
- [ ] **Agregar bebida**: Ir a `/bebidas`, click "Agregar" → toast + badge carrito
- [ ] **Armar bowl custom**: `/ohana` → "Arma tu Bowl" → seleccionar tamaño, bases, proteínas, acompañantes → "Agregar al carrito"
- [ ] **Checkout pickup**: Ir a `/checkout`, llenar nombre + teléfono, seleccionar "Recoger" → "Enviar Orden" → orden persistida en DB + WhatsApp open/fallback
- [ ] **Checkout delivery**: Seleccionar "Entrega", escribir dirección, seleccionar barrio/zona del datalist → domicilio se suma al total → enviar
- [ ] **WhatsApp fallback**: Si popup bloqueado → botones "Reintentar" y "Copiar mensaje" visibles
- [ ] **Editar carrito en checkout**: +/- cantidad, eliminar item, total se actualiza
- [ ] **Persistencia carrito**: Agregar items, recargar página → items siguen ahí (localStorage cart:v1)

## 5. Bugs corregidos en esta auditoría
| Bug | Causa | Fix |
|-----|-------|-----|
| OhanaPage no mostraba bowls | `categoryId: 'ohana-bowls-sugeridos'` inexistente | Cambiado a `'ohana-premade'` |
| BeveragesPage vacía | Slug filter `bebidas%,cafe%` no matcheaba `sodas,juices,water` | Agregados slugs exactos al filtro |
| `delivery_zones` table missing | Nunca se creó la migración | Creada tabla con RLS |
| `orders` insert fallaba | Columnas `delivery_zone` y `delivery_fee_cents` no existían | Agregadas con ALTER TABLE |
| App.tsx ruta fantasma | Línea 45 `<Route element={<Layout>...}>` sin path ni children | Eliminada |
| `src/data/products.ts` dead code | Legacy data no usado (todo viene de Supabase) | Documentado en MENU_SOURCE.md |
