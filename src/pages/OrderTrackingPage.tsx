import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, CheckCircle2, ChefHat, Clock3, PackageCheck, Store, Truck, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ORDER_STATUS_FLOW, ORDER_STATUS_LABELS, type OrderStatus } from '@/domain/orderStatus';
import { cn } from '@/lib/utils';

type PublicOrderStatus = {
  id: string;
  status: OrderStatus;
  order_type: 'pickup' | 'delivery';
  created_at: string;
  accepted_at: string | null;
  preparation_started_at: string | null;
  ready_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  estimated_ready_at: string | null;
  cancellation_reason: string | null;
};

const STEP_ICONS = {
  pending: Clock3,
  confirmed: CheckCircle2,
  preparing: ChefHat,
  ready: PackageCheck,
  delivered: Truck,
} as const;

export default function OrderTrackingPage() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<PublicOrderStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    let cancelled = false;
    let timeout: number | undefined;
    const load = async () => {
      const { data, error } = await supabase.rpc('get_public_order_status' as never, { p_tracking_token: token } as never);
      if (cancelled) return;
      const result = Array.isArray(data) ? data[0] : null;
      if (error || !result) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOrder(result as unknown as PublicOrderStatus);
      setLoading(false);
      if (!['delivered', 'cancelled'].includes(result.status)) timeout = window.setTimeout(load, 5000);
    };
    load();
    return () => { cancelled = true; if (timeout) window.clearTimeout(timeout); };
  }, [token]);

  const currentIndex = useMemo(() => order ? ORDER_STATUS_FLOW.indexOf(order.status) : 0, [order]);

  if (loading) return <div className="container max-w-2xl py-16"><Skeleton className="mx-auto h-[34rem] max-w-lg rounded-3xl" /></div>;
  if (notFound || !order) return (
    <div className="container flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
      <XCircle className="h-12 w-12 text-muted-foreground" />
      <h1 className="mt-5 text-2xl font-bold">No encontramos este pedido</h1>
      <p className="mt-2 text-sm text-muted-foreground">Abre nuevamente el enlace que recibiste al finalizar el checkout.</p>
      <Button asChild className="mt-6"><Link to="/">Volver al menú</Link></Button>
    </div>
  );

  if (order.status === 'cancelled') return (
    <div className="container flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100"><XCircle className="h-10 w-10 text-red-600" /></div>
      <p className="mt-6 font-mono text-xs font-bold tracking-widest text-muted-foreground">PEDIDO #{order.id.slice(0, 8).toUpperCase()}</p>
      <h1 className="mt-2 text-3xl font-black">Pedido cancelado</h1>
      <p className="mt-3 text-muted-foreground">{order.cancellation_reason || 'El restaurante no pudo continuar con este pedido.'}</p>
      <Button asChild className="mt-8 rounded-full"><Link to="/">Hacer un nuevo pedido</Link></Button>
    </div>
  );

  return (
    <div className="min-h-[80vh] bg-gradient-to-b from-brand/5 to-transparent py-10 sm:py-16">
      <div className="container max-w-2xl">
        <div className="overflow-hidden rounded-3xl border bg-card shadow-lg shadow-brand/5">
          <div className="bg-brand px-5 py-7 text-primary-foreground sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs font-bold tracking-[0.18em] opacity-80">PEDIDO #{order.id.slice(0, 8).toUpperCase()}</p>
                <h1 className="mt-2 text-2xl font-black sm:text-3xl">{order.status === 'delivered' ? '¡Pedido entregado!' : 'Estamos con tu pedido'}</h1>
              </div>
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15">
                {order.order_type === 'delivery' ? <Truck className="h-6 w-6" /> : <Store className="h-6 w-6" />}
              </div>
            </div>
            <p className="mt-3 text-sm opacity-85">
              {order.status === 'pending' && 'Ohana recibió tu orden y la confirmará en unos minutos.'}
              {order.status === 'confirmed' && 'Tu pedido fue aceptado y pronto entrará a cocina.'}
              {order.status === 'preparing' && 'Cocina está preparando tus productos.'}
              {order.status === 'ready' && (order.order_type === 'delivery' ? 'Tu pedido está listo para despacho.' : 'Tu pedido está listo para recoger.')}
              {order.status === 'delivered' && 'Gracias por elegir Ohana Bowls.'}
            </p>
          </div>

          <div className="p-5 sm:p-8">
            <div className="space-y-1">
              {ORDER_STATUS_FLOW.map((status, index) => {
                const Icon = STEP_ICONS[status];
                const completed = index < currentIndex || order.status === 'delivered';
                const active = index === currentIndex && order.status !== 'delivered';
                return (
                  <div key={status} className="relative flex min-h-20 gap-4">
                    {index < ORDER_STATUS_FLOW.length - 1 && <span className={cn('absolute left-5 top-10 h-[calc(100%-1rem)] w-0.5', completed ? 'bg-brand' : 'bg-border')} />}
                    <div className={cn(
                      'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 bg-background',
                      completed && 'border-brand bg-brand text-primary-foreground',
                      active && 'border-brand text-brand ring-4 ring-brand/10',
                    )}>
                      {completed ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                    </div>
                    <div className="pt-1.5">
                      <p className={cn('font-semibold', !completed && !active && 'text-muted-foreground')}>{ORDER_STATUS_LABELS[status]}</p>
                      {active && <p className="mt-1 text-xs text-brand">Estado actual · se actualiza automáticamente</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl bg-muted/60 p-4 text-sm text-muted-foreground">
              Puedes cerrar esta página y volver usando el mismo enlace. No contiene tu dirección ni teléfono.
            </div>
            <Button asChild variant="outline" className="mt-5 h-11 w-full rounded-full"><Link to="/">Volver al menú</Link></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
