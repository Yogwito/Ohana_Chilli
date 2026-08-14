import { useState } from 'react';
import { AnimatedElement } from '@/components/ui/AnimatedElement';
import { Skeleton } from '@/components/ui/skeleton';
import { usePromotions } from '@/hooks/use-catalog';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';
import { Check, Plus } from 'lucide-react';
import { formatPrice } from '@/domain/formatPrice';
import type { Promotion, Product } from '@/types';

function formatDiscountLabel(promo: Promotion): string | null {
  if (promo.discount_type === 'percentage') return `${promo.discount_value}% OFF`;
  if (promo.discount_type === 'fixed') return `-${formatPrice(promo.discount_value)}`;
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
        'flex flex-col overflow-hidden rounded-md border bg-card',
        'transition-colors duration-150 hover:border-foreground/30',
      )}
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        {promo.image_url ? (
          <>
            <img
              src={promo.image_url}
              alt={promo.title}
              className="h-44 w-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/30 to-transparent" />
          </>
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-brand-muted">
            <span className="font-display text-5xl font-black text-brand-dark/35" aria-hidden="true">OHANA</span>
          </div>
        )}
        {/* Discount chip */}
        {discountLabel && promo.discount_type !== 'label' && (
          <span className="absolute left-3 top-3 rounded-sm bg-[hsl(var(--tomate))] px-2 py-1 font-utility text-[10px] font-bold uppercase text-white">
            {discountLabel}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-extrabold leading-tight text-foreground">{promo.title}</p>
          {displayBadge && (
            <span className="shrink-0 whitespace-nowrap rounded-sm bg-brand-muted px-2 py-1 font-utility text-[9px] font-semibold uppercase text-brand-dark">
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
              <span className="font-utility text-base font-semibold text-brand-dark dark:text-brand">
                {formatPrice(promo.price_cents!)}
              </span>
              <button
                onClick={handleAddToCart}
                className={cn(
                  'flex min-h-10 items-center gap-1.5 rounded-md px-4 py-2 text-sm font-bold transition-colors',
                  added
                    ? 'bg-brand text-white'
                    : 'bg-primary text-primary-foreground hover:bg-[hsl(var(--mesa-light))]',
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
                className="block w-full rounded-md bg-primary px-4 py-2 text-center text-sm font-bold text-primary-foreground transition-colors hover:bg-[hsl(var(--mesa-light))]"
              >
                {promo.cta_text}
              </a>
            ) : (
              <div className="w-full rounded-md bg-primary px-4 py-2 text-center text-sm font-bold text-primary-foreground">
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
    <div className="overflow-hidden rounded-md border bg-card">
      <Skeleton className="h-44 w-full rounded-none" />
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
    <section className="border-b bg-card/50">
      <div className="container py-10 sm:py-12">
      <AnimatedElement animation="fade-up">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="section-kicker">Disponibles ahora</p>
            <h2 className="mt-1 text-4xl text-foreground sm:text-5xl">
              Promociones
            </h2>
          </div>
          <p className="hidden max-w-xs text-right text-sm text-muted-foreground sm:block">
            Combos y beneficios vigentes, sin buscar cupones.
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => <PromotionCardSkeleton key={i} />)}
          </div>
        ) : (
          <div
            className={cn(
              'flex gap-3 overflow-x-auto pb-1 scrollbar-hide',
              'sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:pb-0 lg:grid-cols-3',
            )}
          >
            {promotions.map((promo) => (
              <div key={promo.id} className="min-w-[82vw] sm:min-w-0">
                <PromotionCard promo={promo} />
              </div>
            ))}
          </div>
        )}
      </AnimatedElement>
      </div>
    </section>
  );
}
