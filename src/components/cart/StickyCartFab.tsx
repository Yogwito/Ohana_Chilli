import { ShoppingBag } from 'lucide-react';
import { useCartCount, useCartState } from '@/context/CartContext';
import { cn } from '@/lib/utils';

interface StickyCartFabProps {
  onClick: () => void;
}

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

export default function StickyCartFab({ onClick }: StickyCartFabProps) {
  const count = useCartCount();
  const cart = useCartState();

  if (count === 0) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'fixed bottom-4 left-4 right-4 z-50 lg:hidden',
        'flex items-center justify-between gap-3',
        'bg-ohana text-ohana-foreground',
        'rounded-2xl px-5 py-4 shadow-xl shadow-ohana/30',
        'active:scale-[0.98] transition-all duration-150',
        'min-h-[56px]',
      )}
      aria-label={`Ver carrito con ${count} productos`}
    >
      <div className="flex items-center gap-3">
        <div className="relative">
          <ShoppingBag className="w-6 h-6" />
          <span className="absolute -top-2 -right-2 bg-foreground text-background text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {count}
          </span>
        </div>
        <span className="font-semibold text-base">Ver carrito</span>
      </div>
      <span className="font-bold text-base">{formatPrice(cart.total)}</span>
    </button>
  );
}
