# Runbook: Auth caído

## SÍNTOMAS
`/admin/login` falla con `signInWithPassword`; sesión admin expira; `useAdminAuth` no resuelve; 401 en operaciones admin.

## DETECCIÓN
Mensajes de error en login; estado de Auth en Supabase; verificar `user_roles` con `role = 'admin'`.

## IMPACTO
El admin no puede cambiar estados ni ver `/pedidos`. Clientes anónimos pueden seguir pidiendo (usan la clave publicable).

## ACCIÓN INMEDIATA
1. Informar al administrador. 2. Atender pedidos nuevos desde WhatsApp. 3. No compartir credenciales para saltarse la autenticación.

## MITIGACIÓN
Mantener la sesión abierta si ya existe; si no hay acceso, el responsable técnico opera con SQL bajo control (nunca desactivar RLS).

## RECUPERACIÓN
Cuando Auth vuelva: iniciar sesión, actualizar estados que quedaron pendientes.

## VALIDACIÓN
Login admin correcto; `/admin` y `/pedidos` cargan; cambio de estado de prueba.

## ESCALAMIENTO
Responsable técnico; soporte de Supabase.

