# Auditoría de lógica de Arma tu bowl

Actualización: los hallazgos se corrigieron según las decisiones acordadas. Véase [correcciones y verificación](bowl-logic-fixes.md). El contenido siguiente documenta el estado previo.

Revisión del código local el 5 de octubre de 2026. No se modificó el comportamiento durante esta auditoría. Dos escenarios se reprodujeron con pruebas temporales de Vitest; se eliminaron después de ejecutarlas. La revisión no valida pedidos reales ni reglas comerciales no documentadas.

## Errores

1. **Crítico: bowls con extras desaparecen al reconciliar el carrito.** BowlBuilder crea ingredientes con IDs extra-*, extra-acomp-*, extra-sauce-* y extra-comp-* (líneas 179–234). cartCatalogSync exige que cada ID exista en el catálogo (líneas 17–20), y descarta el bowl entero si no existe uno. CartContext reconcilia al cargar o actualizar el catálogo. Reproducción: bowl de 23900 con proteína extra de 5000 -> carrito vacío tras reconcileCartWithCatalog. Resolver con extras explícitos que mantengan referencia al ingrediente y a la regla de precio; no aceptar IDs desconocidos indiscriminadamente.

2. **Alto: confirmación sin acompañantes obligatorios.** En Extras, Quitar puede eliminar ingredientes incluidos (BowlBuilder 1499), pero Continuar solo valida el paso actual y handleSubmit solo verifica que exista previewBowl (539). Reproducción: elegir Guacamole como acompañante requerido, quitarlo en Extras, continuar y confirmar -> acompanantes vacío. Validar todas las secciones al confirmar y retornar al paso incompleto.

3. **Alto: favoritos obsoletos.** loadSavedBowl (482) carga objetos completos, incluido tamaño/precio y los ingredientes antiguos, y salta al resumen sin consultar catálogo actual. Puede mostrar precios anteriores y aceptar ingredientes desactivados; la reconciliación posterior puede cambiar precio o eliminar el pedido. Reconciliar antes de mostrar y confirmar.

4. **Alto: extras guardados vuelven como incluidos.** previewBowl mezcla extras sintéticos con ingredientes normales, pero loadSavedBowl restaura toda la lista como selectedProteins/selectedAcompanantes/etc. y vacía los estados de extras. El precio sintético puede conservarse, pero su cantidad cuenta como incluida, pierde el control de extra y puede superar límites. Guardar/restaurar incluidos y extras por separado.

5. **Medio: favorito hereda bebidas de otra configuración.** loadSavedBowl no limpia selectedDrinks. Si se selecciona una bebida, se vuelve a Tamaño y se carga un favorito, esa bebida pendiente permanece y se añade al confirmar. Los favoritos tampoco guardan bebidas. Limpiar explícitamente o definir que el favorito incluye todo el pedido.

6. **Medio: precio oculto en sugerencias de salsas/complementos.** Los botones de sugerencia muestran solo nombre; cuando el cupo está lleno añaden salsa por 2000 o complemento por 500 (o precio configurado). El usuario conoce el cargo después de pulsar. Mostrar el cargo efectivo antes del clic.

7. **Medio: Quitar en Extras elimina todas las unidades.** removeUpsellIngredient usa filter para incluidos y extras; si hay tres Guacamoles, elimina los tres en un clic. Puede vaciar una sección obligatoria. Usar control de cantidad o etiquetar claramente Quitar todas las porciones.

8. **Medio: límites modificados no se validan en el carrito.** cartCatalogSync actualiza regla/precio pero no verifica mínimos, máximos o tipo de ingredientes. Si se reducen cupos, conserva una configuración que ya no cumple la regla. Validar estructura, separando las porciones pagadas de las incluidas.

9. **Medio: almacenamiento de favoritos sin validación estructural.** readStorage acepta cualquier JSON parseable como SavedBowl[]. Por ejemplo {} hace fallar el uso de savedBowls.map; una configuración incompleta también puede fallar al cargarla. Validar esquema/versionado y recuperar datos válidos.

## Ambigüedades comerciales y de interacción

10. **Tarifas con varias fuentes.** Proteína extra tiene referencia 5000; acompañantes extra anuncian 3000; el paso final usa 2000 para acompañantes gratuitos sin cupo. Complementos usan 500 o la tarifa del ingrediente/premium. No es demostrable que los importes sean comercialmente incorrectos sin una regla acordada, pero la experiencia no explica esas diferencias. Centralizar tarifas y determinar si cambian por ingrediente o por tamaño.

11. **Premium concreto o cupo genérico.** Todos los ingredientes con precio positivo se convierten en disparadores de un selector de ingredientes gratuitos en Proteínas/Acompañantes/Complementos. Si un premium es un alimento específico, pulsarlo puede terminar agregando otro ingrediente al precio del primero. Confirmar que los registros premium sean exclusivamente cupos genéricos; separar ambos conceptos en el modelo.

12. **Total con bebidas frente a Total del bowl.** El resumen añade Total con bebidas, pero el bloque principal, panel móvil y toast muestran totalPrice sin bebidas. El cobro suma los productos por separado, pero el texto Total puede resultar ambiguo. Mostrar subtotales y un único total de la selección.

13. **Saltar Extras conserva la selección.** Saltar este paso y Continuar ejecutan goNext; ninguno limpia extras o bebidas. Aclarar si Saltar quiere decir continuar sin agregar nada más o descartar lo seleccionado, y ajustar texto/comportamiento.

14. **Porciones obligatorias frente a límites máximos.** Bases, proteínas y acompañantes usan min=max. El cliente debe llenar todos los cupos, aunque los campos se llaman max*. Salsas y complementos sí son opcionales. Confirmar si se debe permitir pedir menos ingredientes sin descuento.

15. **Cambiar tamaño descarta todo.** Cambiar a otro tamaño limpia ingredientes, extras, notas y bebidas sin aviso; repetir tamaño conserva la selección. Definir si se conserva y adapta la receta o si se informa antes de reiniciar.

16. **Repeticiones y catálogo incompleto.** Acompañantes permiten máximo tres por ingrediente, aunque el texto general permite repetir hasta el límite total. Si hay pocas opciones activas y el tamaño requiere más porciones de las que se pueden escoger, el usuario queda bloqueado. Validar viabilidad de reglas y comunicar el límite por ingrediente.

17. **Oferta final limitada.** Extras solo ofrece cinco ingredientes buscados por nombres parciales y las primeras seis bebidas. Puede ocultar opciones válidas o seleccionar una variante equivocada si cambia el nombre. Relacionar ofertas por IDs/metadatos y aclarar que son sugerencias, con acceso al resto del catálogo.

## Evidencia y cobertura

Las dos reproducciones críticas pasaron dentro de una ejecución temporal de seis pruebas (cuatro existentes y dos diagnósticas). Las 32 pruebas existentes habían pasado antes de esta revisión, pero no cubrían estos escenarios. Hallazgos restantes verificados por lectura de rutas de estado/cálculo; las consecuencias dependientes de cambios de catálogo o reglas comerciales se indican como tales.

Orden sugerido: persistencia de extras -> validación completa al confirmar -> favoritos y reconciliación -> precios antes del clic -> reglas comerciales y textos.
