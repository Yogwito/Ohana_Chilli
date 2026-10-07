# Correcciones internas — 7 de octubre de 2026

Fase terminada y verificada localmente. No se desplegó, no se habilitaron pagos reales ni se consultaron o alteraron datos de producción. Las migraciones nuevas son aditivas y solo se ejecutaron en PostgreSQL aislado. Los cambios previos del workspace se conservaron.

## Cambios realizados

| Archivos | Cambio | Motivo |
|---|---|---|
| PromotionsSection, CartContext, cartCatalogSync, use-catalog, types, orderApi, CheckoutPage, migración 122000 | Identidad de promoción desde carrito hasta cotización; precio, vigencia y snapshot calculados en SQL | H01: el producto sintético no existía en catálogo y desaparecía |
| handler y handler.test | Rotar `checked_at` también ante errores; desempate estable, cinco trabajadores y plazo para iniciar trabajo de pagos; error 503 si no puede persistirse la rotación | H02: los primeros 100 fallos monopolizaban la consulta |
| migración 123000, orderWorkflow, OrderAlerts, OrdersDashboard, handler, tipos generados | Incidencia financiera persistente para cancelado/pagado; cola, aviso, reconocimiento independiente, auditoría y resolución verificada | H03: un pago tardío quedaba fuera de atención operativa |
| orderApi, CheckoutPage y tests de recuperación | Guardar solicitud original y presupuesto en sessionStorage; restaurar campos; recuperar con misma identidad; revisar cambios de presupuesto; bloquear clics simultáneos | H04: recargar perdía la información necesaria para recuperar |
| migración 124000, businessSettings, use-catalog-sync y tests | Lectura anónima de claves concretas de horario/banner, reloj Bogotá y horario nocturno; refrescar caché del banner | H05 y H09: política y presentación inconsistentes |
| AdminPage, AnalyticsAdmin | Etiquetas asociadas, errores con reintento, muestras estadísticas explícitas y líneas de los mismos pedidos | H06–H08 |
| ProductsAdmin, SettingsAdmin | Sincronización existente del catálogo después de escrituras exitosas | H09 |
| handler | Lectura de cuerpo limitada a 50 KB antes de completar el buffer | H12 |
| bowl-builder.test, order-ci.yml | Eliminar `any` mediante tipo de fixture específico; incluir lint en CI | H17 |
| scripts/test-database.mjs y test-purchase-browser.cjs | Incorporar regresiones SQL y recorrido de navegador reproducible con red externa interceptada | H16, parcialmente |

## Hallazgos y evidencia

“Solucionado” describe el código y las pruebas locales; no significa que las migraciones estén aplicadas en producción.

