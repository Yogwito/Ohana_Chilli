export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export const ORDER_STATUS_FLOW: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'delivered'];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Nuevo',
  confirmed: 'Confirmado',
  preparing: 'Preparando',
  ready: 'Listo',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const NEXT_ORDER_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

export const NEXT_ORDER_ACTION: Partial<Record<OrderStatus, string>> = {
  pending: 'Aceptar pedido',
  confirmed: 'Iniciar preparación',
  preparing: 'Marcar como listo',
  ready: 'Marcar como entregado',
};

export function getElapsedMinutes(createdAt: string, now = new Date()) {
  return Math.max(0, Math.floor((now.getTime() - new Date(createdAt).getTime()) / 60000));
}

export function getUrgencyLevel(createdAt: string, status: OrderStatus, now = new Date()) {
  if (status === 'delivered' || status === 'cancelled') return 'done' as const;
  const minutes = getElapsedMinutes(createdAt, now);
  if (minutes >= 25) return 'late' as const;
  if (minutes >= 12) return 'attention' as const;
  return 'fresh' as const;
}
