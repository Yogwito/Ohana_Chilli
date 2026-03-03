import { useMemo, useState } from 'react';
import { Plus, Star, Sparkles, Leaf, Wheat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product, Brand } from '@/types';
import { useCart } from '@/context/CartContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
    toast.success(`${product.name} agregado al carrito`, { description: formatPrice(product.price) });
  };

  const isCompact = variant === 'compact';

  return (
    <>
      <article
        className={cn(
          'flex flex-col h-full rounded-2xl overflow-hidden border bg-card shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5',
          isOhana ? 'border-ohana/15 hover:border-ohana/30' : 'border-chilli-dark/15 hover:border-chilli-dark/30',
        )}
      >
        {/* Color accent bar */}
        <div className={cn('h-1', isOhana ? 'bg-gradient-to-r from-ohana to-ohana-dark' : 'bg-gradient-to-r from-chilli to-chilli-dark')} />

        <div className={cn('flex flex-col flex-1', isCompact ? 'p-3 sm:p-4 gap-2' : 'p-4 sm:p-5 gap-3')}>
          {/* Header */}
          <header className="flex items-start justify-between gap-3">
            <h3 className={cn('text-base font-semibold leading-tight', isCompact && 'text-sm')}>
              {product.name}
            </h3>
            <span className={cn(
              'shrink-0 font-bold tabular-nums',
              isCompact ? 'text-sm' : 'text-base sm:text-lg',
              isOhana ? 'text-ohana-dark' : 'text-chilli-dark',
            )}>
              {formatPrice(product.price)}
            </span>
          </header>

          {/* Description */}
          {hasDetailContent && !isCompact && (
            <div className="space-y-1 text-sm text-muted-foreground leading-relaxed">
              {descriptionText && <p className="line-clamp-2">{descriptionText}</p>}
              {ingredientsText && (
                <p className="line-clamp-2">
                  <span className="font-medium text-foreground/80">Ingredientes: </span>
                  {ingredientsText}
                </p>
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

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-auto">
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider',
              isOhana
                ? 'bg-ohana/10 text-ohana-dark border border-ohana/25'
                : 'bg-chilli-dark/10 text-chilli-dark border border-chilli-dark/25',
            )}>
              {BRAND_LABEL[product.brand]}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-muted text-muted-foreground border border-border">
              {resolvedCategoryName}
            </span>
            {product.isPopular && (
              <span className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent-foreground border border-accent/30">
                <Star className="w-2.5 h-2.5" /> Popular
              </span>
            )}
            {product.isNew && (
              <span className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="w-2.5 h-2.5" /> Nuevo
              </span>
            )}
            {product.isVegan && (
              <span className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-ohana/10 text-ohana-dark border border-ohana/20">
                <Leaf className="w-2.5 h-2.5" /> Vegano
              </span>
            )}
            {product.isGlutenFree && (
              <span className="flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/25">
                <Wheat className="w-2.5 h-2.5" /> Sin gluten
              </span>
            )}
          </div>

          {/* Add button */}
          <div className="pt-3 border-t border-border/60">
            <Button
              onClick={handleAddToCart}
              size={isCompact ? 'sm' : 'default'}
              className={cn(
                'w-full justify-center rounded-xl font-semibold transition-all',
                isOhana
                  ? 'bg-ohana text-ohana-foreground hover:bg-ohana-dark shadow-sm shadow-ohana/20 hover:shadow-ohana/30'
                  : 'bg-gradient-to-r from-chilli to-chilli-dark text-chilli-foreground hover:from-chilli-dark hover:to-chilli-dark shadow-sm shadow-chilli-dark/20 hover:shadow-chilli-dark/30',
              )}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Agregar
            </Button>
          </div>
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
