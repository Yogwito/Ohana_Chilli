import { useEffect, useMemo, useState } from 'react';
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

  // Latch: una vez abierto el drawer permanece montado (ver más abajo).
  const [hasOpenedDrawer, setHasOpenedDrawer] = useState(false);
  useEffect(() => {
    if (drawerOpen) setHasOpenedDrawer(true);
  }, [drawerOpen]);

  const isCompact = variant === 'compact';

  if (isCompact) {
    return (
      <article
        className={cn(
          'group flex items-center gap-3 rounded-md border bg-card p-3 transition-colors duration-150',
          'border-ohana/15 hover:border-ohana/40',
        )}
      >
        <div className="w-12 shrink-0 overflow-hidden rounded-sm">
          <ProductImage
            product={product}
            ratio={1}
            className="rounded-sm"
            imageClassName="group-hover:scale-105"
            fallbackClassName="rounded-sm"
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold tracking-tight truncate">{product.name}</p>
          <p className="text-sm font-bold text-ohana-dark">{formatPrice(product.price)}</p>
        </div>
        <Button
          onClick={handleAddClick}
          size="icon"
          className="min-h-[44px] min-w-[44px] shrink-0 rounded-md bg-brand-muted text-brand-dark transition-colors hover:bg-primary hover:text-primary-foreground"
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
          'group flex flex-col overflow-hidden rounded-md border bg-card transition-colors duration-150 hover:border-foreground/30',
        )}
      >
        <ProductImage
          product={product}
          ratio={4 / 3}
          imageClassName="group-hover:scale-105"
          /* Tarjeta ancha de rejilla, no la miniatura de 108 px de la home. */
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
        />

        <div className="flex flex-col flex-1 p-4 gap-2">
          {/* Name */}
          <h3 className="text-sm font-extrabold leading-snug text-foreground sm:text-base">{product.name}</h3>

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
              <span className="font-utility text-sm font-semibold text-brand-dark dark:text-brand">{formatPrice(product.price)}</span>
              <div className="flex items-center gap-1">
                {product.isVegan && <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="Vegano" />}
                {product.isGlutenFree && <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" title="Sin gluten" />}
                {product.isPopular && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                {product.isNew && (
                  <span className="rounded-sm border border-blue-200 bg-blue-100 px-1.5 py-0.5 font-utility text-[9px] font-medium text-blue-600">
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
                'hidden h-10 w-10 shrink-0 rounded-md bg-primary text-primary-foreground transition-colors hover:bg-[hsl(var(--mesa-light))] sm:flex',
                added && 'bg-brand',
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
              'h-10 w-full rounded-md bg-brand-muted font-bold text-brand-dark transition-colors hover:bg-primary hover:text-primary-foreground sm:hidden',
              added && 'bg-brand text-white',
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

      {/* Customization drawer.
          Se monta la primera vez que se abre, no con la card. Montarlo siempre
          hacía que cada card disparase su propia consulta de ingredientes por
          defecto: con 35 productos en la home eran 35 queries (+35 preflights
          CORS) antes de que el usuario tocara nada. Una vez abierto se queda
          montado, así que reabrir es instantáneo. */}
      {hasOpenedDrawer && (
        <ProductDrawer
          product={product}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onConfirm={handleDrawerConfirm}
        />
      )}
    </>
  );
}
