import type { CartItem } from '@/types';
import { formatPrice } from './formatPrice';
import { formatBowlDetailLines } from './bowlSummary';

interface OrderInfo {
  name: string;
  phone: string;
  orderType: 'pickup' | 'delivery';
  address?: string;
  deliveryZone?: string;
  deliveryFeeCents?: number;
  notes?: string;
  orderId: string;
  paymentMethod?: 'cash' | 'transfer';
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
    lines.push(`Pago: ${info.paymentMethod === 'cash' ? 'Contra entrega' : 'Transferencia bancaria'}`);
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
    if (item.type === 'product' && item.product) {
      lines.push(`• ${brand} ${item.quantity}x ${item.product.name} — ${formatPrice(item.totalPrice)}`);
    } else if (item.type === 'custom-bowl' && item.customBowl) {
      lines.push(`• ${brand} 1x Bowl ${item.customBowl.size.name} — ${formatPrice(item.totalPrice)}`);
      formatBowlDetailLines(item.customBowl).forEach((line) => {
        lines.push(`   ${line}`);
      });
    }
    if (item.notes) lines.push(`   Nota: ${item.notes}`);
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

// ─── Embed detection ─────────────────────────────────────────────────────────

export type WhatsAppHandoffMethod = 'popup' | 'top_escape';

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
  const isAndroidWebView = /\bwv\b/.test(ua) || /Android.*Version\/[\d.]+.*Chrome\/[\d.]+/i.test(ua);
  const isIosWebView = /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(ua);
  const isInApp = /(FBAN|FBAV|Instagram|Line|Twitter|Snapchat|TikTok|WhatsApp)/i.test(ua);
  return isAndroidWebView || isIosWebView || isInApp;
}

export function getWhatsAppEmbedContext(): WhatsAppEmbedContext {
  let isIframe = false;
  try {
    // Throws on cross-origin parent — treat as embedded.
    isIframe = window.self !== window.top;
  } catch {
    isIframe = true;
  }
  const isWebView = detectWebView();
  return { isIframe, isWebView, isEmbedded: isIframe || isWebView };
}

// ─── Dev logging ─────────────────────────────────────────────────────────────

function devLog(...args: unknown[]) {
  if (import.meta.env.DEV) console.log(...args);
}

// ─── Robust handoff ──────────────────────────────────────────────────────────

/**
 * Robust WhatsApp handoff strategy:
 *
 * NORMAL TAB (not embedded):
 *   → window.open(_blank, noopener) — keeps the current page (success screen stays visible)
 *   → if popup blocked → result.ok = false → UI shows fallback panel
 *
 * EMBEDDED / IFRAME (cross-origin parent, webview):
 *   → attempt window.top.location.href to ESCAPE the iframe and navigate the top frame
 *   → on cross-origin SecurityError → fall through to window.open
 *   → if window.open also blocked → result.ok = false → UI shows fallback panel
 *
 * This deliberately NEVER navigates window.self inside an iframe, which is what
 * caused ERR_BLOCKED_BY_RESPONSE (WhatsApp/wa.me refuses X-Frame-Options embed).
 */
export function openWhatsAppHandoff(
  whatsappUrl: string,
  options?: { debugLabel?: string },
): WhatsAppHandoffResult {
  const ctx = getWhatsAppEmbedContext();

  devLog('[whatsapp][handoff] context', {
    label: options?.debugLabel,
    embedded: ctx.isEmbedded,
    isIframe: ctx.isIframe,
    isWebView: ctx.isWebView,
  });
  devLog('[whatsapp][handoff] url', whatsappUrl);

  // ── EMBEDDED: try to escape to the parent frame ───────────────────────────
  if (ctx.isEmbedded) {
    try {
      devLog('[whatsapp][handoff] method=top_escape (embedded)');
      window.top!.location.href = whatsappUrl;
      return { ok: true, url: whatsappUrl, embedded: true, method: 'top_escape' };
    } catch (err) {
      // Cross-origin parent blocked top-frame navigation.
      devLog('[whatsapp][handoff] top_escape failed (cross-origin):', err);
      // Fall through to popup attempt below.
    }
  }

  // ── NORMAL TAB or embed fallback: open in a new tab ──────────────────────
  // We deliberately do NOT use window.top.location.href here because it would
  // navigate the current page away, preventing the user from seeing the order
  // reference on the success screen.
  try {
    devLog('[whatsapp][handoff] method=popup');
    const win = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    const ok = Boolean(win);
    devLog('[whatsapp][handoff] popup opened:', ok);
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
    devLog('[whatsapp][handoff] popup failed:', err);
    return {
      ok: false,
      url: whatsappUrl,
      embedded: ctx.isEmbedded,
      method: 'popup',
      error: 'popup_failed',
    };
  }
}

/** Back-compat: uses robust handoff. */
export function navigateToWhatsApp(url: string): void {
  openWhatsAppHandoff(url, { debugLabel: 'navigateToWhatsApp' });
}
