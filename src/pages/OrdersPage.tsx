import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ClipboardList, Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  order_type: 'pickup' | 'delivery';
  address: string | null;
  notes: string | null;
  items: any[];
  subtotal: number;
  total: number;
  status: string;
  created_at: string;
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending:   { label: 'Pendiente',   icon: <Clock className="w-3 h-3" />,       variant: 'outline' },
  confirmed: { label: 'Confirmado',  icon: <CheckCircle className="w-3 h-3" />, variant: 'default' },
  preparing: { label: 'Preparando',  icon: <Package className="w-3 h-3" />,     variant: 'secondary' },
  ready:     { label: 'Listo',       icon: <CheckCircle className="w-3 h-3" />, variant: 'default' },
  delivered: { label: 'Entregado',   icon: <Truck className="w-3 h-3" />,       variant: 'default' },
  cancelled: { label: 'Cancelado',   icon: <XCircle className="w-3 h-3" />,     variant: 'destructive' },
};

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(date));

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching orders:', error);
      } else {
        setOrders((data as Order[]) || []);
      }
      setLoading(false);
    };

    fetchOrders();

    // Realtime: escuchar nuevos pedidos
    const channel = supabase
      .channel('orders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="container max-w-5xl">
        <div className="flex items-center gap-3 mb-8">
          <ClipboardList className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Pedidos</h1>
            <p className="text-muted-foreground">Historial de todos los pedidos recibidos</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-36 w-full rounded-xl" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <ClipboardList className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Aún no hay pedidos registrados</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const status = statusConfig[order.status] ?? statusConfig.pending;
              return (
                <div key={order.id} className="bg-card border rounded-xl p-5 space-y-4">
                  {/* Header */}
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-lg">{order.customer_name}</p>
                      <p className="text-sm text-muted-foreground">{order.customer_phone}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        {status.icon}
                        {status.label}
                      </Badge>
                      <Badge variant="outline">
                        {order.order_type === 'pickup' ? '🏪 Recoger' : '🚚 Domicilio'}
                      </Badge>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-1">
                    {(order.items as any[]).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.quantity}x {item.type === 'product' ? item.product?.name : 'Bowl Personalizado'}
                        </span>
                        <span>{formatPrice(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                    <span className="text-xs text-muted-foreground">{formatDate(order.created_at)}</span>
                    <span className="font-bold text-primary">{formatPrice(order.total)}</span>
                  </div>

                  {order.address && (
                    <p className="text-xs text-muted-foreground">📍 {order.address}</p>
                  )}
                  {order.notes && (
                    <p className="text-xs text-muted-foreground">📝 {order.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
