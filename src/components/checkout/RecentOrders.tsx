import { useState } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPrice } from '@/domain/formatPrice';
import { useOrderHistory, type HistoryOrder, type HistoryOrderItem } from '@/hooks/use-order-history';
import { useCartActions } from '@/context/CartContext';
import { useProducts, useBowlRules, useIngredients } from '@/hooks/use-catalog';
import type { CustomBowl, Ingredient, BowlSizeRule } from '@/types';
import { toast } from 'sonner';

interface Props {
  phone: string;
}

function buildCustomBowl(
  item: HistoryOrderItem,
  bowlRules: BowlSizeRule[],
  ingredients: Ingredient[],
): CustomBowl | null {
  const d = item.details;
  if (!d?.size) return null;

  const sizeRule = bowlRules.find((r) => r.name === d.size || r.size === d.size?.toLowerCase());
  if (!sizeRule) return null;

  const findByName = (names: string[] | undefined, type: Ingredient['type']): Ingredient[] =>
    (names ?? [])
      .map((n) => ingredients.find((i) => i.name === n && i.type === type))
      .filter((i): i is Ingredient => Boolean(i));

  return {
    size: sizeRule,
    bases: findByName(d.bases, 'base'),
    proteins: findByName(d.proteins, 'protein'),
    acompanantes: findByName(d.acompanantes, 'acompanante'),
    sauces: findByName(d.sauces, 'sauce'),
    complementos: findByName(d.complementos, 'topping'),
    notes: d.notes,
  };
}

function OrderCard({ order, onRepeat }: { order: HistoryOrder; onRepeat: () => void }) {
  const [expanded, setExpanded] = useState(false);

  const dateLabel = new Date(order.created_at).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3 text-left gap-3"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {order.items.map((i) => i.name).join(', ')}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dateLabel} · {formatPrice(order.total_cents)}
            {order.order_type === 'delivery' ? ' · Domicilio' : ' · Recogida'}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t pt-3">
          <ul className="space-y-1">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between text-sm gap-2">
                <span className="text-muted-foreground">
                  {item.quantity > 1 && <span className="font-medium text-foreground mr-1">{item.quantity}×</span>}
                  {item.name}
                </span>
                <span className="shrink-0 font-medium">{formatPrice(item.unit_price_cents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <Button
            type="button"
            size="sm"
            className="w-full btn-ohana gap-2"
            onClick={onRepeat}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Repetir este pedido
          </Button>
        </div>
      )}
    </div>
  );
}

export default function RecentOrders({ phone }: Props) {
  const { data: orders, isLoading } = useOrderHistory(phone);
  const { addProduct, addCustomBowl, clearCart } = useCartActions();
  const { data: products = [] } = useProducts({ brandId: 'ohana' });
  const { data: bowlRules = [] } = useBowlRules();
  const { data: ingredients = [] } = useIngredients();

  const cleanPhone = phone.replace(/\D/g, '').slice(-10);
  if (cleanPhone.length < 10) return null;

  if (isLoading) {
    return (
      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pedidos anteriores</p>
        <Skeleton className="h-14 rounded-xl" />
      </div>
    );
  }

  if (!orders || orders.length === 0) return null;

  const handleRepeat = (order: HistoryOrder) => {
    let added = 0;

    clearCart();

    for (const item of order.items) {
      if (item.details?.product_id) {
        const product = products.find((p) => p.id === item.details?.product_id);
        if (product) {
          addProduct(product, item.quantity, item.details.notes ?? undefined);
          added++;
        }
      } else if (item.details?.size) {
        const bowl = buildCustomBowl(item, bowlRules, ingredients);
        if (bowl && (bowl.bases.length > 0 || bowl.proteins.length > 0)) {
          addCustomBowl(bowl, item.details.notes ?? undefined);
          added++;
        }
      }
    }

    if (added === 0) {
      toast.error('No se pudo recuperar el pedido — algunos productos ya no están disponibles.');
    } else if (added < order.items.length) {
      toast.warning(`Se agregaron ${added} de ${order.items.length} ítems. Algunos ya no están disponibles.`);
    } else {
      toast.success('Pedido anterior cargado en tu carrito 🎉');
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tus pedidos anteriores</p>
      {orders.map((order) => (
        <OrderCard key={order.id} order={order} onRepeat={() => handleRepeat(order)} />
      ))}
    </div>
  );
}
