import { useMemo, useState } from 'react';
import { Plus, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Product, Brand } from '@/types';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPrice } from '@/domain/formatPrice';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact';
  categoryName?: string;
}

const BRAND_LABEL: Record<Brand, string> = {
  ohana: 'Ohana',
  chilli: 'Chilli',
};

const CATEGORY_TOKEN_LABELS: Record<string, string> = {
  premade: 'Preparados', custom: 'Personalizados', bowls: 'Bowls', bowl: 'Bowl',
  sugeridos: 'Sugeridos', burgers: 'Hamburguesas', hamburguesas: 'Hamburguesas',
  hotdogs: 'Hot Dogs', hotdog: 'Hot Dogs', fries: 'Papas', papas: 'Papas',
  mazorcadas: 'Mazorcadas', nachos: 'Nachos', sodas: 'Refrescos', juices: 'Jugos',
  jugos: 'Jugos', water: 'Agua', agua: 'Agua', beverages: 'Bebidas',
  bebidas: 'Bebidas', cafe: 'Café',
};

function humanizeCategoryId(categoryId: string): string {
  const tokens = categoryId.trim().replace(/[_\s]+/g, '-').toLowerCase()
    .split('-').filter(Boolean).filter((t) => t !== 'ohana' && t !== 'chilli');
  if (tokens.length === 0) return 'Menú';
  return tokens.map((t) => CATEGORY_TOKEN_LABELS[t] ?? t.charAt(0).toUpperCase() + t.slice(1)).join(' ');
}

export default function ProductCard({ product, variant = 'default', categoryName }: ProductCardProps) {
  const { addProduct } = useCart();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [added, setAdded] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const isOhana = product.brand === 'ohana';

  const descriptionText = product.description.trim();
  const ingredientsText = useMemo(() => {
    if (!product.ingredients || product.ingredients.length === 0) return '';
    return product.ingredients.join(', ');
  }, [product.ingredients]);

  const hasDetailContent = Boolean(descriptionText || ingredientsText);
  const shouldShowMore =
    descriptionText.length > 120 || ingredientsText.length > 90 || (product.ingredients?.length ?? 0) > 5;
  const resolvedCategoryName = categoryName ?? humanizeCategoryId(product.categoryId);

  const handleAddToCart = () => {
    addProduct(product);
    trackEvent({ type: 'add_to_cart', productId: product.id, productName: product.name, brand: product.brand, priceCents: product.price });
    toast.success(`${product.name} agregado`, { description: formatPrice(product.price) });
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <article
        className={cn(
          'group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
          isOhana ? 'border-ohana/15 hover:border-ohana/40' : 'border-chilli-dark/15 hover:border-chilli-dark/40',
        )}
      >
        <div
          className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center shrink-0 text-2xl font-black opacity-60',
            isOhana ? 'bg-ohana/10 text-ohana' : 'bg-chilli-dark/10 text-chilli-dark',
          )}
        >
          {product.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold tracking-tight truncate">{product.name}</p>
          <p className={cn('text-sm font-bold', isOhana ? 'text-ohana-dark' : 'text-chilli-dark')}>
            {formatPrice(product.price)}
          </p>
        </div>
        <Button
          onClick={handleAddToCart}
          size="icon"
          className={cn(
            'rounded-full h-8 w-8 shrink-0 transition-all duration-200',
            isOhana
              ? 'bg-ohana/10 text-ohana-dark hover:bg-ohana hover:text-white'
              : 'bg-chilli-dark/10 text-chilli-dark hover:bg-chilli-dark hover:text-white',
          )}
        >
          {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </Button>
      </article>
    );
  }

  return (
    <>
      <article
        className={cn(
          'group flex flex-col rounded-xl overflow-hidden border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
          isOhana ? 'border-ohana/15 hover:border-ohana/40' : 'border-chilli-dark/15 hover:border-chilli-dark/40',
        )}
      >
        {/* Image or color header strip */}
        {product.imageUrl ? (
          <div className="relative aspect-video overflow-hidden">
            {!imageLoaded && <Skeleton className="absolute inset-0 rounded-none" />}
            <img
              src={product.imageUrl}
              alt={product.name}
              loading="lazy"
              onLoad={() => setImageLoaded(true)}
              className={cn(
                'w-full h-full object-cover transition-opacity duration-300',
                imageLoaded ? 'opacity-100' : 'opacity-0',
              )}
            />
          </div>
        ) : (
          <div
            className={cn(
              'h-16 flex items-center justify-center overflow-hidden',
              isOhana
                ? 'bg-gradient-to-r from-ohana to-ohana-dark'
                : 'bg-gradient-to-r from-chilli to-chilli-dark',
            )}
          >
            <span className="text-7xl font-black text-white/10 select-none leading-none">
              {product.name.charAt(0)}
            </span>
          </div>
        )}

        <div className="flex flex-col flex-1 p-4 gap-2">
          {/* Category badge */}
          <span
            className={cn(
              'self-start text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide',
              isOhana
                ? 'bg-ohana/10 text-ohana-dark border border-ohana/20'
                : 'bg-chilli-dark/10 text-chilli-dark border border-chilli-dark/20',
            )}
          >
            {resolvedCategoryName}
          </span>

          {/* Name */}
          <h3 className="text-base font-semibold tracking-tight leading-tight">{product.name}</h3>

          {/* Description */}
          {hasDetailContent && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {descriptionText || ingredientsText}
            </p>
          )}

          {shouldShowMore && (
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="self-start text-xs font-medium text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
            >
              Ver más
            </button>
          )}

          {/* Footer: price + badges + button */}
          <div className="mt-auto pt-2">
            <div className="flex items-center gap-2 mb-3">
              <span className={cn('text-lg font-bold', isOhana ? 'text-ohana-dark' : 'text-chilli-dark')}>
                {formatPrice(product.price)}
              </span>
              <div className="flex items-center gap-1.5 ml-auto">
                {product.isVegan && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Vegano" />}
                {product.isGlutenFree && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Sin gluten" />}
                {product.isPopular && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                {product.isNew && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium border border-blue-200">
                    nuevo
                  </span>
                )}
              </div>
            </div>

            <Button
              onClick={handleAddToCart}
              className={cn(
                'w-full rounded-full h-10 font-semibold transition-all duration-200',
                added && 'scale-105',
                isOhana
                  ? 'bg-ohana/10 text-ohana-dark hover:bg-ohana hover:text-white'
                  : 'bg-chilli-dark/10 text-chilli-dark hover:bg-chilli-dark hover:text-white',
              )}
            >
              {added ? <Check className="h-4 w-4 mr-1.5 animate-scale-in" /> : <Plus className="h-4 w-4 mr-1.5" />}
              {added ? '¡Agregado!' : 'Agregar'}
            </Button>
          </div>
        </div>
      </article>

      {shouldShowMore && (
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{product.name}</DialogTitle>
              <DialogDescription className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
                <span>{formatPrice(product.price)}</span>
                <span className="text-border">•</span>
                <span>{BRAND_LABEL[product.brand]}</span>
                <span className="text-border">•</span>
                <span>{resolvedCategoryName}</span>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 text-sm">
              {descriptionText && <p className="leading-relaxed">{descriptionText}</p>}
              {ingredientsText && (
                <div className="space-y-1">
                  <p className="font-semibold">Ingredientes</p>
                  <p className="leading-relaxed text-muted-foreground">{ingredientsText}</p>
                </div>
              )}
              {product.calories && <p className="text-xs text-muted-foreground">{product.calories} kcal</p>}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
