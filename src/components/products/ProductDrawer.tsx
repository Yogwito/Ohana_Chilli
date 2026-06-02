import { useState, useEffect } from 'react';
import { X, Minus, Plus } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { useProductDefaultIngredients } from '@/hooks/use-catalog';
import { formatPrice } from '@/domain/formatPrice';
import { cn } from '@/lib/utils';
import type { Product, ProductCustomization } from '@/types';

export type ProductConfig = ProductCustomization;

interface ProductDrawerProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (config: ProductConfig) => void;
}

export default function ProductDrawer({ product, open, onClose, onConfirm }: ProductDrawerProps) {
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
        side="bottom"
        className="sm:side-right h-[90dvh] sm:h-full sm:max-w-md sm:left-auto rounded-t-2xl sm:rounded-none p-0 flex flex-col"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/80 backdrop-blur flex items-center justify-center shadow border border-border hover:bg-muted transition-colors"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Product image */}
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-40 object-cover rounded-t-2xl sm:rounded-none"
            />
          )}

          <div className="p-5 space-y-6">
            {/* Header */}
            <div>
              <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
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
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">¿Quieres quitar algo?</p>
                    <div className="flex flex-wrap gap-1.5">
                      {removableIngredients.map(ing => {
                        const isRemoved = removed.includes(ing.ingredient_name);
                        return (
                          <button
                            key={ing.id}
                            type="button"
                            onClick={() => toggleRemoved(ing.ingredient_name)}
                            className={cn(
                              'rounded-full border px-3 py-1 text-xs cursor-pointer transition-all',
                              isRemoved
                                ? 'bg-red-50 border-red-300 text-red-500 line-through'
                                : 'bg-background border-border text-foreground hover:border-red-200',
                            )}
                          >
                            {ing.ingredient_name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sección 2: Extras de pago */}
                {extraIngredients.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">¿Le agregamos algo?</p>
                    <div className="space-y-2">
                      {extraIngredients.map(ing => {
                        const qty = extraQty[ing.id] ?? 0;
                        return (
                          <div
                            key={ing.id}
                            className="flex items-center justify-between border border-dashed border-brand/40 bg-brand/5 rounded-xl px-4 py-3"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">{ing.ingredient_name}</p>
                              <span className="text-xs bg-brand/10 text-brand rounded-full px-2 py-0.5 mt-0.5 inline-block">
                                +{formatPrice(ing.extra_price_cents)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => changeExtraQty(ing.id, -1)}
                                disabled={qty === 0}
                                className="w-8 h-8 rounded-full border border-border flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors"
                                aria-label="Quitar"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-6 text-center text-sm font-semibold">{qty}</span>
                              <button
                                type="button"
                                onClick={() => changeExtraQty(ing.id, 1)}
                                className="w-8 h-8 rounded-full border border-brand bg-brand/10 text-brand flex items-center justify-center hover:bg-brand hover:text-white transition-colors"
                                aria-label="Agregar"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Sección 3: Nota para la cocina */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Nota para la cocina</p>
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Ej: sin cebolla, bien cocido..."
                    rows={2}
                    className="w-full border border-border rounded-lg p-3 text-sm resize-none bg-background focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer fijo */}
        <div className="border-t bg-background p-5 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-bold text-brand">{formatPrice(totalPrice)}</span>
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
                Agregar al carrito · {formatPrice(totalPrice)}
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
