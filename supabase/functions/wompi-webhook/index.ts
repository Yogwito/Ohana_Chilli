import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.98.0';
import { json, sha256 } from '../_shared/http.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function valueAtPath(data: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((value, key) => {
    if (!value || typeof value !== 'object') return undefined;
    return (value as Record<string, unknown>)[key];
  }, data);
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'Método no permitido' }, 405, false);

  try {
    const event = await request.json();
    const eventsSecret = Deno.env.get('WOMPI_EVENTS_SECRET');
    if (!eventsSecret || !event?.signature?.properties || !event?.signature?.checksum) {
      return json({ error: 'Evento inválido' }, 400, false);
    }

    const signedValues = event.signature.properties
      .map((property: string) => String(valueAtPath(event.data, property) ?? ''))
      .join('');
    const expected = await sha256(`${signedValues}${event.timestamp}${eventsSecret}`);
    if (expected.toLowerCase() !== String(event.signature.checksum).toLowerCase()) {
      return json({ error: 'Firma inválida' }, 401, false);
    }

    if (event.event !== 'transaction.updated') return json({ received: true }, 200, false);

    const transaction = event.data?.transaction;
    const statusMap: Record<string, string> = {
      APPROVED: 'approved', DECLINED: 'declined', VOIDED: 'voided', ERROR: 'error', PENDING: 'pending',
    };
    const paymentStatus = statusMap[transaction?.status];
    if (!transaction?.reference || !paymentStatus) return json({ received: true }, 200, false);

    const { data: order } = await supabase
      .from('orders')
      .select('id,total_cents,payment_status')
      .eq('payment_reference', transaction.reference)
      .maybeSingle();

    // Se responde 200 a eventos auténticos que no pertenecen a esta app.
    if (!order) return json({ received: true }, 200, false);
    if (transaction.currency !== 'COP' || transaction.amount_in_cents !== order.total_cents * 100) {
      console.error('Wompi amount mismatch', { orderId: order.id, transactionId: transaction.id });
      return json({ error: 'El monto no coincide' }, 409, false);
    }

    // Un evento tardío no puede degradar una aprobación ya confirmada.
    if (order.payment_status !== 'approved') {
      await supabase.from('orders').update({
        payment_status: paymentStatus,
        payment_transaction_id: transaction.id,
        paid_at: paymentStatus === 'approved' ? new Date().toISOString() : null,
      }).eq('id', order.id);
    }

    return json({ received: true }, 200, false);
  } catch (error) {
    console.error(error);
    return json({ error: 'Evento inválido' }, 400, false);
  }
});
