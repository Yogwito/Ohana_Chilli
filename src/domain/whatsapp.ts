import type { CartItem } from '@/types';
import { formatPrice } from './formatPrice';
import {
  canonicalFromCustomBowl,
  canonicalFromLegacyProduct,
  formatCustomizationSummary,
} from './customization';

interface OrderInfo {
  name: string;
  phone: string;
  orderType: 'pickup' | 'delivery';
  address?: string;
  deliveryZone?: string;
  deliveryFeeCents?: number;
  notes?: string;
  orderId: string;
  paymentMethod?: 'cash' | 'transfer' | 'wompi';
}

const SEP = '─────────────────';

export function generateWhatsAppMessage(items: CartItem[], total: number, info: OrderInfo): string {
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const lines: string[] = [
    'Nueva Orden — Ohana Bowls',
    `Ref: ${info.orderId.slice(0, 8).toUpperCase()}`,
    SEP,
    `Cliente: ${info.name}`,
    `Teléfono: ${info.phone}`,
    `Tipo: ${info.orderType === 'pickup' ? 'Recoger en sucursal' : 'Entrega a domicilio'}`,
  ];

  if (info.paymentMethod) {
    const paymentLabels = {
      cash: 'Contra entrega',
      transfer: 'Transferencia bancaria',
      wompi: 'Pago en línea con Wompi',
    } as const;
    lines.push(`Pago: ${paymentLabels[info.paymentMethod]}`);
  }

  if (info.orderType === 'delivery') {
    lines.push(SEP);
    if (info.address) lines.push(`Dirección: ${info.address}`);
    // Always include barrio + domicilio for delivery (even $0 must be confirmed).
    lines.push(`Barrio: ${info.deliveryZone ?? 'No especificado'}`);
    lines.push(`Domicilio: ${formatPrice(info.deliveryFeeCents ?? 0)}`);
  }

  lines.push(SEP, 'PRODUCTOS:');

  items.forEach((item) => {
    const brand = '[Ohana]';
    // Único formatter compartido: lo que ve el operador en WhatsApp es
    // exactamente lo que muestran el carrito, el checkout y el admin.
    const canonical = item.customization
      ?? (item.type === 'custom-bowl'
        ? canonicalFromCustomBowl(item.customBowl)
        : canonicalFromLegacyProduct(item.customizations));
    const summaryLines = formatCustomizationSummary(canonical);

    const itemName = item.type === 'product' && item.product
      ? item.product.name
      : `Bowl ${item.customBowl?.size.name ?? 'Personalizado'}`;
    lines.push(`• ${brand} ${item.quantity}x ${itemName} — ${formatPrice(item.totalPrice)}`);
    summaryLines.forEach((line) => lines.push(`   ${line}`));

    if (item.notes && !canonical.note) {
      lines.push(`   Nota: ${item.notes}`);
    }
  });

  lines.push(SEP);
  lines.push(`Subtotal: ${formatPrice(subtotal)}`);
  // Always show delivery line in delivery orders (even when $0, so operator can verify barrio fee).
  if (info.orderType === 'delivery') {
    lines.push(`Domicilio: ${formatPrice(info.deliveryFeeCents ?? 0)}`);
  }
  lines.push(`TOTAL: ${formatPrice(total)}`);
  if (info.notes) {
    lines.push(SEP, `Notas: ${info.notes}`);
  }
  return lines.join('\n');
}

function normalizeWhatsAppPhone(phone: string): string {
  // wa.me expects country code + number, digits only.
  return phone.replace(/[^\d]/g, '');
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const sanitizedPhone = normalizeWhatsAppPhone(phone);
  const encodedMessage = encodeURIComponent(message);
  // Only use wa.me — never api.whatsapp.com.
  return `https://wa.me/${sanitizedPhone}?text=${encodedMessage}`;
}

export function buildPlatformWhatsAppUrl(
  phone: string,
  message: string,
): { url: string; platform: 'mobile' | 'desktop' } {
  const url = buildWhatsAppUrl(phone, message);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  return { url, platform: isMobile ? 'mobile' : 'desktop' };
}

// ─── Handoff ─────────────────────────────────────────────────────────────────

/**
 * Open WhatsApp with the given phone + message.
 * Mobile: navigate via window.location.href (wa.me — lets the OS pick the app).
 * Desktop: open WhatsApp Web in a new tab.
 */
export function openWhatsAppHandoff(phone: string, message: string): void {
  const sanitizedPhone = normalizeWhatsAppPhone(phone);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
  } else {
    window.open(
      `https://web.whatsapp.com/send?phone=${sanitizedPhone}&text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer',
    );
  }
}
