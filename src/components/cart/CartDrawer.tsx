import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AnimatedElement } from '@/components/ui/AnimatedElement';
import { useCart } from '@/context/CartContext';
import { Minus, Plus, Trash2, ShoppingBag, Leaf } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatBowlSummary } from '@/domain/bowlSummary';
import { formatPrice } from '@/domain/formatPrice';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { cart, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    onOpenChange(false);
    navigate('/checkout');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Tu Carrito
            {cart.items.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({cart.items.reduce((sum, item) => sum + item.quantity, 0)} items)
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Tu carrito esta vacio</h3>
            <p className="mb-6 text-sm text-muted-foreground">Agrega productos de Ohana Bowls para comenzar.</p>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Explorar menu
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="-mx-6 flex-1 px-6">
              <div className="space-y-4 py-4">
                {cart.items.map((item, index) => (
                  <AnimatedElement
                    key={item.id}
                    animation="fade-up"
                    delay={Math.min(index * 75, 300) as 0 | 75 | 150 | 225 | 300}
                    className="flex gap-3 rounded-lg bg-muted/50 p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ohana/10">
                      <Leaf className="h-5 w-5 text-ohana" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="rounded px-1.5 py-0.5 text-2xs font-medium badge-ohana">
                            Ohana
                          </span>
                          <h4 className="mt-1 text-sm font-medium">
                            {item.type === 'product' ? item.product?.name : 'Bowl Personalizado'}
                          </h4>
                          {item.type === 'custom-bowl' && item.customBowl && (
                            <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                              {formatBowlSummary(item.customBowl)}
                            </p>
                          )}
                          {item.notes && <p className="mt-0.5 text-xs italic text-muted-foreground">Nota: {item.notes}</p>}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-muted-foreground transition-colors hover:text-destructive"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-full border transition-colors hover:bg-muted"
                            aria-label="Reducir cantidad"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="flex h-7 w-7 items-center justify-center rounded-full border transition-colors hover:bg-muted"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        <span className="font-semibold">{formatPrice(item.totalPrice)}</span>
                      </div>
                    </div>
                  </AnimatedElement>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-ohana">{formatPrice(cart.total)}</span>
              </div>
              <Button onClick={handleCheckout} className="w-full btn-ohana" size="lg">
                Ir a Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
