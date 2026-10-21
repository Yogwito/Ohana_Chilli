# Migraciones pendientes (manuales)

Los archivos de esta carpeta **no** los aplica `supabase db push` ni CI. Son cambios
destructivos que requieren una decisión explícita, respaldo verificado y revisión.

- `drop_legacy_wompi_columns.sql`: elimina `orders.payment_status`, `payment_provider`,
  `payment_reference`, `payment_transaction_id`, `paid_at`, sus índices únicos parciales
  y sus CHECK. El modelo vigente es `payment_method` + `payment_state` + `payment_attempts`
  (20261006120000/121000). Ver los requisitos al inicio del archivo.
