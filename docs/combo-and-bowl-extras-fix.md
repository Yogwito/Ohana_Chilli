# Combos y extras del bowl

Los combos Papas + Bretaña, Papas + Hatsu y Papas + Soda Hatsu se componen en ProductImage con la foto de papas existente y envases oficiales sin generación de etiquetas. Las bebidas individuales comparten los mismos envases. Se conserva formato 4:3 y carga diferida.

Fuentes oficiales consultadas:
- https://hatsu.co/producto/te-blanco/ — té blanco / mangostino 400 ml.
- https://hatsu.co/producto/soda-uva-blanca-romero/ — soda uva blanca / romero 300 ml.
- https://infonutricional.tomatelavida.com.co/products/bretana/ — Bretaña 300 ml.

El catálogo no especifica sabor de Hatsu; estos envases son referencias de presentación y no agregan sabores a la descripción comercial.

En Extras del builder las bebidas se seleccionan localmente, se pueden quitar, aparecen en el resumen y solo se agregan al carrito junto con la confirmación del bowl. Reiniciar/cambiar tamaño limpia las bebidas pendientes. Los ingredientes muestran el cargo efectivo cuando los cupos incluidos están llenos (manteniendo tarifas existentes de 2000/500) y permiten quitar la selección. No se cambiaron precios del catálogo ni reglas de Supabase.

## Ajuste de formato — 6 de octubre

Los tres combos ahora muestran una única composición fotográfica generada con referencia al combo Papas + Cerveza y a cada envase oficial: fondo marfil, bowl blanco a la izquierda y botella completa a la derecha, sombras coherentes y encuadre 4:3. Se retiró la composición HTML de dos imágenes superpuestas. Nuevos archivos -v2.webp de 1200×900 y -v2-480.webp de 480×360; se conserva la fuente anterior como respaldo. Las imágenes individuales de bebidas siguen usando los envases oficiales sin regeneración.

Arma tu bowl no muestra fotos de ingredientes ni de bebidas; conserva las ilustraciones decorativas de tamaños y los controles/precios.
