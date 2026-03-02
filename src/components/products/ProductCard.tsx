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
  premade: 'Preparados',
  custom: 'Personalizados',
  bowls: 'Bowls',
  bowl: 'Bowl',
  sugeridos: 'Sugeridos',
  burgers: 'Hamburguesas',
  hamburguesas: 'Hamburguesas',
  hotdogs: 'Hot Dogs',
  hotdog: 'Hot Dogs',
  fries: 'Papas',
  papas: 'Papas',
  mazorcadas: 'Mazorcadas',
  nachos: 'Nachos',
  sodas: 'Refrescos',
  juices: 'Jugos',
  jugos: 'Jugos',
  water: 'Agua',
  agua: 'Agua',
  beverages: 'Bebidas',
  bebidas: 'Bebidas',
  cafe: 'Cafe',
};

function humanizeCategoryId(categoryId: string): string {
  const normalized = categoryId.trim().replace(/[_\s]+/g, '-').toLowerCase();
  const tokens = normalized
    .split('-')
    .filter(Boolean)
    .filter((token) => token !== 'ohana' && token !== 'chilli');

  if (tokens.length === 0) return 'Menu';

  return tokens
    .map((token) => {
      if (CATEGORY_TOKEN_LABELS[token]) return CATEGORY_TOKEN_LABELS[token];
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(' ');
}

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

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);
  };

  const handleAddToCart = () => {
    addProduct(product);
    toast.success(`${product.name} agregado al carrito`, {
      description: formatPrice(product.price),
    });
  };

  const nameClass = isOhana
    ? 'text-base sm:text-lg font-semibold leading-tight'
    : 'text-base sm:text-lg font-black uppercase tracking-wide leading-tight';

  const descriptionClass = variant === 'compact' ? 'line-clamp-2 text-xs' : 'line-clamp-3 text-sm';

  const priceClass = cn(
    'shrink-0 text-right',
    variant === 'compact' ? 'text-sm sm:text-base' : 'text-base sm:text-lg',
    isOhana ? 'text-ohana font-bold' : 'text-chilli-dark font-black tracking-wide',
  );

  return (
    <>
      <article
        className={cn('product-card', isOhana ? 'card-ohana' : 'card-chilli', 'flex flex-col h-full p-4 sm:p-5 gap-3')}
      >
        <header className="flex items-start justify-between gap-4">
          <h3 className={nameClass}>{product.name}</h3>
          <span className={priceClass}>{formatPrice(product.price)}</span>
        </header>

        {hasDetailContent && (
          <div className="space-y-1">
            {descriptionText && (
              <p className={cn('text-muted-foreground leading-relaxed', descriptionClass)}>{descriptionText}</p>
            )}
            {ingredientsText && (
              <p className={cn('text-muted-foreground leading-relaxed', descriptionClass)}>
                <span className="font-medium text-foreground">Ingredientes: </span>
                {ingredientsText}
              </p>
            )}
          </div>
        )}

        {shouldShowMore && (
          <button
            type="button"
            onClick={() => setDetailsOpen(true)}
            className={cn(
              'self-start text-sm underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isOhana ? 'text-ohana-dark' : 'text-chilli-dark font-semibold uppercase tracking-wide',
            )}
          >
            Ver mas
          </button>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <span className={isOhana ? 'badge-ohana' : 'badge-chilli'}>{BRAND_LABEL[product.brand]}</span>
          <span
            className={cn(
              'text-xs px-2.5 py-1 border',
              isOhana
                ? 'rounded-full border-ohana/25 bg-ohana/5 text-ohana-dark font-medium'
                : 'rounded-none border-chilli-dark/30 bg-chilli-dark/5 text-chilli-dark font-bold uppercase tracking-wide',
            )}
          >
            {resolvedCategoryName}
          </span>
          {product.isPopular && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent/10 text-accent-foreground border border-accent/30">
              <Star className="w-3 h-3" />
              Popular
            </span>
          )}
          {product.isNew && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/25">
              <Sparkles className="w-3 h-3" />
              Nuevo
            </span>
          )}
          {product.isVegan && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-ohana/10 text-ohana border border-ohana/20">
              <Leaf className="w-3 h-3" />
              Vegano
            </span>
          )}
          {product.isGlutenFree && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-700 border border-amber-500/30">
              <Wheat className="w-3 h-3" />
              Sin gluten
            </span>
          )}
        </div>

        <div className="pt-3 border-t border-border/70 mt-auto">
          <Button
            onClick={handleAddToCart}
            size={variant === 'compact' ? 'sm' : 'default'}
            className={cn('w-full justify-center', isOhana ? 'btn-ohana' : 'btn-chilli')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar
          </Button>
        </div>
      </article>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className={cn('sm:max-w-xl', isOhana ? 'border-ohana/30' : 'border-chilli-dark/30')}>
          <DialogHeader>
            <DialogTitle className={isOhana ? 'text-ohana-dark' : 'text-chilli-dark uppercase tracking-wide'}>
              {product.name}
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span>{formatPrice(product.price)}</span>
              <span>-</span>
              <span>{BRAND_LABEL[product.brand]}</span>
              <span>-</span>
              <span>{resolvedCategoryName}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {descriptionText && <p className="leading-relaxed text-foreground">{descriptionText}</p>}
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
