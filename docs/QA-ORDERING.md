# Matriz de QA manual — flujo de pedidos

Ejecutar en: **Android (Chrome)** · **iPhone (Safari)** · **Desktop (Chrome y Safari)**.
Marcar cada celda por dispositivo. Datos de prueba: usar pedidos con nombre
"QA Test" para poder identificarlos y cancelarlos en el admin.

## 1. Catálogo normal
- [ ] Producto simple (ej. hamburguesa) abre el drawer con removibles + adicionales + nota.
- [ ] Adicional repetido (Tocineta x2) multiplica el precio y aparece "Tocineta x2" en carrito.
- [ ] Producto de "Adicionales" (ej. Guacamole) se agrega directo, sin drawer.
- [ ] Precio mostrado = precio de Supabase (verificar contra admin).

## 2. Bebidas con variantes
- [ ] Hatsu (400 ml) NO se puede agregar sin elegir sabor (botón bloqueado con "Elige un sabor").
- [ ] Los 9 sabores de Hatsu Tea aparecen; los 4 de Hatsu Soda en Soda Hatsu.
- [ ] Bebida sin variantes (Bretaña, Coca-Cola) se agrega directo sin selector vacío.
- [ ] 1 Hatsu Verde + 1 Hatsu Rojo = 2 líneas separadas en el carrito.
- [ ] 2x Hatsu Rojo = 1 línea con cantidad 2.
- [ ] El sabor aparece en el carrito, en el checkout y en el mensaje de WhatsApp ("Sabor: …").

## 3. Combos
- [ ] "Papas + Hatssu" exige sabor de té; "Papas + Soda Hatsu" exige sabor de soda.
- [ ] "Papas + Gaseosa 250" exige elegir Cocacola original / Zero.
- [ ] "Papas + Bretaña" y "Papas + Cerveza" se agregan sin selector (cerveza: variantes pendientes).
- [ ] Configuraciones distintas de combo = líneas separadas; idénticas = merge.

## 4. Bowls
- [ ] Bowl sugerido (PAISA) permite quitar ingredientes propios y agregar adicionales.
- [ ] Bowl Builder: intentar "Siguiente" con proteínas incompletas muestra el aviso ámbar con el
      número exacto de faltantes y exige "Continuar de todos modos".
- [ ] Pollo al panko x2 consume 2 slots de proteína.
- [ ] Extras premium (Proteína adicional 5000, Croqueta veggie 5000, Queso frito 6000,
      Papas base 6000, Acompañante 3000, Salsa 2000) se reflejan en tiempo real.
- [ ] Dos bowls idénticos se mergean en una línea con cantidad 2.

## 5. Carrito
- [ ] Editar (lápiz) un producto reabre el drawer prellenado; guardar recalcula precio e identidad.
- [ ] Editar hasta igualar otra línea → se fusionan preservando cantidades.
- [ ] Recarga de página / cerrar y abrir navegador: el carrito persiste.
- [ ] Desactivar un producto desde el admin (otra pestaña) → toast de aviso y el item desaparece;
      NO se muestra como "Agotado".
- [ ] Cambiar un precio desde el admin → toast "Actualizamos los precios…".
- [ ] Login/logout del admin no borra el carrito del cliente.

## 6. Checkout
- [ ] Pickup: sin dirección/zona; total = subtotal.
- [ ] Delivery: zona obligatoria, tarifa canónica de Supabase; total = subtotal + domicilio.
- [ ] Item con sabores agregado ANTES de la actualización (sin sabor) → checkout lo bloquea con
      mensaje accionable, no error genérico.
- [ ] Métodos de pago: efectivo, transferencia y Wompi (tarjeta) seleccionables.
- [ ] El carrito solo se limpia después de "Pedido creado".
- [ ] Si la RPC falla (ej. desactivar el producto justo antes de enviar), NO se abre WhatsApp
      y el carrito se conserva.
- [ ] UI distingue "Pedido creado ✓ (ref)" de "abrir WhatsApp"; nunca dice "mensaje enviado".
- [ ] Fallback: copiar mensaje funciona si WhatsApp no abre.
- [ ] Mensaje de WhatsApp incluye: ref, cliente, teléfono, tipo, pago, dirección+barrio+domicilio
      (delivery), items con cantidades, sabores, adicionales xN, "Sin: …", config de bowl,
      notas por item, subtotal, domicilio y TOTAL.

## 7. Admin
- [ ] Tab "Variantes": agregar un sabor a un producto (ej. Hit cuando se defina) y verlo en la
      tienda pública SIN recargar (sync entre pestañas).
- [ ] Desactivar un sabor → desaparece del selector público al instante.
- [ ] Tab "Variantes" → Adicionales: cambiar precio de Tocineta → el drawer público lo refleja
      y una orden con el precio viejo es rechazada por el servidor.
- [ ] Ingredientes: activar/desactivar se refleja en el Bowl Builder.
- [ ] Pedidos: la orden de prueba aparece con método de pago persistido.

## 8. Seguridad (spot-check técnico)
- [ ] Desde la consola del navegador, `supabase.from('orders').insert(...)` es rechazado (RLS).
- [ ] Repetir la RPC con `unit_price_cents` alterado → error "Precio no coincide".
