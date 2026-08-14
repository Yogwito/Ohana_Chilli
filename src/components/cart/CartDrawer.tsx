import { useState } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnimatedElement } from '@/components/ui/AnimatedElement';
import { useCart } from '@/context/CartContext';
import { Minus, Plus, Trash2, ShoppingBag, Leaf, Pencil } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatPrice } from '@/domain/formatPrice';
import {
  canonicalFromCustomBowl,
  canonicalFromLegacyProduct,
  formatCustomizationSummary,
} from '@/domain/customization';
import ProductDrawer, { type ProductConfig } from '@/components/products/ProductDrawer';
import type { CartItem } from '@/types';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { cart, updateQuantity, updateItemCustomizations, removeItem } = useCart();
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleEditConfirm = (config: ProductConfig) => {
    if (editingItem) updateItemCustomizations(editingItem.id, config);
    setEditingItem(null);
  };

  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  const handleCheckout = () => {
    onOpenChange(false);
    navigate('/checkout', { state: { from: currentPath } });
  };

  const handleContinueShopping = () => {
    onOpenChange(false);
  };

  const handleViewMenu = () => {
    onOpenChange(false);
    navigate('/#arma-tu-bowl');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col border-l p-0 sm:max-w-lg">
        <SheetHeader className="border-b px-5 py-5 text-left sm:px-6">
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Tu pedido
            {cart.items.length > 0 && (
              <span className="rounded-sm bg-brand-muted px-2 py-1 font-utility text-[10px] font-semibold uppercase text-brand-dark">
                {cart.items.reduce((sum, item) => sum + item.quantity, 0)} productos
              </span>
            )}
          </SheetTitle>
          <SheetDescription>
            Revisa cantidades y personalizaciones antes de continuar.
          </SheetDescription>
        </SheetHeader>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-md border bg-muted">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mb-2">Tu pedido está vacío</h3>
            <p className="mb-6 max-w-xs text-sm text-muted-foreground">Elige un plato listo o arma un bowl con tus ingredientes.</p>
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
              <Button onClick={handleContinueShopping} variant="outline" className="w-full sm:w-auto">
                Seguir comprando
              </Button>
              <Button onClick={handleViewMenu} className="w-full sm:w-auto btn-ohana">
                Ver menú
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-5 sm:px-6">
              <div className="divide-y py-2">
                {cart.items.map((item, index) => {
                  // Único formatter compartido (carrito = checkout = WhatsApp = admin)
                  const canonical = item.customization
                    ?? (item.type === 'custom-bowl'
                      ? canonicalFromCustomBowl(item.customBowl)
                      : canonicalFromLegacyProduct(item.customizations));
                  const customizationLines = formatCustomizationSummary(canonical);

                  return (
                    <AnimatedElement
                      key={item.id}
                      animation="fade-up"
                      delay={Math.min(index * 75, 300) as 0 | 75 | 150 | 225 | 300}
                      className="flex gap-3 py-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-brand-muted">
                        <Leaf className="h-5 w-5 text-ohana" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="badge-ohana">
                              Ohana
                            </span>
                            <h4 className="mt-1 text-sm font-medium">
                              {item.type === 'product' ? item.product?.name : 'Bowl Personalizado'}
                            </h4>
                            {customizationLines.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {customizationLines.map((line) => (
                                  <p key={line} className="text-xs text-muted-foreground">{line}</p>
                                ))}
                              </div>
                            )}
                            {item.notes && customizationLines.length === 0 && (
                              <p className="mt-0.5 text-xs italic text-muted-foreground">Nota: {item.notes}</p>
                            )}
                          </div>
                          <div className="flex items-center">
                            {item.type === 'product' && item.product && (
                              <button
                                onClick={() => setEditingItem(item)}
                                className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-brand-muted hover:text-brand-dark"
                                aria-label={`Editar ${item.product.name}`}
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => removeItem(item.id)}
                              className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                              aria-label={`Eliminar ${item.type === 'product' ? item.product?.name ?? 'producto' : 'bowl personalizado'}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity - 1)}
                              className="flex h-10 w-10 items-center justify-center rounded-md border transition-colors hover:bg-muted"
                              aria-label="Reducir cantidad"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-sm font-medium" aria-live="polite">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(item.id, item.quantity + 1)}
                              className="flex h-10 w-10 items-center justify-center rounded-md border transition-colors hover:bg-muted"
                              aria-label="Aumentar cantidad"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <span className="font-semibold">{formatPrice(item.totalPrice)}</span>
                        </div>
                      </div>
                    </AnimatedElement>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="space-y-4 border-t bg-muted/30 px-5 py-5 sm:px-6">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-utility font-semibold text-brand-dark dark:text-brand">{formatPrice(cart.total)}</span>
              </div>
              <Button onClick={handleCheckout} className="w-full btn-ohana" size="lg">
                Continuar pedido
              </Button>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button onClick={handleContinueShopping} variant="outline" className="w-full">
                  Seguir comprando
                </Button>
                <Button onClick={handleViewMenu} variant="ghost" className="w-full">
                  Ver menú
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>

      {/* Cart editing: same customization flow, prefilled */}
      <ProductDrawer
        product={editingItem?.product ?? null}
        open={editingItem !== null}
        onClose={() => setEditingItem(null)}
        onConfirm={handleEditConfirm}
        initialConfig={editingItem?.customizations ?? null}
        isEditing
      />
    </Sheet>
  );
}
