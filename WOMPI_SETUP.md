# Configuración de Wompi

La integración inicia en Sandbox y mantiene los secretos exclusivamente en
Supabase Edge Functions.

## 1. Aplicar y desplegar

```bash
supabase db push
supabase functions deploy wompi-create-checkout
supabase functions deploy wompi-payment-status
supabase functions deploy wompi-webhook --no-verify-jwt
```

## 2. Configurar secretos de Sandbox

Obtén las tres credenciales en el Dashboard de Wompi y configúralas sin el
prefijo `VITE_`:

```bash
supabase secrets set WOMPI_PUBLIC_KEY=pub_test_...
supabase secrets set WOMPI_INTEGRITY_SECRET=test_integrity_...
supabase secrets set WOMPI_EVENTS_SECRET=test_events_...
supabase secrets set APP_URL=https://tu-dominio.com
```

No se necesita la llave privada para Web Checkout.

## 3. Configurar el webhook

En el Dashboard de Wompi, ambiente Sandbox, registra esta URL de eventos:

```text
https://naoqsypqqgjhdudenevx.supabase.co/functions/v1/wompi-webhook
```

Producción debe usar otra configuración de eventos y las credenciales con
prefijos `pub_prod_`, `prod_integrity_` y `prod_events_`.

## 4. Validar antes de producción

1. Crear un pedido con **Pago en línea**.
2. Completar una transacción aprobada de Sandbox.
3. Confirmar que `orders.payment_status` cambia a `approved` y `paid_at` se llena.
4. Probar también una transacción rechazada y otra pendiente.
5. Confirmar que modificar el monto o reenviar un webhook no aprueba el pedido.
