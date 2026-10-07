# Rediseño de Arma tu bowl — 6 de octubre de 2026

El builder organiza nueve pasos, con Bebidas antes de Resumen, y conserva las reglas comerciales existentes. El cambio organiza las selecciones alrededor de una receta que se puede editar sin perder ingredientes, notas o bebidas pendientes.

- Escritorio desde 1024 px: opciones en la columna principal y receta lateral de 320 px, con desplazamiento propio si excede el alto disponible.
- Móvil y tablet: selector compacto de pasos, receta desplegable y barra persistente con total y acciones. Los controles respetan la cabecera, la navegación inferior y el área segura.
- Tamaños en tarjetas pastel con precio e inclusiones legibles. Únicamente estas tarjetas usan ilustraciones SVG; no se muestran fotos en el builder.
- Ingredientes y bebidas en filas con cantidades y estados de selección. Los cupos completos se distinguen de las porciones adicionales pagadas.
- Extras agrupados por categoría en acordeones, con cantidades visibles al cerrar cada grupo. Las bebidas permanecen separadas.
- Resumen editable por categoría, con cargos calculados por `getBowlChargeLines` y total calculado por `calculateBowlPrice`. No se modifican modelos persistidos, APIs, Supabase ni tarifas.
- La navegación distingue paso activo, visitado y pendiente de revisión. Se utiliza una navegación de botones en escritorio y un selector nativo en móvil, con foco y etiquetas accesibles.
- La sección introductoria conserva el título de marca y elimina la fila decorativa que duplicaba los pasos.

## Validación

- `npm test`: 60 pruebas correctas. Se volvió a ejecutar el builder tras los últimos ajustes de presentación: 14 pruebas correctas.
- `npm run build`: correcto.
- ESLint de `BowlBuilder.tsx` y `OhanaPage.tsx`, y `git diff --check`: correctos.
- El chequeo global de TypeScript conserva errores anteriores en Supabase, administración, ProductDrawer y CheckoutPage. No presenta errores en los archivos de este rediseño.
- Navegador real a 360, 390, 768 y 1280 px: sin desbordamiento horizontal, sin fotos y navegación de pasos visible bajo la cabecera.
- Revisados modo oscuro y movimiento reducido.
- Bowl de prueba: pequeño + arroz blanco + pollo al panko + cerdo adicional ($5.000) + queso frito ($6.000) + Bretaña ($5.000). Total de selección y carrito: $39.900.
- Guardar y volver a cargar el favorito conserva receta y notas; las bebidas no forman parte del favorito, como antes.
- Editar desde el carrito conserva dos unidades del bowl, la nota y una bebida existente; total comprobado: $74.800. Solo se modificó el carrito local del navegador de prueba; no se crearon pedidos.

## Capturas

En `output/playwright/`: `bowl-redesign-{360,390,768,1280}.png`, `bowl-redesign-sizes-desktop.png`, `bowl-redesign-recipe-mobile.png`, `bowl-redesign-summary-mobile.png` y `bowl-redesign-dark-{desktop,mobile}.png`.

Cambios locales, sin publicación ni migraciones.

## Optimización móvil con revisión paralela

Tres agentes revisaron presentación, interacción y rendimiento. Los botones del pie admiten textos largos a 320 px; los favoritos se ajustan con nombres largos; los campos usan 16 px para evitar zoom automático en iOS. Las recomendaciones se apilan en pantallas estrechas y los selectores y la receta desplegada limitan su altura según el viewport y las áreas seguras. Cerrar un selector devuelve el foco al botón original sin desplazar la página.

Checkout se carga de forma diferida al abrir su ruta. No se alteraron las consultas del catálogo, las tarifas ni las fotos existentes.

