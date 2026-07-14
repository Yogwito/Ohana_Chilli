import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell, BellOff, Bike, Check, ChevronRight, Clock3, MapPin, PackageCheck,
  RefreshCw, Search, ShoppingBag, Store, XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/domain/formatPrice';
import {
  getElapsedMinutes, getUrgencyLevel, NEXT_ORDER_ACTION, NEXT_ORDER_STATUS,
  ORDER_STATUS_LABELS, type OrderStatus,
} from '@/domain/orderStatus';
import { formatProductCustomizationLines } from '@/domain/productCustomizations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type OrderItemRow = {
  id: string;
  order_id: string;
  name: string;
  quantity: number;
  unit_price_cents: number;
  details: Record<string, unknown> | null;
};

export type KanbanOrder = {
  id: string;
  customer_name: string;
  phone: string;
  order_type: 'pickup' | 'delivery';
  address: string | null;
  delivery_zone: string | null;
  delivery_fee_cents: number;
  notes: string | null;
  total_cents: number;
  status: OrderStatus;
  payment_method: 'cash' | 'transfer' | null;
  created_at: string;
  estimated_ready_at: string | null;
  cancellation_reason: string | null;
  items: OrderItemRow[];
};

type Column = {
  id: string;
  title: string;
  statuses: OrderStatus[];
  accent: string;
  icon: typeof ShoppingBag;
};

const COLUMNS: Column[] = [
  { id: 'new', title: 'Nuevos', statuses: ['pending'], accent: 'bg-amber-400', icon: Bell },
  { id: 'confirmed', title: 'Confirmados', statuses: ['confirmed'], accent: 'bg-sky-500', icon: Check },
  { id: 'preparing', title: 'Preparando', statuses: ['preparing'], accent: 'bg-orange-500', icon: Clock3 },
  { id: 'ready', title: 'Listos', statuses: ['ready'], accent: 'bg-emerald-500', icon: PackageCheck },
  { id: 'done', title: 'Finalizados', statuses: ['delivered', 'cancelled'], accent: 'bg-slate-400', icon: Check },
];

function elapsedLabel(order: KanbanOrder, now: Date) {
  const minutes = getElapsedMinutes(order.created_at, now);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

function createAudioContext() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AudioContextClass ? new AudioContextClass() : null;
}

function playNewOrderSound(context: AudioContext) {
  const oscillator = context.createOscillator();
  const secondOscillator = context.createOscillator();
  const gain = context.createGain();
  const now = context.currentTime;
  oscillator.frequency.setValueAtTime(740, now);
  oscillator.frequency.setValueAtTime(920, now + 0.14);
  secondOscillator.frequency.setValueAtTime(1100, now + 0.3);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.58);
  oscillator.connect(gain);
  secondOscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  secondOscillator.start(now + 0.28);
  oscillator.stop(now + 0.3);
  secondOscillator.stop(now + 0.56);
}

function OrderCard({ order, now, onOpen }: { order: KanbanOrder; now: Date; onOpen: () => void }) {
  const urgency = getUrgencyLevel(order.created_at, order.status, now);
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group w-full rounded-2xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        urgency === 'late' && 'border-red-300 bg-red-50/70 dark:border-red-900 dark:bg-red-950/20',
        urgency === 'attention' && 'border-amber-300 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs font-bold tracking-wider text-muted-foreground">#{order.id.slice(0, 8).toUpperCase()}</p>
          <h3 className="mt-1 font-semibold leading-tight">{order.customer_name}</h3>
        </div>
        <span className={cn(
          'inline-flex items-center gap-1 rounded-full px-2 py-1 font-mono text-xs font-bold',
          urgency === 'late' ? 'bg-red-600 text-white' : urgency === 'attention' ? 'bg-amber-400 text-amber-950' : 'bg-muted text-foreground',
        )}>
          <Clock3 className="h-3 w-3" />{elapsedLabel(order, now)}
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        {order.order_type === 'delivery' ? <Bike className="h-4 w-4" /> : <Store className="h-4 w-4" />}
        <span>{order.order_type === 'delivery' ? order.delivery_zone || 'Domicilio' : 'Recoger en tienda'}</span>
        <span aria-hidden="true">·</span>
        <span>{itemCount} {itemCount === 1 ? 'producto' : 'productos'}</span>
      </div>
      {order.notes && <p className="mt-3 line-clamp-2 rounded-lg bg-muted/60 px-2.5 py-2 text-xs">⚠ {order.notes}</p>}
      <div className="mt-4 flex items-center justify-between border-t pt-3">
        <span className="text-xs text-muted-foreground">{order.payment_method === 'transfer' ? 'Transferencia' : 'Contraentrega'}</span>
        <span className="font-bold text-brand">{formatPrice(order.total_cents)}</span>
      </div>
    </button>
  );
}

