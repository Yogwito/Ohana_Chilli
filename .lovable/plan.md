
Objetivo: corregir el flujo de “Enviar Orden por WhatsApp” para que funcione de verdad end-to-end y no dependa de un `window.open()` disparado después de operaciones async, que hoy el navegador puede bloquear.

1. Hallazgo principal
- El problema más probable no es el botón visual, sino el momento en que se intenta abrir WhatsApp.
- En `src/pages/CheckoutPage.tsx`, el submit:
  - valida formulario
  - guarda `orders`
  - guarda `order_items`
  - genera URL
  - recién al final ejecuta `tryOpenWhatsApp(url)`
- En `src/domain/whatsapp.ts`, `tryOpenWhatsApp()` usa `window.open(url, '_blank')`.
- Como esa apertura ocurre después de `await` a la base de datos, muchos navegadores la tratan como popup no iniciado directamente por el gesto del usuario y la bloquean. Eso explica “el botón no funciona”.
- Además, en el replay se ve que el usuario intentó enviar con campos inválidos y aparecieron errores de validación; o sea, hoy hay dos posibles bloqueos: validación y popup blocker.

2. Qué voy a implementar
- Reestructurar el submit para separar claramente:
  1) validación del formulario
  2) persistencia del pedido
  3) handoff a WhatsApp sin depender de popup
- Cambiar el mecanismo de apertura:
  - Opción preferida: usar navegación directa (`window.location.href` / `location.assign`) en la misma pestaña después de crear el pedido, en vez de `window.open`.
  - Mantener fallback robusto con botón visible “Abrir WhatsApp” y “Copiar mensaje”.
- Mejorar estados UX:
  - mostrar error de validación arriba del formulario cuando falten datos
  - mostrar estado “Pedido creado, abre WhatsApp para enviarlo” si no se puede redirigir automáticamente
  - no dejar la percepción de que el botón “no hace nada”
- Revisar que el botón quede siempre con `type="submit"` y que no haya acciones secundarias dentro del formulario disparando submits accidentales.
- Corregir accesibilidad del dialog en `ProductCard.tsx` para eliminar el warning de `DialogDescription` faltante cuando aplique.

3. Orden de trabajo propuesto
- Paso A: auditar el flujo exacto de submit y estados del checkout
- Paso B: reemplazar la estrategia de apertura de WhatsApp por una que no dependa de popup async
- Paso C: endurecer feedback visual y mensajes de error
- Paso D: revisar botones internos del checkout para evitar submits involuntarios
- Paso E: validar manualmente pickup + delivery + fallback

4. Resultado esperado
- Si el formulario es inválido: el usuario ve claramente por qué no envía.
- Si el pedido se crea correctamente: WhatsApp se abre o redirige de forma confiable.
- Si no se puede abrir automático: queda una pantalla de éxito con CTA explícito para abrir/copy, sin sensación de bloqueo.
- El flujo pickup y domicilio sigue guardando el pedido antes del handoff.

5. Detalles técnicos
```text
Problema actual
Click submit
  -> await insert orders
  -> await insert order_items
  -> window.open(...)
  -> navegador puede bloquear popup

Flujo nuevo
Click submit
  -> validar
  -> guardar pedido
  -> generar mensaje
  -> redirigir a wa.me en misma pestaña o mostrar CTA explícito
```

Archivos a tocar:
- `src/pages/CheckoutPage.tsx`
- `src/domain/whatsapp.ts`
- posiblemente `src/components/ui/*` o `ProductCard.tsx` para el warning de accesibilidad

Riesgos a controlar:
- no perder el `orderId` ni el mensaje al cambiar de estado
- no limpiar el carrito antes de asegurar que el pedido quedó persistido
- mantener fallback usable en móvil y desktop
