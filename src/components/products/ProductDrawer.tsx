import { useState, useEffect } from 'react';
import { Minus, Plus, Check, ArrowUpRight } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductDefaultIngredients } from '@/hooks/use-catalog';
import { formatPrice } from '@/domain/formatPrice';
import { cn } from '@/lib/utils';
import type { Product, ProductCustomization } from '@/types';
import ProductImage from '@/components/products/ProductImage';
import { useIsMobile } from '@/hooks/use-mobile';

export type ProductConfig = ProductCustomization;

interface ProductDrawerProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (config: ProductConfig) => void;
}

export default function ProductDrawer({ product, open, onClose, onConfirm }: ProductDrawerProps) {
  const isMobile = useIsMobile();
  const { data: ingredients = [], isLoading } = useProductDefaultIngredients(product?.id ?? null);

  const [removed, setRemoved] = useState<string[]>([]);
  const [extraQty, setExtraQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');

  // Reset state when product changes
  useEffect(() => {
    setRemoved([]);
    setExtraQty({});
    setNote('');
  }, [product?.id]);

  if (!product) return null;

  const removableIngredients = ingredients.filter(i => i.is_removable && !i.is_extra);
  const extraIngredients = ingredients.filter(i => i.is_extra);
  const hasConfiguredIngredients = ingredients.length > 0;

  const toggleRemoved = (name: string) => {
    setRemoved(prev =>
      prev.includes(name) ? prev.filter(r => r !== name) : [...prev, name],
    );
  };

  const changeExtraQty = (id: string, delta: number) => {
    setExtraQty(prev => {
      const next = (prev[id] ?? 0) + delta;
      if (next <= 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const extrasSelected = extraIngredients.flatMap(ing => {
    const qty = extraQty[ing.id] ?? 0;
    return Array.from({ length: qty }, () => ({
      id: ing.id,
      name: ing.ingredient_name,
      price: ing.extra_price_cents,
    }));
  });

  const extraTotal = extrasSelected.reduce((s, e) => s + e.price, 0);
  const totalPrice = product.price + extraTotal;

  const handleConfirm = () => {
    onConfirm({ removedIngredients: removed, extras: extrasSelected, note, extraTotal });
    onClose();
  };

  const handleAddWithoutChanges = () => {
    onConfirm({ removedIngredients: [], extras: [], note, extraTotal: 0 });
    onClose();
  };

  const handleAddWithoutConfiguredIngredients = () => {
    onConfirm({ removedIngredients: [], extras: [], note, extraTotal: 0 });
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className="product-customization-drawer w-full h-[92dvh] md:h-full md:max-w-lg rounded-t-[28px] md:rounded-none p-0 flex flex-col"
      >
        {/* Scrollable content */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* Product image */}
          <ProductImage product={product} ratio={4 / 3} className="rounded-t-2xl sm:rounded-none" />

          <div className="product-detail-body p-5 space-y-6">
            {/* Header */}
            <div className="product-detail-heading">
              <p className="experience-eyebrow">TU PRÓXIMO ANTOJO</p>
              <SheetTitle className="text-xl font-bold text-foreground">{product.name}</SheetTitle>
              <SheetDescription className="product-full-recipe">{product.description || product.ingredients?.join(", ") || "Dale tu toque antes de agregarlo al pedido."}</SheetDescription>
              <p className="text-brand font-bold mt-1">{formatPrice(product.price)}</p>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-44 rounded" />
                  <Skeleton className="h-10 w-full rounded-xl" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36 rounded" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              </div>
            ) : (
              <>
                {/* Sección 1: Quitar ingredientes */}
                {removableIngredients.length > 0 && (
                  <section className="product-options-section">
                    <h3>Hazlo a tu gusto</h3>
                    <p className="text-sm text-muted-foreground mb-3">Toca los ingredientes que prefieres quitar.</p>
                    <div className="flex flex-wrap gap-1.5">
                      {removableIngredients.map(ing => {
                        const isRemoved = removed.includes(ing.ingredient_name);
                        return (
                          <button
                            key={ing.id}
                            type="button"
                            onClick={() => toggleRemoved(ing.ingredient_name)}
                            aria-pressed={isRemoved}
                            className={cn(
                              'product-removal-option min-h-11 rounded-full border px-3 py-2 text-sm cursor-pointer transition-all',
                              isRemoved
                                ? 'bg-red-50 border-red-300 text-red-500 line-through'
                                : 'bg-background border-border text-foreground hover:border-red-200',
                            )}
                          >
                            {isRemoved && <Check className="inline mr-1 h-3 w-3" aria-hidden="true" />} {ing.ingredient_name}
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Sección 2: Extras de pago */}
                {extraIngredients.length > 0 && (
                  <section className="product-options-section">
                    <h3>Un toque extra</h3>
                    <p className="text-sm text-muted-foreground mb-3">Elige tus adicionales. El precio se suma al total.</p>
                    <div className="space-y-2">
                      {extraIngredients.map(ing => {
                        const qty = extraQty[ing.id] ?? 0;
                        return (
                          <div
                            key={ing.id}
                            data-selected={qty > 0}
                            className="product-extra-option flex items-center gap-3 justify-between border border-dashed border-brand/40 bg-brand/5 rounded-xl px-4 py-3"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">{ing.ingredient_name}</p>
                              <span className="text-xs bg-brand/10 text-brand rounded-full px-2 py-0.5 mt-0.5 inline-block">
                                +{formatPrice(ing.extra_price_cents)}
                              </span>
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <button
                                type="button"
                                onClick={() => changeExtraQty(ing.id, -1)}
                                disabled={qty === 0}
                                className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
                                aria-label={`Quitar ${ing.ingredient_name}`}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                              <button
                                type="button"
                                onClick={() => changeExtraQty(ing.id, 1)}
                                className="w-11 h-11 rounded-full border border-brand bg-brand/10 text-brand flex items-center justify-center hover:bg-brand hover:text-white transition-colors"
                                aria-label={`Agregar ${ing.ingredient_name}`}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Sección 3: Nota para la cocina */}
                <div className="product-options-section">
                  <label htmlFor={`product-note-${product.id}`} className="block text-sm font-semibold text-foreground mb-2">Nota para la cocina</label>
                  <textarea
                    id={`product-note-${product.id}`}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Ej: sin cebolla, bien cocido..."
                    rows={2}
                    aria-label="Nota para la cocina"
                    className="w-full border border-border rounded-lg p-3 text-base sm:text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer fijo */}
        <div className="product-customization-footer border-t bg-background p-4 sm:p-5 space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-bold text-brand" aria-live="polite">{formatPrice(totalPrice)}</span>
          </div>
          {isLoading ? (
            <button
              type="button"
              disabled
              className="w-full bg-muted text-muted-foreground py-3 rounded-xl font-semibold text-sm cursor-not-allowed"
            >
              Cargando opciones...
            </button>
          ) : hasConfiguredIngredients ? (
            <>
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full bg-brand text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand/90 transition-colors"
              >
                Agregar al carrito <ArrowUpRight className="inline ml-2 h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={handleAddWithoutChanges}
                className="w-full border border-border text-foreground py-3 rounded-xl text-base font-medium hover:bg-muted transition-colors"
              >
                Agregar sin cambios
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleAddWithoutConfiguredIngredients}
              className="w-full bg-brand text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand/90 transition-colors"
            >
              Agregar sin cambios →
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
