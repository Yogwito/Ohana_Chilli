# Runbook: Storage caído

## SÍNTOMAS
Imágenes de productos no cargan (ver `src/domain/productImages.ts`); subida de imágenes en admin falla.

## DETECCIÓN
Errores 4xx/5xx en peticiones a `/storage/v1/`; estado de Storage en Supabase.

## IMPACTO
Solo visual: el catálogo y los pedidos funcionan; las tarjetas muestran placeholder.

## ACCIÓN INMEDIATA
Confirmar que el checkout sigue operando. No tocar buckets.

## MITIGACIÓN
Pausar cambios de imágenes en admin; si hay URLs rotas, verificar las migraciones `sanitize_product_images` y `db_cleanup_images`.

## RECUPERACIÓN
Reintentar la subida cuando Storage vuelva; si se perdieron objetos, restaurar desde el export de `scripts/export-storage-backup.mjs` (verificar con `scripts/verify-backup-manifest.mjs`).

## VALIDACIÓN
Cargar `/` y comprobar imágenes; subir una imagen de prueba en admin.

## ESCALAMIENTO
Responsable técnico; administrador si se requiere restauración de objetos.

