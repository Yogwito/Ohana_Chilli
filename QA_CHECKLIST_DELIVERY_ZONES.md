# QA Checklist - Delivery Zones

## Database & RLS
- [ ] Run Supabase migration `20260302101500_add_delivery_zones.sql` without errors.
- [ ] Confirm `delivery_zones` exists with columns: `id`, `name`, `fee_cents`, `is_active`, `created_at`.
- [ ] Confirm indexes exist on `name` and `is_active`.
- [ ] As anon: `SELECT` returns only rows where `is_active = true`.
- [ ] As authenticated admin: can `SELECT/INSERT/UPDATE/DELETE` all rows.
- [ ] As authenticated non-admin: cannot `INSERT/UPDATE/DELETE`.

## Admin UI
- [ ] `/admin` shows a new tab `Domicilios`.
- [ ] Search filters rows by name (case-insensitive).
- [ ] Editable fields work: `Nombre`, `Tarifa (COP)`, `Activo`.
- [ ] `Guardar` persists changes and refreshes the table.

## CSV Import
- [ ] Dialog opens from `Importar CSV`.
- [ ] Accepts pasted CSV with headers `name,fee`.
- [ ] Fees parse correctly for `5000`, `6.500`, `7,000`, `$8.500`.
- [ ] Name normalization collapses extra spaces for matching.
- [ ] Case-insensitive matching updates existing rows instead of duplicating.
- [ ] UPSERT by `name` works for create/update in one import.
- [ ] Summary shows `creados`, `actualizados`, and `errores`.
- [ ] Invalid rows are reported in `errores` and valid rows still import.

## No OCR Guardrail
- [ ] Dialog text explicitly indicates manual CSV paste and no OCR workflow.
