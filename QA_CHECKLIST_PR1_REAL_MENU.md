# QA Checklist - PR1 Real Menu Migration

## Data migration
- [ ] Ejecutar migración `20260302113000_sync_real_menu_from_pdfs.sql` sin errores.
- [ ] Verificar que categorías de Ohana y Chilli coinciden con la carta real.
- [ ] Verificar que `products` quedó alineado a la carta (sin productos legacy).
- [ ] Verificar que `bowl_rules` quedó en: Pequeño `23900`, Mediano `27900`, Grande `32900`.
- [ ] Confirmar validaciones de migración: categorías principales con productos, sin `price_cents = 0`, sin duplicados por `(brand_id, category_id, name)`.

## Navegación
- [ ] Entrar a `/ohana` y ver productos en `Bowls sugeridos`.
- [ ] Entrar a `/ohana` pestaña `Arma tu Bowl` y validar reglas/tamaños.
- [ ] Entrar a `/chilli` y validar categorías: Burgers, Fries/Salchipapas, Hot Dogs, Mazorcadas/Corn bowls, Nachos, Combos, Bebidas/Café.
- [ ] Entrar a `/bebidas` y validar que aparecen bebidas/café de Ohana y Chilli.

## Carrito y checkout
- [ ] Agregar un producto Ohana y validar precio en carrito.
- [ ] Agregar un producto Chilli y validar precio en carrito.
- [ ] Agregar una bebida y validar precio en carrito.
- [ ] Ir a checkout y confirmar que subtotal/total reflejan los `price_cents` de la carta.
- [ ] Completar flujo de pedido de prueba (sin enviar real) y revisar payload de `orders/order_items`.
