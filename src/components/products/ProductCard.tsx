import { useMemo, useState } from 'react';
import { Plus, Star, Sparkles, Leaf, Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product, Brand } from '@/types';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { trackEvent } from '@/lib/analytics';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

const formatPrice = (price: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

export default function ProductCard({ product, variant = 'default', categoryName }: ProductCardProps) {
  const { addProduct } = useCart();
  const [detailsOpen, setDetailsOpen] = useState(false);
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
  };

  const isCompact = variant === 'compact';

  return (
    <>
      <article
        className={cn(
          'group flex flex-col rounded-xl overflow-hidden border bg-card transition-all duration-200',
          isOhana ? 'border-ohana/15 hover:border-ohana/30' : 'border-chilli-dark/15 hover:border-chilli-dark/30',
        )}
      >
        {/* Color accent bar */}
        <div className={cn('h-0.5', isOhana ? 'bg-gradient-to-r from-ohana to-ohana-dark' : 'bg-gradient-to-r from-chilli to-chilli-dark')} />

        <div className={cn('flex flex-col flex-1', isCompact ? 'p-3 gap-1.5' : 'p-4 gap-2')}>
          {/* Name + Price row — restaurant menu style */}
          <header className="flex items-baseline justify-between gap-3">
            <h3 className={cn(
              'font-semibold leading-tight',
              isCompact ? 'text-sm' : 'text-base',
            )}>
              {product.name}
            </h3>
            <span className={cn(
              'shrink-0 font-bold tabular-nums whitespace-nowrap',
              isCompact ? 'text-sm' : 'text-base',
              isOhana ? 'text-ohana-dark' : 'text-chilli-dark',
            )}>
              {formatPrice(product.price)}
            </span>
          </header>

          {/* Description / ingredients — compact on mobile */}
          {hasDetailContent && !isCompact && (
            <div className="text-sm text-muted-foreground leading-relaxed">
              {descriptionText && <p className="line-clamp-2">{descriptionText}</p>}
              {ingredientsText && !descriptionText && (
                <p className="line-clamp-1 text-xs">{ingredientsText}</p>
              )}
            </div>
          )}

          {shouldShowMore && !isCompact && (
            <button
              type="button"
              onClick={() => setDetailsOpen(true)}
              className="self-start text-xs font-medium underline-offset-2 hover:underline text-muted-foreground hover:text-foreground transition-colors"
            >
              Ver más
            </button>
          )}

          {/* Badges — minimal row */}
          <div className="flex flex-wrap items-center gap-1 mt-auto">
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wider',
              isOhana
                ? 'bg-ohana/10 text-ohana-dark border border-ohana/25'
                : 'bg-chilli-dark/10 text-chilli-dark border border-chilli-dark/25',
            )}>
              {BRAND_LABEL[product.brand]}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border border-border">
              {resolvedCategoryName}
            </span>
            {product.isPopular && (
              <Star className="w-3 h-3 text-accent fill-accent" />
            )}
            {product.isNew && (
              <Sparkles className="w-3 h-3 text-primary" />
            )}
            {product.isVegan && (
              <Leaf className="w-3 h-3 text-ohana" />
            )}
            {product.isGlutenFree && (
              <Wheat className="w-3 h-3 text-amber-600" />
            )}
          </div>

          {/* Large add-to-cart button — tap-friendly */}
          <Button
            onClick={handleAddToCart}
            size="lg"
            className={cn(
              'w-full justify-center rounded-xl font-semibold mt-2 min-h-[48px] text-base active:scale-[0.97] transition-all',
              isOhana
                ? 'bg-ohana text-ohana-foreground hover:bg-ohana-dark shadow-sm shadow-ohana/20'
                : 'bg-gradient-to-r from-chilli to-chilli-dark text-chilli-foreground hover:from-chilli-dark hover:to-chilli-dark shadow-sm shadow-chilli-dark/20',
            )}
          >
            <Plus className="h-5 w-5 mr-1.5" />
            Agregar
          </Button>
        </div>
      </article>

      {/* Detail Dialog */}
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
    </>
  );
}
