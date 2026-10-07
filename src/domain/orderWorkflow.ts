export const orderStatuses = {
  pending: 'Necesita atención', confirmed: 'Aceptado', preparing: 'Preparando', ready: 'Listo', delivered: 'Completado', cancelled: 'Cancelado',
} as const;
export const paymentStates = {
  unknown: 'Pago histórico desconocido', unpaid: 'Efectivo pendiente', unverified: 'Transferencia sin verificar', pending: 'Pago en proceso', paid: 'Pagado', rejected: 'Pago rechazado', refunded: 'Reembolsado',
} as const;
export type OrderAction = 'acknowledge' | 'acknowledge_financial' | 'resolve_financial' | 'accept_legacy' | 'accept' | 'prepare' | 'ready' | 'complete' | 'resolve' | 'cancel' | 'record_payment';
export interface StaffOrder {
  id: string; version: number; customer_name: string; phone: string; order_type: string; address: string | null;
  delivery_zone: string | null; delivery_fee_cents: number; notes: string | null; total_cents: number; status: string;
  created_at: string; acknowledged_at: string | null; actionable_at: string | null; payment_method: string; payment_state: string;
  financial_attention_at?: string | null; financial_acknowledged_at?: string | null; financial_resolved_at?: string | null;
}
export function needsFinancialResolution(order: StaffOrder) {
  return !!order.financial_attention_at && !order.financial_resolved_at;
}
export function needsAcknowledgement(order: StaffOrder) {
  if (needsFinancialResolution(order) && !order.financial_acknowledged_at) return true;
  return order.status === 'pending' && !!order.actionable_at && !order.acknowledged_at && (order.payment_method !== 'online' || order.payment_state === 'paid');
}
export function actionsFor(order: StaffOrder): OrderAction[] {
  if (needsFinancialResolution(order)) return [
    ...(!order.financial_acknowledged_at ? ['acknowledge_financial' as const] : []),
    ...(order.payment_method !== 'online' ? ['resolve_financial' as const] : []),
  ];
  const manualPayment: OrderAction[] = ['cash','transfer'].includes(order.payment_method) && ['unpaid','unverified'].includes(order.payment_state) ? ['record_payment'] : [];
  if (order.status === 'cancelled' || order.status === 'delivered') return manualPayment;
  const actions: OrderAction[] = [];
  if (order.status === 'pending' && order.payment_method === 'legacy' && order.payment_state === 'unknown' && !order.actionable_at) actions.push('accept_legacy');
  if (needsAcknowledgement(order)) actions.push('acknowledge');
  if (order.status === 'pending' && order.actionable_at && (order.payment_method !== 'online' || order.payment_state === 'paid')) actions.push('accept');
  if (order.status === 'confirmed' && (order.payment_method !== 'online' || order.payment_state === 'paid')) actions.push('prepare');
  if (order.status === 'preparing' && (order.payment_method !== 'online' || order.payment_state === 'paid')) actions.push('ready');
  if (order.status === 'ready' && (order.payment_method !== 'online' || order.payment_state === 'paid')) actions.push('complete');
  return [...actions, ...manualPayment, 'resolve', 'cancel'];
}
