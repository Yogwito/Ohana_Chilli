import { useMemo, useState } from 'react';
import { Plus, Check, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductImage from '@/components/products/ProductImage';
import ProductDrawer from '@/components/products/ProductDrawer';
import { Product, Brand } from '@/types';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatPrice } from '@/domain/formatPrice';
import { useAddProduct } from '@/hooks/use-add-product';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact';
  categoryName?: string;
}

const BRAND_LABEL: Record<Brand, string> = {
  ohana: 'Ohana',
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
  const [detailsOpen, setDetailsOpen] = useState(false);

  const descriptionText = product.description.trim();
  const ingredientsText = useMemo(() => {
    if (!product.ingredients || product.ingredients.length === 0) return '';
    return product.ingredients.join(', ');
  }, [product.ingredients]);

  const hasDetailContent = Boolean(descriptionText || ingredientsText);
  const shouldShowMore =
    descriptionText.length > 120 || ingredientsText.length > 90 || (product.ingredients?.length ?? 0) > 5;
  const resolvedCategoryName = categoryName ?? humanizeCategoryId(product.categoryId);
  const productWithCategory = useMemo(
    () => ({ ...product, categoryName: resolvedCategoryName }),
    [product, resolvedCategoryName],
  );

  const { added, drawerOpen, setDrawerOpen, handleAddClick, handleDrawerConfirm } =
    useAddProduct(product, productWithCategory);

  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <article
        className={cn(
          'group flex items-center gap-3 rounded-xl border bg-card p-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
          'border-ohana/15 hover:border-ohana/40',
        )}
      >
        <div className="w-12 shrink-0 overflow-hidden rounded-lg">
          <ProductImage
            product={product}
            ratio={1}
            className="rounded-lg"
            imageClassName="group-hover:scale-105"
            fallbackClassName="rounded-lg"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold tracking-tight truncate">{product.name}</p>
          <p className="text-sm font-bold text-ohana-dark">{formatPrice(product.price)}</p>
        </div>
        <Button
          onClick={handleAddClick}
          size="icon"
          className="rounded-full h-8 w-8 min-h-[44px] min-w-[44px] shrink-0 transition-all duration-200 bg-ohana/10 text-ohana-dark hover:bg-ohana hover:text-white"
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
          'group flex flex-col rounded-2xl overflow-hidden border border-border/60 bg-card transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:border-brand/30',
        )}
      >
        <ProductImage
          product={product}
          ratio={4 / 3}
          imageClassName="group-hover:scale-105"
        />

        <div className="flex flex-col flex-1 p-4 gap-2">
          {/* Name */}
          <h3 className="font-display font-bold text-sm sm:text-base leading-snug tracking-tight text-foreground">{product.name}</h3>

          {/* Description */}
          {hasDetailContent && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed flex-1">
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

          {/* Price row + add button */}
          <div className="flex items-center justify-between mt-auto pt-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-brand-dark">{formatPrice(product.price)}</span>
              <div className="flex items-center gap-1">
                {product.isVegan && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Vegano" />}
                {product.isGlutenFree && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Sin gluten" />}
                {product.isPopular && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                {product.isNew && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium border border-blue-200">
                    nuevo
                  </span>
                )}
              </div>
            </div>

            {/* Desktop: icon button */}
            <Button
              onClick={handleAddClick}
              size="icon"
              className={cn(
                'hidden sm:flex h-9 w-9 rounded-full bg-brand text-white shadow-md hover:bg-brand/90 hover:shadow-lg active:scale-90 transition-all duration-150 shrink-0',
                added && 'scale-110',
              )}
              aria-label="Agregar al carrito"
            >
              {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            </Button>
          </div>

          {/* Mobile: full-width button */}
          <Button
            onClick={handleAddClick}
            className={cn(
              'sm:hidden w-full h-10 rounded-xl font-semibold bg-brand/10 text-brand-dark hover:bg-brand hover:text-white transition-all duration-200',
              added && 'scale-[1.02]',
            )}
          >
            {added ? <Check className="h-4 w-4 mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
            {added ? '¡Agregado!' : 'Agregar'}
          </Button>
        </div>
      </article>

      {/* Details dialog */}
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

      {/* Customization drawer */}
      <ProductDrawer
        product={product}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onConfirm={handleDrawerConfirm}
      />
    </>
  );
}
