import { useState, useEffect, useMemo } from 'react';
import { X, Minus, Plus, Check } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useProductDefaultIngredients,
  useProductVariantsMap,
  useAddons,
  useAddonRecommendations,
} from '@/hooks/use-catalog';
import { isProductCustomizable } from '@/domain/productCustomizations';
import { getProductImageSrcSet } from '@/domain/productImages';
import { formatPrice } from '@/domain/formatPrice';
import { cn } from '@/lib/utils';
import type { Addon, Product, ProductCustomization } from '@/types';

export type ProductConfig = ProductCustomization;

interface ProductDrawerProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (config: ProductConfig) => void;
  /** Prefill for cart editing: the item's existing configuration. */
  initialConfig?: ProductCustomization | null;
  /** Changes footer copy to "Actualizar" when editing an existing cart item. */
  isEditing?: boolean;
}

export default function ProductDrawer({
  product,
  open,
  onClose,
  onConfirm,
  initialConfig,
  isEditing = false,
}: ProductDrawerProps) {
  const { data: ingredients = [], isLoading: pdiLoading } = useProductDefaultIngredients(product?.id ?? null);
  const { data: variantsMap, isLoading: variantsLoading } = useProductVariantsMap();
  const { data: addons = [] } = useAddons();
  const { data: recommendations } = useAddonRecommendations();

  const [removed, setRemoved] = useState<string[]>([]);
  const [addonQty, setAddonQty] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const [variantId, setVariantId] = useState<string | null>(null);
  const [showAllAddons, setShowAllAddons] = useState(false);

  const variants = product ? (variantsMap?.[product.id] ?? []) : [];
  const requiresVariant = variants.length > 0;
  // Beverages and simple adicionales don't take add-ons; everything else does.
  const allowsAddons = product ? isProductCustomizable(product) : false;

  // Reset / prefill when the drawer opens for a product
  useEffect(() => {
    if (!open) return;
    const init = initialConfig ?? null;
    setRemoved(init?.removedIngredients ?? []);
    setNote(init?.note ?? '');
    setVariantId(init?.variant?.id ?? null);
    const qty: Record<string, number> = {};
    for (const extra of init?.extras ?? []) {
      qty[extra.id] = (qty[extra.id] ?? 0) + 1;
    }
    setAddonQty(qty);
    setShowAllAddons(false);
  }, [open, product?.id, initialConfig]);

  const orderedAddons = useMemo(() => {
    if (!product) return { recommended: [] as Addon[], rest: [] as Addon[] };
    const recIds = recommendations?.[product.categoryId] ?? [];
    const byId = new Map(addons.map((a) => [a.id, a]));
    const recommended = recIds.map((id) => byId.get(id)).filter((a): a is Addon => Boolean(a));
    const recommendedIds = new Set(recommended.map((a) => a.id));
    const rest = addons.filter((a) => !recommendedIds.has(a.id));
    return { recommended, rest };
  }, [product, addons, recommendations]);

  if (!product) return null;

  const removableIngredients = ingredients.filter((i) => i.is_removable && !i.is_extra);
  const selectedVariant = variants.find((v) => v.id === variantId) ?? null;

  const toggleRemoved = (name: string) => {
    setRemoved((prev) => (prev.includes(name) ? prev.filter((r) => r !== name) : [...prev, name]));
  };

  const changeAddonQty = (id: string, delta: number) => {
    setAddonQty((prev) => {
      const next = (prev[id] ?? 0) + delta;
      if (next <= 0) {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  // Expanded copies: quantity N = N entries, so pricing and cart identity
  // (sorted extras) capture quantities without a separate field.
  const extrasSelected = allowsAddons
    ? addons.flatMap((addon) => {
        const qty = addonQty[addon.id] ?? 0;
        return Array.from({ length: qty }, () => ({ id: addon.id, name: addon.name, price: addon.price }));
      })
    : [];

  const extraTotal = extrasSelected.reduce((s, e) => s + e.price, 0);
  const totalPrice = product.price + extraTotal + (selectedVariant?.priceDelta ?? 0);
  const canConfirm = !requiresVariant || Boolean(selectedVariant);
  const isLoading = pdiLoading || (requiresVariant && variantsLoading);

  const buildConfig = (): ProductConfig => ({
    removedIngredients: removed,
    extras: extrasSelected,
    note,
    extraTotal,
    variant: selectedVariant
      ? { id: selectedVariant.id, name: selectedVariant.name, priceDelta: selectedVariant.priceDelta }
      : undefined,
  });

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(buildConfig());
    onClose();
  };

  const renderAddonRow = (addon: Addon) => {
    const qty = addonQty[addon.id] ?? 0;
    return (
      <div
        key={addon.id}
        className="flex items-center justify-between rounded-md border bg-brand-muted/60 px-4 py-3"
      >
        <div>
          <p className="text-sm font-medium text-foreground">{addon.name}</p>
          <span className="mt-1 inline-block font-utility text-[10px] font-semibold text-brand-dark">
            +{formatPrice(addon.price)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeAddonQty(addon.id, -1)}
            disabled={qty === 0}
            className="flex h-9 w-9 items-center justify-center rounded-md border hover:bg-muted disabled:opacity-30"
            aria-label={`Quitar ${addon.name}`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="w-6 text-center text-sm font-semibold">{qty}</span>
          <button
            type="button"
            onClick={() => changeAddonQty(addon.id, 1)}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-brand bg-background text-brand transition-colors hover:bg-brand hover:text-white"
            aria-label={`Agregar ${addon.name}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="bottom"
        className="flex h-[92dvh] flex-col rounded-t-md p-0 sm:left-auto sm:h-full sm:max-w-lg sm:rounded-none"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-md border bg-background/90 backdrop-blur transition-colors hover:bg-muted"
          aria-label="Cerrar"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto">
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              srcSet={getProductImageSrcSet(product.imageUrl)}
              sizes="(min-width: 640px) 480px, 100vw"
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-52 w-full object-cover sm:h-60"
            />
          )}

          <div className="space-y-7 p-5 sm:p-6">
            <div>
              <SheetTitle className="text-xl font-bold text-foreground">{product.name}</SheetTitle>
              <SheetDescription>
                {requiresVariant
                  ? 'Elige tu sabor y personaliza antes de agregar al carrito.'
                  : 'Personaliza el producto antes de agregarlo al carrito.'}
              </SheetDescription>
              <p className="mt-2 font-utility text-base font-semibold text-brand-dark dark:text-brand">{formatPrice(product.price)}</p>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-44 rounded" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : (
              <>
                {/* Sabor / variante — obligatorio si el producto tiene variantes */}
                {requiresVariant && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">
                      Elige tu sabor <span className="text-red-500">*</span>
                    </p>
                    <div className="space-y-1.5" role="radiogroup" aria-label="Sabor">
                      {variants.map((variant) => {
                        const isSelected = variantId === variant.id;
                        return (
                          <button
                            key={variant.id}
                            type="button"
                            role="radio"
                            aria-checked={isSelected}
                            onClick={() => setVariantId(variant.id)}
                            className={cn(
                              'flex min-h-11 w-full items-center justify-between rounded-md border px-4 py-2.5 text-left text-sm transition-colors',
                              isSelected
                                ? 'border-brand bg-brand/10 font-semibold text-brand-dark'
                                : 'border-border bg-background hover:border-brand/40',
                            )}
                          >
                            <span>
                              {variant.name}
                              {variant.priceDelta > 0 ? ` (+${formatPrice(variant.priceDelta)})` : ''}
                            </span>
                            {isSelected && <Check className="w-4 h-4 shrink-0 text-brand" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quitar ingredientes (solo los del producto) */}
                {removableIngredients.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">¿Quieres quitar algo?</p>
                    <div className="flex flex-wrap gap-1.5">
                      {removableIngredients.map((ing) => {
                        const isRemoved = removed.includes(ing.ingredient_name);
                        return (
                          <button
                            key={ing.id}
                            type="button"
                            onClick={() => toggleRemoved(ing.ingredient_name)}
                            className={cn(
                              'min-h-10 cursor-pointer rounded-md border px-3 py-1 text-xs transition-colors',
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

                {/* Adicionales — catálogo compartido, recomendados primero */}
                {allowsAddons && addons.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">¿Le agregamos algo?</p>
                    <div className="space-y-2">
                      {(orderedAddons.recommended.length > 0
                        ? orderedAddons.recommended
                        : orderedAddons.rest
                      ).map(renderAddonRow)}
                      {showAllAddons && orderedAddons.recommended.length > 0 && orderedAddons.rest.map(renderAddonRow)}
                    </div>
                    {orderedAddons.recommended.length > 0 && orderedAddons.rest.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowAllAddons((v) => !v)}
                        className="mt-2 text-xs font-medium text-brand hover:underline"
                      >
                        {showAllAddons ? 'Ver menos' : `Ver todos los adicionales (${orderedAddons.rest.length} más)`}
                      </button>
                    )}
                  </div>
                )}

                {/* Nota para la cocina */}
                <div>
                  <p className="text-sm font-semibold text-foreground mb-2">Nota para la cocina</p>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
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
        <div className="shrink-0 space-y-3 border-t bg-background p-5">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-bold text-brand">{formatPrice(totalPrice)}</span>
          </div>
          {isLoading ? (
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-md bg-muted py-3 text-sm font-semibold text-muted-foreground"
            >
              Cargando opciones...
            </button>
          ) : (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!canConfirm}
              className={cn(
                'w-full rounded-md py-3 text-sm font-bold transition-colors',
                canConfirm
                  ? 'bg-brand text-white hover:bg-brand/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {!canConfirm
                ? 'Elige un sabor para continuar'
                : isEditing
                  ? `Actualizar · ${formatPrice(totalPrice)}`
                  : `Agregar al carrito · ${formatPrice(totalPrice)}`}
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