| Hallazgo | Estado | Evidencia o pendiente |
|---|---|---|
| H01 | SOLUCIONADO | Tests de reconciliación/mapeo y tarjeta; SQL precio canónico, snapshot, precio cambiado, vencimiento e inactividad; Chrome móvil/tablet hasta confirmación |
| H02 | SOLUCIONADO | Handler real con límites simulados: 101 pagos fallidos alcanzados en dos consultas, concurrencia máxima 5; fallo de timestamp devuelve 503 |
| H03 | SOLUCIONADO | SQL cancelación→aprobación, evento duplicado, no administrador, versión obsoleta, reconocer sin resolver, reembolso pendiente/aprobado; test listener y badge |
| H04 | SOLUCIONADO | Solicitud/key/token conservados; revisión de quote; almacenamiento malformado, clics rápidos, enlace guardado y carrito posterior preservado; Chrome con fallo de red y recarga |
| H05 | SOLUCIONADO | RLS anónimo: cuatro claves visibles y clave privada oculta; backend rechaza horario cerrado; tests Bogotá, cruce UTC, horario nocturno y caché |
| H06 | SOLUCIONADO | Test encuentra los cuatro campos de reglas por etiqueta accesible |
| H07 | SOLUCIONADO | Tests de fallo/reintento de ingredientes, reglas y estadísticas; no presentan fallo como informe vacío |
| H08 | SOLUCIONADO | Test de paginación limitada a IDs de los pedidos mostrados; interfaz identifica muestra, cancelados y truncamiento |
| H09 | SOLUCIONADO | Escrituras exitosas usan broadcast existente; test de configuración no difunde fallos; caché real de banner/política se refresca |
| H10 | PENDIENTE | Definir y verificar tratamiento de pedidos históricos pendientes, sin inferir pagos |
| H11 | PENDIENTE | Acotar eventos públicos de analítica y verificar permisos efectivos live |
| H12 | SOLUCIONADO | Test UTF-8 por bytes y cancelación del stream excesivo, además de Content-Length |
| H13 | PENDIENTE | Unificar dominio canónico y fuentes SEO |
| H14 | PENDIENTE | Bundle principal aún ~724 KB; medir y optimizar rendimiento |
| H15 | PENDIENTE | Revisar aplicabilidad y actualizar dependencias con advisories |
| H16 | PARCIAL | Nuevas regresiones de compra, recuperación y conciliación; navegador reproducible. Faltan integración HTTP de reembolsos, navegador en CI y verificación física de alertas |
| H17 | SOLUCIONADO | Lint global pasa y workflow incluye lint; ejecución remota del CI no verificada |
| H18 | PENDIENTE | Refactor gradual de componentes/funciones extensos |
| H19 | PENDIENTE | Metadata y cabeceras de rutas privadas/no indexables |
| H20 | PENDIENTE | Incluir bebidas en sitemap |
| H21 | PENDIENTE | Configuración y errores de Unsplash |
| H22 | PENDIENTE | Confirmar referencias remotas antes de retirar imágenes potencialmente sin uso |
| H23 | PENDIENTE | Limpieza de legado y actualización de documentación histórica |

## Tests

| Test | Resultado |
|---|---|
| `npx tsc --noEmit -p tsconfig.app.json` | PASA |
| `npm run lint` | PASA |
| `npm test` | PASA: 121 tests, 25 archivos |
| `npm run build` | PASA; conserva aviso de bundle >500 KB y Browserslist antiguo |
| `deno check supabase/functions/order-api/index.ts` | PASA |
| `deno test --allow-env supabase/functions/order-api/handler.test.ts` | PASA: 9 tests con límites DB/proveedor simulados |
| `scripts/test-database.mjs` | PASA: baseline nuevo, todas las migraciones aditivas, permisos/workflow, promociones, finanzas, ajustes públicos e históricos |
| `scripts/test-order-concurrency.mjs` | PASA: un pedido ante dos envíos; una transición y un conflicto ante dos actualizaciones |
| `scripts/restore-drill.mjs` | PASA: 0,062 s restauración local de fixture; conteos, estado histórico y permisos preservados |
| `scripts/test-purchase-browser.cjs` | PASA: Chrome 390 y 768 px, recuperación incierta, identidad, quote y doble clic; cero overflow |
| Revisión independiente | APROBADA después de devolver y verificar correcciones adicionales |

La restauración local no acredita un backup de producción, RPO o RTO real. Las pruebas simuladas del proveedor no acreditan el contrato real de Wompi. La prueba de alertas verifica indicador/listener, no sonido físico. La fase de conciliación de reembolsos mantiene su procesamiento secuencial previo; el plazo nuevo se aplica al inicio de trabajo de pagos.

Para repetir el navegador: iniciar Vite local en 8089 con `VITE_TURNSTILE_SITE_KEY` de prueba; ejecutar `PLAYWRIGHT_MODULE=/ruta/a/playwright node scripts/test-purchase-browser.cjs`. Requiere Playwright y Chrome instalados. No se añadió esa dependencia ni se afirmó ejecución del navegador en CI. El script bloquea las solicitudes externas y simula Supabase y Turnstile.

## Regresiones y revisión cruzada