Validación actual: 71 pruebas correctas, incluyendo regreso del foco al cancelar y seleccionar un adicional; build, ESLint de los componentes modificados y diff --check correctos. Navegador real a 320×568, 360×740, 390×844 y 740×360: sin desbordamiento horizontal, sin fotos dentro del builder y botones del pie de al menos 44 px. Campo de notas comprobado a 16 px. Bowl de $28.900 y Bretaña de $5.000 confirmados al carrito local, total $33.900; checkout carga correctamente a 360 px. No se creó ningún pedido. Capturas `mobile-optimized-{320,360,390,740}.png` y `mobile-optimized-extra.png` en `output/playwright/`.

## Extras visibles para aumentar el valor del pedido

Se agregó “Dale un extra a tu bowl” durante los pasos de ingredientes, al inicio de Extras y antes de la receta de confirmación. Destaca hasta dos porciones adicionales de comida y una bebida con precio, cantidad y acciones para sumar o quitar.

La proteína recomendada corresponde a una proteína de la receta que sigue activa en el catálogo. Usa la tarifa genérica vigente cuando existe, o la tarifa de upsell ya establecida; los ingredientes premium conservan el precio del catálogo. Queso frito tiene prioridad entre las opciones premium. Se recomienda Bretaña si está disponible con precio positivo, o la primera bebida de pago del catálogo. Las recomendaciones no seleccionan productos automáticamente ni consumen porciones incluidas.

Los extras se agregan a la configuración del bowl; las bebidas quedan pendientes hasta confirmar juntos al carrito. Los precios, el modelo persistido y la validación final contra el menú vigente se reutilizan. No hay fotografías ni cambios de Supabase.

Validación adicional: suite completa de 68 pruebas, build y ESLint correctos. Revisión a 360, 390, 1024 y 1280 px sin desbordamiento ni fotos. Confirmación al carrito de prueba: una proteína incluida, dos extras de $5.000 y $6.000, una bebida de $5.000; total $39.900. Capturas `output/playwright/bowl-upsells-{360,390,1024,1280}.png` y `bowl-upsells-extras-1024.png`. El efecto real sobre el ticket promedio deberá evaluarse con los pedidos posteriores a la publicación.


## Selector visible de adicionales y paso de bebidas

El selector genérico de proteína, acompañante o complemento dejó de aparecer al final del contenido: ahora abre un diálogo inmediato con nombre del adicional, ingredientes elegibles y tarifa vigente. Se puede cerrar con Cancelar, el botón de cierre, Escape o pulsando fuera. No se cobra hasta elegir un ingrediente. Las tarjetas de tarifas genéricas cuentan y eliminan las porciones reales asociadas a su `tariffId`.

Secuencia actual: Tamaño → Bases → Proteínas → Acompañantes → Salsas → Complementos → Extras → Bebidas → Resumen. Extras contiene el catálogo completo de ingredientes adicionales y Bebidas su propio listado sin fotos. Las recomendaciones de bebida permanecen disponibles durante el armado; los accesos de edición y navegación llevan al nuevo paso. El avance se calcula con la cantidad real de pasos.

En Bebidas, “Saltar bebidas” permite avanzar si no hay bebidas pendientes. “Continuar sin bebidas” está visible antes del listado y elimina exclusivamente las bebidas pendientes de esta configuración; conserva ingredientes, notas y extras. “Continuar al resumen” mantiene las bebidas elegidas. La carga fallida o el catálogo vacío no impiden omitir el paso.

Validación: 71 pruebas correctas, build y ESLint correctos. Sin errores nuevos de TypeScript en los archivos modificados; persisten los diagnósticos anteriores ajenos al cambio. Comprobado en navegador móvil: Escape no agrega cargos; proteína adicional muestra cantidad 1 y $5.000, y acompañante adicional abre sus opciones por $3.000. Bowl de prueba: $31.900, $36.900 con Bretaña, nuevamente $31.900 al continuar sin bebidas. El carrito mantiene ambos extras y ninguna bebida. Capturas `output/playwright/bowl-extra-protein-dialog-mobile.png` y `bowl-drinks-step-mobile.png`.
