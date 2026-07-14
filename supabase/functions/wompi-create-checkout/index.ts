import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0';
import { corsHeaders, json, sha256 } from '../_shared/http.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  try {
    const { orderId } = await request.json();
    if (!orderId) return json({ error: 'Faltan datos del pago' }, 400);

    const { data: order, error } = await supabase
      .from('orders')
      .select('id,total_cents,payment_method,payment_status,customer_name,phone')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) return json({ error: 'Pedido no encontrado' }, 404);
    if (order.payment_method !== 'wompi') return json({ error: 'El pedido no usa Wompi' }, 409);
    if (order.payment_status === 'approved') return json({ error: 'Este pedido ya está pagado' }, 409);

    const publicKey = Deno.env.get('WOMPI_PUBLIC_KEY');
    const integritySecret = Deno.env.get('WOMPI_INTEGRITY_SECRET');
    const appUrl = Deno.env.get('APP_URL');
    if (!publicKey || !integritySecret || !appUrl) {
      return json({ error: 'Wompi no está configurado' }, 503);
    }

    const redirect = new URL('/pago/resultado', appUrl);
    redirect.searchParams.set('order', order.id);

    // La app guarda pesos enteros; Wompi recibe centavos.
    const amountInCents = order.total_cents * 100;
    const reference = `OHANA-${order.id}`;
    const signature = await sha256(`${reference}${amountInCents}COP${integritySecret}`);

    await supabase
      .from('orders')
      .update({
        payment_provider: 'wompi',
        payment_reference: reference,
        payment_status: 'pending',
      })
      .eq('id', order.id)
      .neq('payment_status', 'approved');

    return json({
      checkoutUrl: 'https://checkout.wompi.co/p/',
      fields: {
        'public-key': publicKey,
        currency: 'COP',
        'amount-in-cents': String(amountInCents),
        reference,
        'signature:integrity': signature,
        'redirect-url': redirect.toString(),
        'customer-data:full-name': order.customer_name,
        'customer-data:phone-number': order.phone.replace(/\D/g, '').slice(-10),
      },
    });
  } catch (error) {
    console.error(error);
    return json({ error: 'No fue posible iniciar el pago' }, 500);
  }
});
