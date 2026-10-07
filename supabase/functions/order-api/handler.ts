import { createClient } from 'npm:@supabase/supabase-js@2.98.0';
import { z } from 'npm:zod@3.25.76';
import { hostedCheckout, minorUnits, sha256, verifyEvent, type WompiEvent, type WompiTransaction } from '../_shared/wompi.ts';

const env = (key: string) => Deno.env.get(key) || '';
const db = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
const origin = env('APP_ORIGIN');
const environment = 'test'; // Production deliberately unavailable until merchant/refund acceptance.
const providerBase = 'https://sandbox.wompi.co/v1';
const onlineEnabled = () => env('WOMPI_HOSTED_METHODS_VERIFIED') === 'true' && env('WOMPI_REFERENCE_LOOKUP_VERIFIED') === 'true' && env('ONLINE_PAYMENTS_ENABLED') === 'true' && env('WOMPI_PUBLIC_KEY').startsWith('pub_test_') && env('WOMPI_PRIVATE_KEY').startsWith('prv_test_') && !!env('WOMPI_INTEGRITY_SECRET') && !!env('WOMPI_EVENTS_SECRET') && env('WOMPI_REFUND_METHODS').split(',').includes('CARD');
const id = z.string().min(1).max(100);
const extra = z.object({ ingredient_id: id, quantity: z.number().int().min(1).max(10), source: z.enum(['catalog', 'generic', 'upsell', 'suggestion']).optional(), tariff_id: id.optional() }).strict();
const item = z.object({
  type: z.enum(['product','custom-bowl','promotion']), product_id: id.optional(), promotion_id: id.optional(), size: z.enum(['small','medium','large']).optional(),
  quantity: z.number().int().min(1).max(20), notes: z.string().max(500).optional(),
  removed: z.array(z.string().max(100)).max(30).optional(), extras: z.array(extra).max(20).optional(),
  bases: z.array(id).max(10).optional(), proteins: z.array(id).max(10).optional(), acompanantes: z.array(id).max(10).optional(),
  sauces: z.array(id).max(10).optional(), complementos: z.array(id).max(10).optional(),
}).strict();
const requestSchema = z.object({
  order_type: z.enum(['pickup','delivery']), payment_method: z.enum(['cash','transfer','online']), delivery_zone_id: z.string().uuid().optional(),
  customer_name: z.string().min(2).max(100), phone: z.string().regex(/^\+?[\d -]{10,20}$/),
  address: z.string().max(300).optional(), notes: z.string().max(500).optional(), items: z.array(item).min(1).max(30),
}).strict();
const analyticsSchema = z.discriminatedUnion('event_type', [
  z.object({ event_type: z.literal('page_view'), metadata: z.object({ page: z.string().min(1).max(256) }).strict() }),
  z.object({ event_type: z.literal('add_to_cart'), metadata: z.object({ productId: id, productName: z.string().min(1).max(256), brand: z.literal('ohana'), priceCents: z.number().int().nonnegative() }).strict() }),
  z.object({ event_type: z.literal('checkout_start'), metadata: z.object({ itemCount: z.number().int().min(1).max(30), subtotalCents: z.number().int().nonnegative() }).strict() }),
  z.object({ event_type: z.literal('checkout_complete'), metadata: z.object({ orderId: z.string().uuid(), totalCents: z.number().int().nonnegative(), orderType: z.enum(['pickup', 'delivery']), itemCount: z.number().int().min(1).max(30) }).strict() }),
  z.object({ event_type: z.literal('whatsapp_sent'), metadata: z.object({ orderId: z.string().uuid() }).strict() }),
  z.object({ event_type: z.literal('whatsapp_blocked'), metadata: z.object({ orderId: z.string().uuid() }).strict() }),
]);
const tokenSchema = z.string().regex(/^[a-f0-9]{64}$/);
class ApiError extends Error { constructor(public code: string, public status = 400) { super(code); } }
async function boundedBody(req: Request): Promise<string> {
  const limit = 50000;
  if (Number(req.headers.get('content-length')) > limit) throw new ApiError('request_too_large',413);
  if (!req.body) return '';
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => {});
        throw new ApiError('request_too_large',413);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}
