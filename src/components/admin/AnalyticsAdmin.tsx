import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/domain/formatPrice';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingUp, ShoppingCart, Truck, Store } from 'lucide-react';

interface OrderRow {
  id: string;
  total_cents: number;
  order_type: string;
  created_at: string;
}

interface OrderItemRow {
  name: string;
  quantity: number;
  brand_id: string | null;
}

interface AnalyticsEventRow {
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function AnalyticsAdmin() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [events, setEvents] = useState<AnalyticsEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [ordersRes, itemsRes, eventsRes] = await Promise.all([
        supabase.from('orders').select('id, total_cents, order_type, created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('order_items').select('name, quantity, brand_id').limit(1000),
        supabase.from('analytics_events').select('event_type, metadata, created_at').order('created_at', { ascending: false }).limit(1000),
      ]);
      setOrders((ordersRes.data ?? []) as OrderRow[]);
      setOrderItems((itemsRes.data ?? []) as OrderItemRow[]);
      setEvents((eventsRes.data ?? []) as AnalyticsEventRow[]);
      setLoading(false);
    }
    load();
  }, []);

  // 1. Top products
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; brand: string }>();
    orderItems.forEach((item) => {
      const existing = map.get(item.name);
      if (existing) {
        existing.qty += item.quantity;
      } else {
        map.set(item.name, { name: item.name, qty: item.quantity, brand: item.brand_id ?? 'unknown' });
      }
    });
    return [...map.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);
  }, [orderItems]);

  // 2. Delivery vs Pickup
  const orderTypeBreakdown = useMemo(() => {
    let pickup = 0;
    let delivery = 0;
    orders.forEach((o) => {
      if (o.order_type === 'pickup') pickup++;
      else delivery++;
    });
    return { pickup, delivery, total: pickup + delivery };
  }, [orders]);

  // 3. Average order value
  const avgOrderValue = useMemo(() => {
    if (orders.length === 0) return 0;
    const sum = orders.reduce((acc, o) => acc + o.total_cents, 0);
    return Math.round(sum / orders.length);
  }, [orders]);

  // 4. Checkout funnel
  const funnel = useMemo(() => {
    let addToCart = 0;
    let checkoutStart = 0;
    let checkoutComplete = 0;
    events.forEach((e) => {
      if (e.event_type === 'add_to_cart') addToCart++;
      else if (e.event_type === 'checkout_start') checkoutStart++;
      else if (e.event_type === 'checkout_complete') checkoutComplete++;
    });
    const conversionRate = checkoutStart > 0 ? Math.round((checkoutComplete / checkoutStart) * 100) : 0;
    return { addToCart, checkoutStart, checkoutComplete, conversionRate };
  }, [events]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
      </div>
    );
  }

  const maxQty = topProducts.length > 0 ? topProducts[0].qty : 1;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<ShoppingCart className="w-5 h-5 text-ohana" />}
          label="Pedidos totales"
          value={String(orderTypeBreakdown.total)}
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5 text-ohana" />}
          label="Ticket promedio"
          value={formatPrice(avgOrderValue)}
        />
        <KpiCard
          icon={<Store className="w-5 h-5 text-primary" />}
          label="Pickup"
          value={`${orderTypeBreakdown.pickup} (${orderTypeBreakdown.total > 0 ? Math.round((orderTypeBreakdown.pickup / orderTypeBreakdown.total) * 100) : 0}%)`}
        />
        <KpiCard
          icon={<Truck className="w-5 h-5 text-chilli-dark" />}
          label="Delivery"
          value={`${orderTypeBreakdown.delivery} (${orderTypeBreakdown.total > 0 ? Math.round((orderTypeBreakdown.delivery / orderTypeBreakdown.total) * 100) : 0}%)`}
        />
      </div>

      {/* Checkout Funnel */}
      <div className="bg-card border rounded-xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> Embudo de conversión
        </h3>
        <div className="space-y-3">
          <FunnelBar label="Agregar al carrito" value={funnel.addToCart} max={Math.max(funnel.addToCart, 1)} color="bg-muted-foreground/20" />
          <FunnelBar label="Inicio checkout" value={funnel.checkoutStart} max={Math.max(funnel.addToCart, 1)} color="bg-ohana/40" />
          <FunnelBar label="Pedido completado" value={funnel.checkoutComplete} max={Math.max(funnel.addToCart, 1)} color="bg-ohana" />
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Tasa de conversión: <span className="font-bold text-foreground">{funnel.conversionRate}%</span>
          {' '}(checkout inicio → completado)
        </p>
      </div>

      {/* Top Products */}
      <div className="bg-card border rounded-xl p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5" /> Productos más pedidos
        </h3>
        {topProducts.length === 0 ? (
          <p className="text-muted-foreground text-sm">Sin datos aún</p>
        ) : (
          <div className="space-y-2">
            {topProducts.map((p, i) => (
              <div key={p.name} className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground w-5 text-right font-mono">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{p.name}</span>
                    <span className="text-xs text-muted-foreground ml-2 shrink-0">{p.qty} uds</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${p.brand === 'ohana' ? 'bg-ohana' : 'bg-chilli-dark'}`}
                      style={{ width: `${(p.qty / maxQty) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card border rounded-xl p-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-xl font-bold">{value}</span>
    </div>
  );
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
