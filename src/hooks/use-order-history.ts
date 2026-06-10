import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HistoryOrderItem {
  id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  brand_id: string | null;
  details: {
    product_id?: string;
    notes?: string;
    customizations?: unknown;
    // bowl fields
    size?: string;
    bases?: string[];
    proteins?: string[];
    acompanantes?: string[];
    sauces?: string[];
    complementos?: string[];
  } | null;
}

export interface HistoryOrder {
  id: string;
  created_at: string;
  total_cents: number;
  order_type: string;
  status: string;
  items: HistoryOrderItem[];
}

function normalizePhone(raw: string) {
  return raw.replace(/\D/g, '').slice(-10);
}

export function useOrderHistory(phone: string) {
  const cleanPhone = normalizePhone(phone);
  const enabled = cleanPhone.length >= 10;

  return useQuery({
    queryKey: ['order-history', cleanPhone],
    queryFn: async (): Promise<HistoryOrder[]> => {
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, created_at, total_cents, order_type, status')
        .ilike('phone', `%${cleanPhone}%`)
        .not('status', 'eq', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(3);

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return [];

      const orderIds = orders.map((o) => o.id);
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('id, order_id, name, quantity, unit_price_cents, brand_id, details')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;

      const itemsByOrder = (items ?? []).reduce<Record<string, HistoryOrderItem[]>>((acc, item) => {
        const oi = item as HistoryOrderItem & { order_id: string };
        (acc[oi.order_id] = acc[oi.order_id] ?? []).push(oi);
        return acc;
      }, {});

      return orders.map((o) => ({
        ...o,
        items: itemsByOrder[o.id] ?? [],
      }));
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
