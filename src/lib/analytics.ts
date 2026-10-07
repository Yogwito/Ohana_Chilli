import { orderApi } from '@/lib/orderApi';

type AnalyticsEvent =
  | { type: 'page_view'; page: string }
  | { type: 'add_to_cart'; productId: string; productName: string; brand: string; priceCents: number }
  | { type: 'checkout_start'; itemCount: number; subtotalCents: number }
  | { type: 'checkout_complete'; orderId: string; totalCents: number; orderType: 'pickup' | 'delivery'; itemCount: number }
  | { type: 'whatsapp_sent'; orderId: string }
  | { type: 'whatsapp_blocked'; orderId: string };

/**
 * Fire-and-forget analytics event. Never throws or blocks UI.
 */
export function trackEvent(event: AnalyticsEvent) {
  const { type, ...metadata } = event;
  void orderApi('analytics', { event_type: type, metadata }).catch(() => {
    // Analytics failure is non-critical and must not block shopping.
  });
}
