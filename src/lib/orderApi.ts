import { supabase } from '@/integrations/supabase/client';
import type { CartItem } from '@/types';
export interface CanonicalQuote {
  fingerprint: string; total: number; subtotal: number; delivery_fee: number; delivery_zone: string | null;
  items: { name: string; quantity: number; unit_price_cents: number; details: Record<string, unknown> }[];
}
const messages: Record<string,string> = {
  quote_changed: 'El menú o la tarifa cambió. Revisa el nuevo total antes de confirmar.',
  version_conflict: 'Otra persona actualizó este pedido. Actualiza y vuelve a intentarlo.',
  idempotency_conflict: 'Esta solicitud ya se usó con otros datos. Recupera el pedido anterior.',
  business_closed: 'Estamos fuera del horario de atención.',
  bot_verification_failed: 'Completa nuevamente la verificación para continuar.',
  rate_limited: 'Demasiados intentos. Espera unos minutos.',
  tracking_not_found: 'El enlace no existe o venció.',
  online_payments_disabled: 'El pago en línea no está habilitado.',
  refund_requires_review: 'El reembolso necesita revisión. No vuelvas a solicitarlo; consulta su estado.',
  orders_disabled: 'Estamos en mantenimiento y no estamos recibiendo pedidos en línea por ahora. Tu carrito sigue guardado; intenta de nuevo más tarde o escríbenos por WhatsApp.',
  service_unavailable: 'El servicio de pedidos no está disponible temporalmente. Tu carrito sigue guardado; intenta de nuevo en unos minutos.',
  payment_reconciliation_required: 'El pago anterior necesita verificación. Contacta al negocio antes de pagar otra vez.',
};
export const maintenanceCodes = ['orders_disabled','service_unavailable'];
export const isMaintenanceError = (error: unknown): error is OrderApiError => error instanceof OrderApiError && maintenanceCodes.includes(error.code);
export class OrderApiError extends Error {
  constructor(public code: string) { super(messages[code] || 'No pudimos completar la operación. Intenta nuevamente.'); }
}
export async function orderApi<T>(route: string, body: unknown): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/order-api/${route}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(25000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const code = result.error || result.code;
    // 503 with a known code (e.g. rate_limit_unavailable) keeps its own message; bare 503 is maintenance.
    throw new OrderApiError(code === 'orders_disabled' ? code : code || (response.status === 503 ? 'service_unavailable' : 'unavailable'));
  }
  return result;
}
export function orderItemRequest(item: CartItem) {
  if (item.type === 'product') {
    if (item.product?.promotionId || item.product?.id?.startsWith('promo-')) {
      return { type: 'promotion', promotion_id: item.product.promotionId || item.product.id.slice(6), quantity: item.quantity, notes: item.notes || item.customizations?.note || '' };
    }
    const counts = new Map<string,number>();
    for (const extra of item.customizations?.extras || []) counts.set(extra.id,(counts.get(extra.id)||0)+1);
    return { type: item.type, product_id: item.product?.id, quantity: item.quantity, notes: item.notes || item.customizations?.note || '',
      removed: item.customizations?.removedIngredients || [], extras: Array.from(counts,([ingredient_id,quantity]) => ({ingredient_id,quantity})) };
  }
  const bowl = item.customBowl!;
  return { type: item.type, size: bowl.size.size, quantity: item.quantity, notes: item.notes || bowl.notes || '',
    bases: bowl.bases.map(i => i.id), proteins: bowl.proteins.map(i => i.id), acompanantes: bowl.acompanantes.map(i => i.id),
    sauces: (bowl.sauces || []).map(i => i.id), complementos: (bowl.complementos || []).map(i => i.id),
    extras: (bowl.extras || []).map(e => ({ingredient_id:e.ingredient.id,quantity:e.quantity,source:e.source,tariff_id:e.tariffId})),
  };
}
export function randomTrackingToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)),byte => byte.toString(16).padStart(2,'0')).join('');
}
export const pendingCheckoutStorageKey = 'ohana-pending-order:v1';
export interface CheckoutRequest {
  customer_name: string; phone: string; order_type: 'delivery' | 'pickup'; address?: string; notes?: string; delivery_zone_id?: string; payment_method: 'cash' | 'transfer' | 'online'; items: unknown[];
}
export interface PendingCheckoutAttempt<T = CheckoutRequest> {
  key: string; token: string; signature: string;
  request?: T;
  quote?: string;
}
export function getPendingCheckout(): PendingCheckoutAttempt | null {
  try {
    const pending = JSON.parse(sessionStorage.getItem(pendingCheckoutStorageKey) || 'null');
    if (pending && typeof pending.key === 'string' && /^[a-f0-9]{64}$/.test(pending.token) && typeof pending.signature === 'string') {
      const request = pending.request;
      const validRequest = request && typeof request === 'object' && typeof request.customer_name === 'string' && typeof request.phone === 'string'
        && ['delivery','pickup'].includes(request.order_type) && ['cash','transfer','online'].includes(request.payment_method) && Array.isArray(request.items)
        && ['address','notes','delivery_zone_id'].every(field => request[field] === undefined || typeof request[field] === 'string');
      return {key:pending.key,token:pending.token,signature:pending.signature,request:validRequest ? request : undefined,quote:typeof pending.quote === 'string' ? pending.quote : undefined};
    }
  } catch { /* A corrupt record must not be used as an order request. */ }
  return null;
}
export async function checkoutAttempt<T>(request: T, quote?: string): Promise<PendingCheckoutAttempt<T>> {
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(request)));
  const signature = Array.from(new Uint8Array(digest),b => b.toString(16).padStart(2,'0')).join('');
  const storageKey = pendingCheckoutStorageKey;
  const stored = sessionStorage.getItem(storageKey);
  if (stored) {
    try {
      const pending = JSON.parse(stored);
      if (pending.signature !== signature) throw new OrderApiError('idempotency_conflict');
      if (typeof pending.key === 'string' && /^[a-f0-9]{64}$/.test(pending.token)) {
        const restored: PendingCheckoutAttempt<T> = {key:pending.key,token:pending.token,signature,request,quote:quote || (typeof pending.quote === 'string' ? pending.quote : undefined)};
        sessionStorage.setItem(storageKey, JSON.stringify(restored));
        return restored;
      }
    } catch (error) { if (error instanceof OrderApiError) throw error; }
  }
  const pending = {key:crypto.randomUUID(),token:randomTrackingToken(),signature,request,quote};
  sessionStorage.setItem(storageKey,JSON.stringify(pending));
  return pending;
}
