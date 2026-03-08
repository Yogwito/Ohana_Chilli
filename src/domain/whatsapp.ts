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
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
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

  lines.push('');
  lines.push(`Subtotal: ${formatPrice(subtotal)}`);
  if (info.orderType === 'delivery' && (info.deliveryFeeCents ?? 0) > 0) {
    lines.push(`Domicilio: ${formatPrice(info.deliveryFeeCents!)}`);
  }
  lines.push(`Total: ${formatPrice(total)}`);
  if (info.notes) lines.push('', `Notas: ${info.notes}`);
  return lines.join('\n');
}

function normalizeWhatsAppPhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const sanitizedPhone = normalizeWhatsAppPhone(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${sanitizedPhone}?text=${encodedMessage}`;
}

export interface WhatsAppResult {
  ok: boolean;
  reason?: 'popup_blocked' | 'blocked' | 'closed_immediately';
  window?: Window | null;
}

/**
 * Open WhatsApp URL directly. Uses window.open and detects if the popup was blocked.
 * If blocked, falls back gracefully.
 */
export function openWhatsApp(url: string): WhatsAppResult {
  try {
    const popup = window.open(url, '_blank');

    // Popup blocked by browser
    if (!popup || popup.closed) {
      return { ok: false, reason: 'popup_blocked' };
    }

    // Some browsers open then immediately close — detect after a short delay
    // We can't reliably detect this synchronously, so we return ok: true
    // and the caller can check later or provide a manual fallback.
    return { ok: true, window: popup };
  } catch {
    return { ok: false, reason: 'blocked' };
  }
}

/**
 * Navigate current tab to WhatsApp URL as a last-resort fallback.
 * This always works but leaves the app.
 */
export function navigateToWhatsApp(url: string): void {
  window.location.href = url;
}