No quedan regresiones detectadas por las comprobaciones ejecutadas. Durante la revisión se encontraron y corrigieron: ausencia de enlace guardado al recuperar por seguimiento, limpieza excesiva de un carrito modificado, posibilidad de clics simultáneos y botón de compra para combos con precio inválido. Cada corrección cuenta con regresión específica. El revisor independiente aprobó los ajustes finales.

El trabajo se repartió en paralelo y por tandas según los cuatro slots disponibles: combos/carrito, checkout, conciliación, finanzas, consistencia, QA de navegador y revisión independiente. Se reutilizaron especialistas de la auditoría y se incorporaron revisores adicionales. El coordinador integró migraciones, tipos y comprobaciones globales.

## Archivos modificados en esta fase

Inventario de esta fase, no de todos los cambios previos que ya estaban presentes en Git:

- `.github/workflows/order-ci.yml`
- `scripts/test-database.mjs`
- `scripts/test-purchase-browser.cjs` (nuevo)
- `src/components/admin/AnalyticsAdmin.tsx`
- `src/components/admin/ProductsAdmin.tsx`
- `src/components/admin/SettingsAdmin.tsx`
- `src/components/admin/OrderAlerts.tsx`
- `src/components/admin/OrdersDashboard.tsx`
- `src/components/ohana/PromotionsSection.tsx`
- `src/context/CartContext.tsx`
- `src/domain/businessSettings.ts`
- `src/domain/cartCatalogSync.ts`
- `src/domain/orderWorkflow.ts`
- `src/hooks/use-catalog.ts`
- `src/hooks/use-catalog-sync.ts`
- `src/integrations/supabase/types.ts` (regenerado del esquema local probado)
- `src/lib/orderApi.ts`
- `src/pages/AdminPage.tsx`
- `src/pages/CheckoutPage.tsx`
- `src/types/index.ts`
- `src/test/admin-consistency.test.tsx` (nuevo)
- `src/test/bowl-builder.test.tsx`
- `src/test/bowl-persistence.test.tsx`
- `src/test/business-settings.test.ts`
- `src/test/catalog-settings-sync.test.ts` (nuevo)
- `src/test/checkout-recovery.test.tsx` (nuevo)
- `src/test/order-alerts.test.tsx` (nuevo)
- `src/test/order-api.test.ts`
- `src/test/order-workflow.test.ts`
- `src/test/promotion-card.test.tsx` (nuevo)
- `src/test/promotion-orders.test.ts` (nuevo)
- `supabase/functions/order-api/handler.ts`
- `supabase/functions/order-api/handler.test.ts`
- `supabase/migrations/20261006122000_promotion_orders.sql` (nuevo)
- `supabase/migrations/20261006123000_financial_attention.sql` (nuevo)
- `supabase/migrations/20261006124000_public_order_settings.sql` (nuevo)
- `supabase/tests/promotion-orders.sql` (nuevo)
- `supabase/tests/financial-attention.sql` (nuevo)
- `supabase/tests/public-order-settings.sql` (nuevo)
- `docs/CORRECTIONS_2026-10-07.md` (nuevo)
- `docs/ORDER_BACKEND_ROLLOUT.md`

Evidencia visual nueva:

- `output/playwright/correction-combo-checkout.png`
- `output/playwright/correction-uncertain-reload.png`
- `output/playwright/correction-combo-confirmation-tablet.png`

## Estado del proyecto

Mejoraron la compra de combos, recuperación de pedidos, equidad de conciliación, atención financiera, consistencia de horarios/configuración, accesibilidad del editor, manejo de errores y veracidad de estadísticas. Se preservan snapshots, precios COP, idempotencia, permisos y el estado desconocido de los pagos históricos.

Siguen pendientes la auditoría live de esquema/RLS/grants/Realtime, staging y cutover coordinado, configuración externa de bot/origen/cron/monitoring, backups externos completos con restauración medida, aceptación de contratos Wompi sandbox y las condiciones de producción señaladas en el rollout. Esta fase no habilita publicación ni pagos reales y no sustituye esas verificaciones.
