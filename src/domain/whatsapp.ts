import type { CartItem } from '@/types';
import { formatPrice } from './formatPrice';
import { formatBowlDetail } from './bowlSummary';

interface OrderInfo {
  name: string;
  phone: string;
  orderType: 'pickup' | 'delivery';
  address?: string;
  deliveryZone?: string;
  deliveryFeeCents?: number;
  notes?: string;
  orderId: string;
}

export function generateWhatsAppMessage(items: CartItem[], total: number, info: OrderInfo): string {
  const lines = [
    'Nueva Orden - Ohana & Chilli',
    `Ref: ${info.orderId.slice(0, 8).toUpperCase()}`,
    '',
    `Cliente: ${info.name}`,
    `Telefono: ${info.phone}`,
    `Tipo: ${info.orderType === 'pickup' ? 'Recoger en sucursal' : 'Entrega a domicilio'}`,
  ];

  if (info.orderType === 'delivery') {
    if (info.address) {
      lines.push(`Direccion: ${info.address}`);
    }
    lines.push(`Barrio: ${info.deliveryZone ?? 'No especificado'}`);
    lines.push(`Domicilio: ${formatPrice(info.deliveryFeeCents ?? 0)}`);
  }

  lines.push('', 'Productos:');

  items.forEach((item) => {
    const brand = item.brand === 'ohana' ? '[Ohana]' : '[Chilli]';
    if (item.type === 'product' && item.product) {
      lines.push(`${brand} ${item.quantity}x ${item.product.name} - ${formatPrice(item.totalPrice)}`);
    } else if (item.type === 'custom-bowl' && item.customBowl) {
      lines.push(`${brand} 1x Bowl Personalizado - ${formatPrice(item.totalPrice)}`);
      lines.push(`   - ${formatBowlDetail(item.customBowl)}`);
    }
    if (item.notes) lines.push(`   - Nota: ${item.notes}`);
  });

  lines.push('', `Total: ${formatPrice(total)}`);
  if (info.notes) lines.push('', `Notas: ${info.notes}`);
  return lines.join('\n');
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export interface WhatsAppResult {
  ok: boolean;
  reason?: string;
}

export function tryOpenWhatsApp(url: string): WhatsAppResult {
  try {
    const win = window.open(url, '_blank');
    if (!win) {
      return { ok: false, reason: 'popup_blocked' };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'exception' };
  }
}
