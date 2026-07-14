import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0';
import { corsHeaders, json } from '../_shared/http.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const { orderId } = await request.json();
  const { data: order } = await supabase
    .from('orders')
    .select('id,payment_status,payment_transaction_id')
    .eq('id', orderId)
    .eq('payment_provider', 'wompi')
    .maybeSingle();

  if (!order) return json({ error: 'Pago no encontrado' }, 404);
  return json({
    orderId: order.id,
    status: order.payment_status,
    transactionId: order.payment_transaction_id,
  });
});
