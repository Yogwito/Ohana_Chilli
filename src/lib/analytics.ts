import { supabase } from '@/integrations/supabase/client';

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
  supabase
    .from('analytics_events')
    .insert({ event_type: type, metadata })
    .then(({ error }) => {
      if (error) { /* fire-and-forget: analytics failure is non-critical */ }
    });
}
