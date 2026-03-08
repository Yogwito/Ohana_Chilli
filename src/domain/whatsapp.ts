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
  const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  if (isMobile) {
    return `https://wa.me/${sanitizedPhone}?text=${encodedMessage}`;
  }

  return `https://web.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodedMessage}`;
}

export interface WhatsAppResult {
  ok: boolean;
  reason?: string;
  window?: Window | null;
}

/**
 * Pre-open a blank window synchronously (inside user gesture).
 * This avoids popup blockers since it runs in the click handler stack.
 */
export function preOpenWindow(): Window | null {
  try {
    return window.open('about:blank', '_blank');
  } catch {
    return null;
  }
}

/**
 * Redirect a pre-opened window to the WhatsApp URL.
 * If no pre-opened window is available, return blocked to avoid losing app state.
 */
export function redirectToWhatsApp(url: string, preOpened?: Window | null): WhatsAppResult {
  try {
    if (preOpened && !preOpened.closed) {
      preOpened.location.href = url;
      return { ok: true, window: preOpened };
    }

    return { ok: false, reason: 'popup_blocked' };
  } catch {
    return { ok: false, reason: 'blocked' };
  }
}
