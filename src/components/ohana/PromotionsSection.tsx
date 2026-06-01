import { useState } from 'react';
import { AnimatedElement } from '@/components/ui/AnimatedElement';
import { Skeleton } from '@/components/ui/skeleton';
import { usePromotions } from '@/hooks/use-catalog';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';
import { Check, Plus } from 'lucide-react';
import type { Promotion, Product } from '@/types';

function formatPrice(cents: number): string {
  return `$ ${cents.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

function formatDiscountLabel(promo: Promotion): string | null {
  if (promo.discount_type === 'percentage') return `${promo.discount_value}% OFF`;
  if (promo.discount_type === 'fixed') {
    const formatted = promo.discount_value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `-$${formatted}`;
  }
  return null;
}

function formatEndDate(endsAt: string): string {
  return new Date(endsAt).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function promoToProduct(promo: Promotion): Product {
  return {
    id: `promo-${promo.id}`,
    name: promo.title,
    description: promo.description ?? '',
    price: promo.price_cents!,
    brand: 'ohana',
    categoryId: 'promociones',
    imageUrl: promo.image_url ?? undefined,
    isVegan: false,
    isGlutenFree: false,
    isPopular: false,
    isNew: false,
  };
}

function PromotionCard({ promo }: { promo: Promotion }) {
  const { addProduct } = useCart();
  const [added, setAdded] = useState(false);

  const discountLabel = formatDiscountLabel(promo);
  const displayBadge = promo.badge_text ?? discountLabel;
  const isAddable = promo.type === 'combo' && promo.price_cents != null;

  const handleAddToCart = () => {
    if (!isAddable) return;
    const product = promoToProduct(promo);
    addProduct(product);
    trackEvent({ type: 'add_to_cart', productId: product.id, productName: product.name, brand: 'ohana', priceCents: product.price });
    toast.success(`${promo.title} agregado al carrito`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div
      className={cn(
        'bg-card rounded-2xl overflow-hidden border border-border/50',
        'shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5',
        'flex flex-col',
      )}
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        {promo.image_url ? (
          <img
            src={promo.image_url}
            alt={promo.title}
            className="w-full h-36 object-cover rounded-t-xl"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-36 bg-brand/20 rounded-t-xl flex items-center justify-center">
            <span className="text-4xl" aria-hidden="true">🏷️</span>
          </div>
        )}
        {/* Discount chip */}
        {discountLabel && promo.discount_type !== 'label' && (
          <span className="absolute top-2.5 left-2.5 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            {discountLabel}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 space-y-1.5 flex flex-col flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-base leading-tight text-foreground">{promo.title}</p>
          {displayBadge && (
            <span className="shrink-0 bg-brand text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
              {displayBadge}
            </span>
          )}
        </div>

        {promo.description && (
          <p className="text-sm text-muted-foreground leading-snug line-clamp-2">{promo.description}</p>
        )}

        {promo.ends_at && (
          <p className="text-xs text-muted-foreground">
            Válido hasta: {formatEndDate(promo.ends_at)}
          </p>
        )}

        <div className="pt-1 mt-auto space-y-2">
          {/* Precio + botón agregar (combos con precio) */}
          {isAddable && (
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-lg text-brand">
                {formatPrice(promo.price_cents!)}
              </span>
              <button
                onClick={handleAddToCart}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200',
                  added
                    ? 'bg-brand-dark text-white scale-95'
                    : 'bg-brand text-white hover:bg-brand/90 active:scale-95',
                )}
              >
                {added ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {added ? 'Agregado' : 'Agregar'}
              </button>
            </div>
          )}

          {/* CTA link (promociones informativas con cta_url) */}
          {promo.cta_text && !isAddable && (
            promo.cta_url ? (
              <a
                href={promo.cta_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg w-full text-center hover:bg-brand/90 transition-colors"
              >
                {promo.cta_text}
              </a>
            ) : (
              <div className="bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg w-full text-center">
                {promo.cta_text}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

function PromotionCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm">
      <Skeleton className="w-full h-36 rounded-t-xl" />
      <div className="p-3.5 space-y-2">
        <Skeleton className="h-5 w-3/4 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-3 w-1/3 rounded" />
      </div>
    </div>
  );
}

export default function PromotionsSection() {
  const { data: promotions = [], isLoading } = usePromotions();

  if (!isLoading && promotions.length === 0) return null;

  return (
    <div className="container max-w-4xl py-4">
      <AnimatedElement animation="fade-up">
        <div className="mb-4">
          <h2 className="font-display font-bold text-2xl text-foreground dark:text-white">
            🔥 Promociones
          </h2>
          <div className="mt-1.5 h-[3px] w-9 rounded-full bg-brand" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <PromotionCardSkeleton key={i} />)}
          </div>
        ) : (
          <div
            className={cn(
              'sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4',
              'flex gap-3 overflow-x-auto scrollbar-hide pb-1 sm:overflow-visible sm:pb-0',
            )}
          >
            {promotions.map((promo) => (
              <div key={promo.id} className="min-w-[75vw] sm:min-w-0">
                <PromotionCard promo={promo} />
              </div>
            ))}
          </div>
        )}
      </AnimatedElement>
    </div>
  );
}
