import { AnimatedElement } from '@/components/ui/AnimatedElement';
import { Skeleton } from '@/components/ui/skeleton';
import { usePromotions } from '@/hooks/use-catalog';
import { cn } from '@/lib/utils';
import type { Promotion } from '@/types';

function formatDiscountLabel(promo: Promotion): string | null {
  if (promo.discount_type === 'percentage') return `${promo.discount_value}% OFF`;
  if (promo.discount_type === 'fixed') {
    const formatted = promo.discount_value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `-$${formatted}`;
  }
  return null;
}

function formatEndDate(endsAt: string): string {
  return new Date(endsAt).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
  });
}

function PromotionCard({ promo }: { promo: Promotion }) {
  const discountLabel = formatDiscountLabel(promo);
  const displayBadge = promo.badge_text ?? discountLabel;

  return (
    <div
      className={cn(
        'bg-card rounded-2xl overflow-hidden border border-border/50',
        'shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5',
      )}
    >
      {/* Image */}
      <div className="relative aspect-video overflow-hidden">
        {promo.image_url ? (
          <img
            src={promo.image_url}
            alt={promo.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-brand/30 to-brand-dark/50 flex items-center justify-center">
            <span className="text-4xl" aria-hidden="true">🏷️</span>
          </div>
        )}
        {/* Discount chip overlaid on image */}
        {discountLabel && promo.discount_type !== 'label' && (
          <span className="absolute top-2.5 left-2.5 bg-brand text-white text-xs font-bold px-2 py-0.5 rounded-full shadow">
            {discountLabel}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5 space-y-1.5">
        <div className="flex items-start justify-between gap-2">
          <p className="font-bold text-lg leading-tight text-foreground">{promo.title}</p>
          {displayBadge && (
            <span className="shrink-0 bg-brand text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
              {displayBadge}
            </span>
          )}
        </div>

        {promo.description && (
          <p className="text-sm text-muted-foreground leading-snug">{promo.description}</p>
        )}

        {promo.ends_at && (
          <p className="text-xs text-muted-foreground">
            Válido hasta {formatEndDate(promo.ends_at)}
          </p>
        )}
      </div>
    </div>
  );
}

function PromotionCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl overflow-hidden border border-border/50 shadow-sm">
      <Skeleton className="aspect-video w-full" />
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
          <div className="mt-1.5 h-0.5 w-10 rounded-full bg-brand" />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <PromotionCardSkeleton key={i} />)}
          </div>
        ) : (
          <div
            className={cn(
              'md:grid md:grid-cols-3 md:gap-4',
              'flex gap-3 overflow-x-auto scrollbar-hide pb-1 md:overflow-visible md:pb-0',
            )}
          >
            {promotions.map((promo) => (
              <div key={promo.id} className="min-w-[75vw] sm:min-w-[60vw] md:min-w-0">
                <PromotionCard promo={promo} />
              </div>
            ))}
          </div>
        )}
      </AnimatedElement>
    </div>
  );
}
