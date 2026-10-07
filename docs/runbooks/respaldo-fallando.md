# Runbook: Respaldo fallando

## SÍNTOMAS
`scripts/backup-database.mjs` falla o produce archivo vacío; `verify-backup-manifest.mjs` rechaza el manifest; workflow de respaldo en rojo (`.github/workflows`).

## DETECCIÓN
Estado del workflow de respaldo; salida de `node scripts/backup-database.mjs`; checksum SHA256 del manifest.

## IMPACTO
Sin punto de restauración reciente: RPO crece.

## ACCIÓN INMEDIATA
1. Ejecutar un respaldo manual inmediato. 2. Verificar espacio, credenciales (`scripts/database-env.mjs`).

## MITIGACIÓN
Exportar Storage con `scripts/export-storage-backup.mjs`; guardar copia fuera del sitio.

## RECUPERACIÓN
Corregir causa y verificar con `node scripts/verify-backup-manifest.mjs`; ensayar con `node scripts/restore-drill.mjs` (solo bases locales `ohana_test*`).

## VALIDACIÓN
Manifest válido, checksum correcto, drill de restauración exitoso (`docs/BACKUP_RESTORE.md`).

## ESCALAMIENTO
Responsable técnico; administrador informado si el hueco supera 24 h.

