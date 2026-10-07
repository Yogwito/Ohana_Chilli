# Corrección de Arma tu bowl — 6 de octubre de 2026

## Reglas acordadas

Una base y una proteína como mínimo; acompañantes, salsas y complementos opcionales. Pedir menos no reduce el precio. Las porciones incluidas respetan los máximos por tamaño y tres porciones del mismo acompañante. Cambiar tamaño conserva receta, notas, extras y bebidas y exige ajustar excesos sin convertirlos automáticamente en cargos.

Se mantienen los importes: proteína genérica 5000, acompañante genérico 3000, acompañante gratuito sin cupo desde Extras 2000, salsa 2000, complemento 500; los precios configurados y tarifas genéricas vigentes tienen prioridad. Las bases pagadas conservan su cupo de base y recargo. Queso frito y Croqueta veggie se agregan directamente; los IDs de adicionales genéricos abren un selector.

## Datos y compatibilidad

CustomBowl.extras guarda ingrediente real, cantidad, origen de tarifa, tariffId cuando corresponde y precio unitario. Los incluidos permanecen en sus listas; se eliminan los ingredientes ficticios. El cálculo y la validación son compartidos por builder, favoritos, reconciliación, carrito y checkout.

Carrito cart:v4 admite cart:v3 sin borrar el pedido. Favoritos saved:v2 admite arrays anteriores y descarta entradas estructuralmente corruptas. Configuraciones malformadas del carrito permanecen como recetas pendientes de reconstrucción. Extras antiguos se migran solo si ingrediente y tarifa pueden identificarse sin ambigüedad; se actualizan contra el catálogo. Los no identificables requieren quitar y elegir nuevamente. Favoritos guardan receta y notas, nunca bebidas.

La actualización del catálogo conserva bowls inválidos y los marca; bloquea checkout hasta editar o quitar. Editar reemplaza el bowl y mantiene su cantidad en el carrito. addBowlOrder agrega o reemplaza bowl y bebidas en una única acción del reducer. El builder y checkout verifican el catálogo antes de confirmar; un cambio de tarifa solicita revisar el nuevo precio. Se bloquean controles durante la verificación del builder para evitar cambios simultáneos.

Sin migraciones de Supabase ni cambios de precios remotos. El JSON de details de order_items ahora incluye extras con nombres, cantidades y cargos. WhatsApp comparte el desglose y respeta la cantidad de bowls.

## Resolución del informe original

| Hallazgo | Corrección |
|---|---|
| 1: extras desaparecen | Referencias reales y reconciliación de extras separada |
| 2: bowl incompleto | Validación global antes de confirmar; nuevos mínimos acordados |
| 3: favoritos obsoletos | Reconciliar al cargar y verificar antes de confirmar |
| 4: extras pasan a incluidos | Modelo separado y migración conservadora |
| 5: bebidas heredadas | Limpiar bebidas al cargar favoritos |
| 6: precios ocultos | Cargo efectivo antes del clic |
| 7: quitar todas las porciones | Quitar una unidad; control por cantidad |
| 8: límites modificados | Marcar excesos y bloquear confirmación |
| 9: JSON de favoritos sin validar | Validación estructural, versión y recuperación de entradas válidas |
| 10: tarifas distintas | Conservar importes por origen; centralizar y explicar el cargo |
| 11: premium concreto/genérico | Ingredientes concretos directos; adicionales genéricos con selector |
| 12: totales ambiguos | Subtotal bowl, bebidas y total a agregar |
| 13: saltar conserva selección | Único botón Continuar al resumen |
| 14: llenar cupos obligatoriamente | Solo una base y proteína obligatorias |
| 15: cambio de tamaño destructivo | Conservar y validar |
| 16: repeticiones/catálogo inviable | Límite explícito de tres; bloquear tamaños sin mínimos viables |
| 17: oferta arbitraria | Mostrar todas las opciones activas y todas las bebidas |

## Verificación

- 54 pruebas aprobadas, incluidos regresiones de builder, persistencia, migración, tarifas, límites, favoritos, resúmenes y WhatsApp.
- ESLint de archivos modificados y npm run build correctos; git diff --check correcto.
- TypeScript del proyecto sigue fallando por errores preexistentes de tipos Supabase/admin/ProductDrawer/CheckoutPage. No hay errores en el nuevo modelo, builder, contexto o reconciliación. No se editaron tipos Supabase generados.
- Navegador sobre compilación de producción: arroz + Pollo al Panko incluido + proteína adicional + Queso frito + Bretaña = 39900; tras recargar permanecen los extras y total.
- Checkout simulado con dos Bretañas: total44900; bowl34900 con cargos5000+6000 y bebida cantidad2 a5000. RPC interceptada y window.open bloqueado: no se creó orden real ni se envió WhatsApp. Payload guardado en output/playwright/bowl-fixed-mock-order.json.
- Capturas móviles del resumen, carrito y checkout y captura de escritorio en output/playwright/bowl-fixed-*.png.

Cambios locales en la rama feature existente, sin publicar.
