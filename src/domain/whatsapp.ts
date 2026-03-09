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
  // wa.me expects country code + number, digits only.
  return phone.replace(/[^\d]/g, '');
}

export function buildWhatsAppUrl(phone: string, message: string): string {
  const sanitizedPhone = normalizeWhatsAppPhone(phone);
  const encodedMessage = encodeURIComponent(message);
  // IMPORTANT: do not use api.whatsapp.com (it may appear as a redirect target from wa.me).
  return `https://wa.me/${sanitizedPhone}?text=${encodedMessage}`;
}

export type WhatsAppHandoffMethod = 'top_location' | 'popup';

export interface WhatsAppEmbedContext {
  isIframe: boolean;
  isWebView: boolean;
  isEmbedded: boolean;
}

export interface WhatsAppHandoffResult {
  ok: boolean;
  url: string;
  embedded: boolean;
  method: WhatsAppHandoffMethod;
  popupOpened?: boolean;
  error?: string;
}

function detectWebView(): boolean {
  const ua = navigator.userAgent || '';
  // Heuristic: common Android WebView token + iOS webview (no Safari) + social in-app browsers.
  const isAndroidWebView = /\bwv\b/.test(ua) || /Android.*Version\/[\d.]+.*Chrome\/[\d.]+/i.test(ua);
  const isIosWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua);
  const isInApp = /(FBAN|FBAV|Instagram|Line|Twitter|Snapchat|TikTok|WhatsApp)/i.test(ua);
  return isAndroidWebView || isIosWebView || isInApp;
}

export function getWhatsAppEmbedContext(): WhatsAppEmbedContext {
  let isIframe = false;
  try {
    isIframe = window.self !== window.top;
  } catch {
    // Accessing window.top can throw in cross-origin iframes; treat as embedded.
    isIframe = true;
  }

  const isWebView = detectWebView();
  return {
    isIframe,
    isWebView,
    isEmbedded: isIframe || isWebView,
  };
}

function devLog(...args: unknown[]) {
  if (import.meta.env.DEV) console.log(...args);
}

/**
 * Robust WhatsApp handoff:
 * - Never navigates inside an iframe (prevents ERR_BLOCKED_BY_RESPONSE / X-Frame-Options issues).
 * - Prefers top-level navigation; falls back to popup.
 */
export function openWhatsAppHandoff(
  whatsappUrl: string,
  options?: {
    preferTopNavigation?: boolean;
    debugLabel?: string;
  },
): WhatsAppHandoffResult {
  const ctx = getWhatsAppEmbedContext();
  const preferTopNavigation = options?.preferTopNavigation ?? true;

  devLog('[whatsapp][handoff] context', {
    label: options?.debugLabel,
    embedded: ctx.isEmbedded,
    isIframe: ctx.isIframe,
    isWebView: ctx.isWebView,
  });
  devLog('[whatsapp][handoff] url', whatsappUrl);

  // 1) Prefer top-level navigation whenever possible.
  if (preferTopNavigation) {
    try {
      devLog('[whatsapp][handoff] method', 'top_location');
      // This navigates the whole page (or the parent page if embedded).
      window.top!.location.href = whatsappUrl;
      return {
        ok: true,
        url: whatsappUrl,
        embedded: ctx.isEmbedded,
        method: 'top_location',
      };
    } catch (err) {
      devLog('[whatsapp][handoff] top_location failed', err);
      // continue to popup fallback
    }
  }

  // 2) Fallback: open a new tab/window (noopener+noreferrer).
  try {
    devLog('[whatsapp][handoff] method', 'popup');
    const win = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    const ok = Boolean(win);
    devLog('[whatsapp][handoff] popup opened', ok);

    // Defense-in-depth.
    if (win) win.opener = null;

    return {
      ok,
      url: whatsappUrl,
      embedded: ctx.isEmbedded,
      method: 'popup',
      popupOpened: ok,
      error: ok ? undefined : 'popup_blocked',
    };
  } catch (err) {
    devLog('[whatsapp][handoff] popup failed', err);
    return {
      ok: false,
      url: whatsappUrl,
      embedded: ctx.isEmbedded,
      method: 'popup',
      error: 'popup_failed',
    };
  }
}

/**
 * Back-compat helper.
 * NOTE: uses robust handoff instead of same-frame navigation.
 */
export function navigateToWhatsApp(url: string): void {
  openWhatsAppHandoff(url, { preferTopNavigation: true, debugLabel: 'navigateToWhatsApp' });
}