function headers(req: Request) {
  const allowed = req.headers.get('origin') === origin;
  return { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Vary': 'Origin',
    ...(allowed ? { 'Access-Control-Allow-Origin': origin, 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Access-Control-Allow-Methods': 'POST, OPTIONS' } : {}) };
}
async function rpc(name: string, args: Record<string, unknown>, client = db) {
  const { data, error } = await client.rpc(name, args);
  if (error) {
    const known = ['quote_changed','idempotency_conflict','version_conflict','business_closed','not_actionable','invalid_transition','tracking_not_found','payment_not_available','not_refundable','payment_mismatch','payment_terminal_conflict'];
    const code = known.find(code => error.message.includes(code));
    if (!code) {
      if (error.code === 'P0001' || error.code?.startsWith('22') || error.code?.startsWith('23')) throw new ApiError('validation_failed');
      throw new ApiError('order_backend_unavailable',503);
    }
    throw new ApiError(code, code.includes('conflict') || code === 'quote_changed' ? 409 : 400);
  }
  return data;
}
async function rateLimit(req: Request, route: string, limit: number) {
  // Only the ingress-generated header is trusted. Never accept a client-supplied body IP.
  const trustedHeader = env('RATE_LIMIT_TRUSTED_HEADER');
  const address = trustedHeader && req.headers.get(trustedHeader)?.split(',').pop()?.trim();
  if (!address || !env('RATE_LIMIT_SECRET')) throw new ApiError('rate_limit_unavailable',503);
  const key = await sha256(`${env('RATE_LIMIT_SECRET')}:${route}:${address}`);
  if (!await rpc('order_rate_limit', { p_key: key, p_limit: limit })) throw new ApiError('rate_limited',429);
  return key;
}
async function botCheck(token: string) {
  if (!env('TURNSTILE_SECRET_KEY')) throw new ApiError('bot_protection_unavailable',503);
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body: new URLSearchParams({ secret: env('TURNSTILE_SECRET_KEY'), response: token }), signal: AbortSignal.timeout(10000),
  });
  const result = await response.json();
  if (!result.success || result.hostname !== new URL(origin).hostname || result.action !== 'order') throw new ApiError('bot_verification_failed',403);
}
async function admin(req: Request) {
  const authorization = req.headers.get('authorization') || '';
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new ApiError('unauthorized',401);
  const { data: role } = await client.rpc('has_role', { _user_id: user.id, _role: 'admin' });
  if (!role) throw new ApiError('forbidden',403);
  return client;
}
async function provider(path: string, init: RequestInit = {}) {
  const response = await fetch(`${providerBase}${path}`, { ...init, headers: { Authorization: `Bearer ${env('WOMPI_PRIVATE_KEY')}`, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new ApiError('provider_unavailable',502);
  return (await response.json()).data;
}
async function applyTransaction(transaction: WompiTransaction, eventKey: string) {
  // Confirm all data via provider API; reference/currency are not necessarily signed webhook fields.
  if (!transaction?.id || !Number.isSafeInteger(transaction.amount_in_cents)) throw new ApiError('invalid_provider_data');
  await rpc('order_payment_apply', {
    p_reference: transaction.reference, p_provider_id: transaction.id, p_amount: transaction.amount_in_cents,
    p_currency: transaction.currency, p_environment: environment, p_status: transaction.status, p_event_key: eventKey,
  });
}
async function monitor(code: string) {
  // Never log exception bodies, request payloads, addresses, tokens or credentials.
  console.error(JSON.stringify({ service: 'orders', code }));
  if (env('MONITORING_URL')) {
    try { await fetch(env('MONITORING_URL'), { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env('MONITORING_TOKEN')}` }, body: JSON.stringify({ service: 'orders', code }), signal: AbortSignal.timeout(5000) }); } catch { /* diagnostic sink cannot break checkout */ }
  }
}
export async function handleRequest(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: headers(req) });
  try {
    if (req.method !== 'POST') throw new ApiError('method_not_allowed',405);
    const route = new URL(req.url).pathname.split('/').pop();
    if (route !== 'webhook' && route !== 'reconcile' && req.headers.get('origin') !== origin) throw new ApiError('origin_denied',403);
    const raw = await boundedBody(req);
    const body = JSON.parse(raw);
    let result: unknown;
    if (route === 'quote' || route === 'create') {
      await rateLimit(req, route, route === 'quote' ? 60 : 10);
      const request = requestSchema.parse(body.request);
      if (request.payment_method === 'online' && !onlineEnabled()) throw new ApiError('online_payments_disabled',503);
      if (route === 'quote') result = await rpc('order_quote', { p_request: request });
      else {
        const key = z.string().uuid().parse(body.idempotency_key);
        const token = tokenSchema.parse(body.tracking_token);
        await botCheck(z.string().min(1).max(2048).parse(body.bot_token));
        result = await rpc('order_create', { p_request: request, p_key: key, p_quote: tokenSchema.parse(body.quote), p_tracking_hash: await sha256(token) });
      }
    } else if (route === 'analytics') {
      // Public analytics is accepted only through this origin-checked Edge route.
      // The rate key is derived from an ingress-controlled address header, never
      // from browser-provided JSON.
      const rateKey = await rateLimit(req, route, 120);
      const analytics = analyticsSchema.parse(body);
      result = { accepted: await rpc('track_analytics_event', {
        p_event_type: analytics.event_type,
        p_metadata: analytics.metadata,
        p_rate_key: rateKey,
      }) };
    } else if (route === 'track') {
      await rateLimit(req,route,120);
      result = await rpc('order_track', { p_hash: await sha256(tokenSchema.parse(body.token)) });
    } else if (route === 'payment') {
      await rateLimit(req,route,20);
      if (!onlineEnabled()) throw new ApiError('online_payments_disabled',503);
      const token = tokenSchema.parse(body.token);
      const attempt = await rpc('order_payment_start', { p_hash: await sha256(token), p_environment: environment });
      if (new Date(attempt.expires_at).getTime() <= Date.now()) throw new ApiError('payment_reconciliation_required',409);
      result = { url: await hostedCheckout(attempt,env('WOMPI_PUBLIC_KEY'),env('WOMPI_INTEGRITY_SECRET'),`${origin}/pedido/${token}`) };
    } else if (route === 'action') {
      const client = await admin(req);
      result = await rpc('order_action', { p_id: z.string().uuid().parse(body.id), p_version: z.number().int().nonnegative().parse(body.version), p_action: z.enum(['acknowledge','accept_legacy','accept','prepare','ready','complete','resolve','cancel','record_payment','acknowledge_financial','resolve_financial']).parse(body.action), p_note: z.string().max(1000).parse(body.note || '') },client);
    } else if (route === 'refund') {
      const client = await admin(req);
      if (env('WOMPI_REFUNDS_ENABLED') !== 'true' || !onlineEnabled()) throw new ApiError('refunds_disabled',503);
      const r = await rpc('order_refund_request', { p_id: z.string().uuid().parse(body.id), p_version: z.number().int().nonnegative().parse(body.version), p_reason: z.string().min(3).max(500).parse(body.reason) },client);
      const claim = await rpc('order_refund_claim', { p_id: r.id });
      if (claim) {
        try {
          if (claim.environment !== environment) throw new ApiError('refund_environment_mismatch');
          const transaction = await provider(`/transactions/${encodeURIComponent(claim.transaction_id)}`);
          if (transaction.status !== 'APPROVED' || !env('WOMPI_REFUND_METHODS').split(',').includes(transaction.payment_method_type) || transaction.amount_in_cents !== minorUnits(claim.amount_cop)) throw new ApiError('refund_method_unavailable');
          const refund = await provider('/refunds', { method: 'POST', body: JSON.stringify({ transaction_id: claim.transaction_id, amount_in_cents: minorUnits(claim.amount_cop), reason: claim.reason, reference: claim.id }) });
          await rpc('order_refund_apply', { p_id: claim.id, p_provider_id: String(refund.v2_refund_id || refund.id), p_transaction_id: refund.transaction_id, p_amount: refund.amount_in_cents, p_status: refund.status });
        } catch (error) {
          // Ambiguous network/provider failures stay processing. Never automatically repost a refund.
          const code = error instanceof ApiError ? error.code : 'refund_unresolved';
          await rpc('order_refund_issue',{p_id:claim.id,p_code:code});
          await monitor(code);
          throw new ApiError('refund_requires_review',502);
        }
      }
      result = { id: r.id, state: claim ? 'processing' : r.state };
    } else if (route === 'webhook') {
      const event = body as WompiEvent;
      if (!env('WOMPI_EVENTS_SECRET') || event.environment !== environment || !await verifyEvent(event,env('WOMPI_EVENTS_SECRET'))) throw new ApiError('invalid_webhook',403);
      const transaction = await provider(`/transactions/${encodeURIComponent(event.data.transaction.id)}`);
      if (transaction.id !== event.data.transaction.id || transaction.amount_in_cents !== event.data.transaction.amount_in_cents) throw new ApiError('webhook_mismatch',409);
      await applyTransaction(transaction,await sha256(raw));
      result = { received: true };
    } else if (route === 'reconcile') {
      if (!env('RECONCILIATION_SECRET') || req.headers.get('authorization') !== `Bearer ${env('RECONCILIATION_SECRET')}`) throw new ApiError('unauthorized',401);
      const { data: attempts, error } = await db.from('payment_attempts').select('*').eq('state','pending').order('checked_at', { ascending: true, nullsFirst: true }).order('id').limit(100);
      if (error) throw new ApiError('reconciliation_failed',503);
      // Rotate failed attempts too: otherwise 100 failures permanently hide later payments.
      // Bound provider concurrency and elapsed work so one cron invocation cannot run indefinitely.
      const pending = attempts || [];
      const deadline = Date.now() + 30000;
      let cursor = 0;
      let checked = 0;
      let failed = 0;
      let rotationFailed = false;
      const checkAttempt = async (attempt: typeof pending[number]) => {
        try {
          // Reference lookup recovers orders when the customer closes checkout before redirect/webhook.
          if (!attempt.provider_id && env('WOMPI_REFERENCE_LOOKUP_VERIFIED') !== 'true') throw new ApiError('reference_lookup_not_verified');
          const found = attempt.provider_id ? await provider(`/transactions/${encodeURIComponent(attempt.provider_id)}`) : await provider(`/transactions?reference=${encodeURIComponent(attempt.reference)}`);
          const transactions = Array.isArray(found) ? found : [found];
          if (transactions.length > 1) throw new ApiError('multiple_payment_transactions');
          if (transactions[0] && transactions[0].reference !== attempt.reference) throw new ApiError('reconciliation_reference_mismatch');
          if (transactions[0]) await applyTransaction(transactions[0],`poll:${transactions[0].id}:${transactions[0].status}`);
          if (new Date(attempt.created_at).getTime() < Date.now()-10*60000) await monitor('payment_unresolved');
        } catch { failed++; await monitor('payment_reconciliation_failed'); }
        finally {
          const { error: updateError } = await db.from('payment_attempts').update({ checked_at: new Date().toISOString() }).eq('id',attempt.id);
          if (updateError) rotationFailed = true;
          checked++;
        }
      };
      await Promise.all(Array.from({ length: Math.min(5,pending.length) },async () => {
        while (cursor < pending.length && Date.now() < deadline) {
          const attempt = pending[cursor++];
          await checkAttempt(attempt);
        }
      }));
      if (rotationFailed) throw new ApiError('payment_reconciliation_failed',503);
      if (env('WOMPI_REFUND_LOOKUP_VERIFIED') === 'true') {
        const { data: refunds, error: refundError } = await db.from('order_refunds').select('id,provider_id').eq('state','processing').not('provider_id','is',null).limit(100);
        if (refundError) throw new ApiError('refund_reconciliation_failed',503);
        for (const r of refunds || []) {
          try {
            const refund = await provider(`/refunds/${encodeURIComponent(r.provider_id)}`);
            await rpc('order_refund_apply', { p_id:r.id,p_provider_id:String(refund.v2_refund_id||refund.id),p_transaction_id:refund.transaction_id,p_amount:refund.amount_in_cents,p_status:refund.status });
          } catch { await monitor('refund_reconciliation_failed'); }
        }
      }
      const { count, error: attentionError } = await db.from('orders').select('id',{count:'exact',head:true}).eq('status','pending').is('acknowledged_at',null).lt('actionable_at',new Date(Date.now()-120000).toISOString());
      if (attentionError) throw new ApiError('attention_monitor_failed',503);
      if (count) await monitor('order_acknowledgement_overdue');
      const { count: financialAttention, error: financialError } = await db.from('orders').select('id',{count:'exact',head:true}).is('financial_acknowledged_at',null).is('financial_resolved_at',null).lt('financial_attention_at',new Date(Date.now()-120000).toISOString());
      if (financialError) throw new ApiError('financial_attention_monitor_failed',503);
      if (financialAttention) await monitor('financial_attention_overdue');
      const { count: unresolved, error: refundMonitorError } = await db.from('order_refunds').select('id',{count:'exact',head:true}).eq('state','processing').lt('updated_at',new Date(Date.now()-120000).toISOString());
      if (refundMonitorError) throw new ApiError('refund_monitor_failed',503);
      if (unresolved) await monitor('refund_unresolved');
      result = { reconciled: checked, failed };
    } else throw new ApiError('not_found',404);
    return new Response(JSON.stringify(result), { headers: headers(req) });
  } catch (error) {
    const code = error instanceof ApiError ? error.code : error instanceof z.ZodError || error instanceof SyntaxError ? 'invalid_request' : 'internal_error';
    const status = error instanceof ApiError ? error.status : code === 'invalid_request' ? 400 : 500;
    if (status >= 500 || code.includes('mismatch') || code.includes('webhook')) await monitor(code);
    return new Response(JSON.stringify({ error: code }), { status, headers: headers(req) });
  }
}