function OrderDetail({
  order, busy, onTransition, onCancel,
}: {
  order: KanbanOrder;
  busy: boolean;
  onTransition: (status: OrderStatus) => void;
  onCancel: () => void;
}) {
  const nextStatus = NEXT_ORDER_STATUS[order.status];
  return (
    <div className="mt-6 flex h-[calc(100vh-9rem)] flex-col">
      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="mt-1 text-lg font-bold text-brand">{formatPrice(order.total_cents)}</p>
          </div>
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Entrega</p>
            <p className="mt-1 text-sm font-semibold">{order.order_type === 'delivery' ? 'Domicilio' : 'Recoger'}</p>
          </div>
        </div>

        <section>
          <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Productos</h4>
          <div className="mt-3 divide-y rounded-xl border">
            {order.items.map((item) => {
              const customizations = item.details?.customizations as Parameters<typeof formatProductCustomizationLines>[0] | undefined;
              const detailLines = customizations ? formatProductCustomizationLines(customizations) : [];
              return (
                <div key={item.id} className="p-3">
                  <div className="flex justify-between gap-3">
                    <p className="font-medium"><span className="mr-2 font-mono text-brand">{item.quantity}×</span>{item.name}</p>
                    <span className="text-sm font-semibold">{formatPrice(item.unit_price_cents * item.quantity)}</span>
                  </div>
                  {detailLines.map((line) => <p key={line} className="mt-1 pl-7 text-xs text-muted-foreground">{line}</p>)}
                  {typeof item.details?.notes === 'string' && item.details.notes && (
                    <p className="mt-2 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-900">Nota: {item.details.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-2 text-sm">
          <h4 className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Cliente</h4>
          <p className="font-semibold">{order.customer_name}</p>
          <a className="text-brand underline-offset-4 hover:underline" href={`tel:${order.phone}`}>{order.phone}</a>
          {order.address && <p className="flex gap-2 text-muted-foreground"><MapPin className="mt-0.5 h-4 w-4 shrink-0" />{order.address}</p>}
          {order.notes && <p className="rounded-xl bg-amber-50 p-3 text-amber-950 dark:bg-amber-950/30 dark:text-amber-100">{order.notes}</p>}
        </section>
      </div>

      <div className="space-y-2 border-t bg-background pt-4 pb-[max(0px,env(safe-area-inset-bottom))]">
        {nextStatus && (
          <Button className="h-12 w-full rounded-xl text-base" disabled={busy} onClick={() => onTransition(nextStatus)}>
            {NEXT_ORDER_ACTION[order.status]}<ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {!['delivered', 'cancelled'].includes(order.status) && (
          <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive" disabled={busy} onClick={onCancel}>
            <XCircle className="mr-2 h-4 w-4" />Cancelar pedido
          </Button>
        )}
      </div>
    </div>
  );
}

export default function OrdersKanban() {
  const [orders, setOrders] = useState<KanbanOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<KanbanOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [search, setSearch] = useState('');
  const [orderType, setOrderType] = useState<'all' | 'pickup' | 'delivery'>('all');
  const [mobileColumn, setMobileColumn] = useState('new');
  const [alertsArmed, setAlertsArmed] = useState(false);
  const [now, setNow] = useState(new Date());
  const audioContextRef = useRef<AudioContext | null>(null);

  const fetchOrders = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    const { data: orderRows, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(150);
    if (error) {
      toast.error('No se pudieron cargar los pedidos');
      setLoading(false);
      return;
    }
    const ids = (orderRows ?? []).map((order) => order.id);
    const { data: itemRows } = ids.length
      ? await supabase.from('order_items').select('*').in('order_id', ids)
      : { data: [] };
    const byOrder = (itemRows ?? []).reduce<Record<string, OrderItemRow[]>>((acc, raw) => {
      const item = raw as unknown as OrderItemRow;
      (acc[item.order_id] ??= []).push(item);
      return acc;
    }, {});
    setOrders((orderRows ?? []).map((row) => ({ ...row, items: byOrder[row.id] ?? [] })) as unknown as KanbanOrder[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrders(true); }, [fetchOrders]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const pendingOrders = useMemo(() => orders.filter((order) => order.status === 'pending'), [orders]);
  useEffect(() => {
    if (!alertsArmed || pendingOrders.length === 0 || !audioContextRef.current) return;
    const ring = () => {
      const context = audioContextRef.current;
      if (!context) return;
      if (context.state === 'suspended') context.resume();
      playNewOrderSound(context);
    };
    ring();
    const alarm = window.setInterval(ring, 12000);
    return () => window.clearInterval(alarm);
  }, [alertsArmed, pendingOrders.length]);
  useEffect(() => {
    const originalTitle = document.title;
    if (pendingOrders.length > 0) document.title = `(${pendingOrders.length}) Pedidos nuevos · Ohana`;
    return () => { document.title = originalTitle; };
  }, [pendingOrders.length]);
  useEffect(() => () => {
    audioContextRef.current?.close();
    audioContextRef.current = null;
  }, []);
  useEffect(() => {
    const channel = supabase.channel('orders-kanban-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (payload) => {
        if ((payload.new as { status?: string }).status === 'pending') {
          toast.success('Nuevo pedido recibido', { duration: 8000 });
        }
        fetchOrders();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => fetchOrders())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesType = orderType === 'all' || order.order_type === orderType;
      const matchesSearch = !query || order.customer_name.toLowerCase().includes(query)
        || order.phone.includes(query) || order.id.toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [orderType, orders, search]);

  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;
  const armAlerts = async () => {
    if (!audioContextRef.current) audioContextRef.current = createAudioContext();
    if (!audioContextRef.current) {
      toast.error('Este navegador no permite reproducir alertas de sonido');
      return;
    }
    await audioContextRef.current.resume();
    playNewOrderSound(audioContextRef.current);
    setAlertsArmed(true);
    toast.success('Turno iniciado · alertas activas');
  };
  const pauseAlerts = () => {
    setAlertsArmed(false);
    toast.info('Alertas de sonido pausadas');
  };
  const moveOrder = async (order: KanbanOrder, status: OrderStatus) => {
    setBusy(true);
    const { data, error } = await supabase.rpc('transition_order_status' as never, {
      p_order_id: order.id,
      p_new_status: status,
      p_cancellation_reason: null,
    } as never);
    setBusy(false);
    if (error) return toast.error('No se pudo actualizar el pedido');
    const updated = data as unknown as Partial<KanbanOrder>;
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...updated } : item));
    toast.success(`${ORDER_STATUS_LABELS[status]} · #${order.id.slice(0, 8).toUpperCase()}`);
  };
  const cancelOrder = async () => {
    if (!cancelTarget || cancelReason.trim().length < 3) return;
    const order = cancelTarget;
    setBusy(true);
    const { data, error } = await supabase.rpc('transition_order_status' as never, {
      p_order_id: order.id,
      p_new_status: 'cancelled',
      p_cancellation_reason: cancelReason.trim(),
    } as never);
    setBusy(false);
    if (error) return toast.error('No se pudo cancelar el pedido');
    const updated = data as unknown as Partial<KanbanOrder>;
    setOrders((current) => current.map((item) => item.id === order.id ? { ...item, ...updated } : item));
    setCancelTarget(null);
    setCancelReason('');
    toast.success('Pedido cancelado');
  };

  if (loading) return <div className="grid gap-4 md:grid-cols-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-72 rounded-2xl" />)}</div>;

  return (
    <div className="space-y-4">
      {!alertsArmed ? (
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <div className="flex items-start gap-3">
            <span className="relative mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-400 text-amber-950">
              <BellOff className="h-5 w-5" />
            </span>
            <div>
              <p className="font-bold">Las alertas están pausadas</p>
              <p className="mt-1 text-sm opacity-80">Inicia el turno para escuchar los pedidos nuevos. El navegador requiere esta activación manual.</p>
            </div>
          </div>
          <Button onClick={armAlerts} className="h-11 shrink-0 rounded-xl bg-amber-950 text-amber-50 hover:bg-amber-900 dark:bg-amber-400 dark:text-amber-950 dark:hover:bg-amber-300">
            <Bell className="mr-2 h-4 w-4" />Iniciar turno y activar alertas
          </Button>
        </div>
      ) : pendingOrders.length > 0 ? (
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-red-500 bg-red-50 p-4 text-red-950 shadow-sm dark:bg-red-950/30 dark:text-red-100 sm:flex-row sm:items-center sm:justify-between" role="alert" aria-live="assertive">
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-600 text-white motion-safe:animate-pulse">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 font-mono text-[10px] font-black text-red-700">{pendingOrders.length}</span>
            </span>
            <div>
              <p className="font-black">{pendingOrders.length === 1 ? 'Hay un pedido esperando aceptación' : `Hay ${pendingOrders.length} pedidos esperando aceptación`}</p>
              <p className="mt-1 text-sm opacity-80">La alarma continuará hasta aceptar o cancelar todos los pedidos nuevos.</p>
            </div>
          </div>
          <Button onClick={() => setSelectedOrderId(pendingOrders[0].id)} className="h-11 shrink-0 rounded-xl bg-red-600 text-white hover:bg-red-700">
            Revisar primer pedido<ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
          <span className="flex items-center gap-2 font-medium"><Bell className="h-4 w-4" />Alertas activas · no hay pedidos pendientes</span>
          <button type="button" onClick={pauseAlerts} className="min-h-9 rounded-lg px-2 text-xs font-semibold underline-offset-4 hover:underline">Pausar</button>
        </div>
      )}

      <div className="rounded-2xl border bg-card p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-brand">Centro de pedidos</p>
            <h2 className="text-xl font-black sm:text-2xl">Operación en vivo</h2>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, teléfono o pedido" className="h-11 rounded-xl pl-9" />
            </div>
            <div className="grid grid-cols-3 rounded-xl bg-muted p-1 text-xs">
              {([['all', 'Todos'], ['pickup', 'Recoger'], ['delivery', 'Domicilio']] as const).map(([value, label]) => (
                <button key={value} onClick={() => setOrderType(value)} className={cn('min-h-9 rounded-lg px-3 font-medium', orderType === value && 'bg-background shadow-sm')}>{label}</button>
              ))}
            </div>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={alertsArmed ? pauseAlerts : armAlerts} aria-label={alertsArmed ? 'Pausar sonido' : 'Activar sonido'}>
              {alertsArmed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl" onClick={() => fetchOrders(true)} aria-label="Actualizar pedidos"><RefreshCw className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <Tabs value={mobileColumn} onValueChange={setMobileColumn} className="lg:hidden">
        <TabsList className="flex h-auto w-full justify-start overflow-x-auto rounded-xl p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {COLUMNS.map((column) => {
            const count = filtered.filter((order) => column.statuses.includes(order.status)).length;
            return <TabsTrigger key={column.id} value={column.id} className="min-h-10 shrink-0 gap-2">{column.title}<Badge variant="secondary" className="h-5 min-w-5 px-1.5">{count}</Badge></TabsTrigger>;
          })}
        </TabsList>
      </Tabs>

      <div className="lg:grid lg:grid-cols-5 lg:gap-3">
        {COLUMNS.map((column) => {
          const columnOrders = filtered.filter((order) => column.statuses.includes(order.status));
          const Icon = column.icon;
          return (
            <section key={column.id} className={cn('min-w-0 rounded-2xl bg-muted/50 p-2 sm:p-3', mobileColumn !== column.id && 'hidden lg:block')} aria-labelledby={`column-${column.id}`}>
              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2"><span className={cn('h-2.5 w-2.5 rounded-full', column.accent)} /><Icon className="h-4 w-4 text-muted-foreground" /><h3 id={`column-${column.id}`} className="font-bold">{column.title}</h3></div>
                <span className="rounded-full bg-background px-2 py-0.5 font-mono text-xs font-bold shadow-sm">{columnOrders.length}</span>
              </div>
              <div className="space-y-3 lg:max-h-[calc(100vh-15rem)] lg:overflow-y-auto lg:pr-1">
                {columnOrders.length ? columnOrders.map((order) => <OrderCard key={order.id} order={order} now={now} onOpen={() => setSelectedOrderId(order.id)} />) : (
                  <div className="rounded-xl border border-dashed p-6 text-center text-xs text-muted-foreground">Sin pedidos en esta etapa</div>
                )}
              </div>
            </section>
          );
        })}
      </div>

      <Sheet open={Boolean(selectedOrder)} onOpenChange={(open) => !open && setSelectedOrderId(null)}>
        <SheetContent side="right" className="w-full overflow-hidden p-5 sm:max-w-lg">
          {selectedOrder && <>
            <SheetHeader className="text-left">
              <SheetDescription className="font-mono font-bold tracking-wider">#{selectedOrder.id.slice(0, 8).toUpperCase()} · {ORDER_STATUS_LABELS[selectedOrder.status]}</SheetDescription>
              <SheetTitle className="text-2xl">{selectedOrder.customer_name}</SheetTitle>
            </SheetHeader>
            <OrderDetail order={selectedOrder} busy={busy} onTransition={(status) => moveOrder(selectedOrder, status)} onCancel={() => setCancelTarget(selectedOrder)} />
          </>}
        </SheetContent>
      </Sheet>

      <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => { if (!open) { setCancelTarget(null); setCancelReason(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar pedido</DialogTitle>
            <DialogDescription>
              El motivo será visible para el cliente en su pantalla de seguimiento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="cancellation-reason">Motivo de cancelación</Label>
            <Textarea
              id="cancellation-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Ej. El ingrediente principal se agotó"
              rows={4}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelReason(''); }}>Volver</Button>
            <Button variant="destructive" disabled={busy || cancelReason.trim().length < 3} onClick={cancelOrder}>
              {busy ? 'Cancelando...' : 'Confirmar cancelación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
