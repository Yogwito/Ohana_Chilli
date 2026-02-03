import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCart } from '@/context/CartContext';
import { Minus, Plus, Trash2, ShoppingBag, Leaf, Flame } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CartDrawer({ open, onOpenChange }: CartDrawerProps) {
  const { cart, updateQuantity, removeItem } = useCart();
  const navigate = useNavigate();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);
  };

  const handleCheckout = () => {
    onOpenChange(false);
    navigate('/checkout');
  };

  const formatBowlSummary = (item: typeof cart.items[0]) => {
    if (!item.customBowl) return '';
    const bowl = item.customBowl;
    const parts = [
      `${bowl.size.name}`,
      bowl.bases.map(b => b.name).join(', '),
      bowl.proteins.map(p => p.name).join(', '),
      `${bowl.acompanantes.length} acompañantes`,
    ];
    return parts.join(' • ');
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
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
          <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Tu carrito está vacío</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Agrega productos de Ohana o Chilli para comenzar
            </p>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Explorar menú
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-4 py-4">
                {cart.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    {/* Brand indicator */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      item.brand === 'ohana' ? 'bg-ohana/10' : 'bg-chilli/10'
                    }`}>
                      {item.brand === 'ohana' ? (
                        <Leaf className="h-5 w-5 text-ohana" />
                      ) : (
                        <Flame className="h-5 w-5 text-chilli-dark" />
                      )}
                    </div>

                    {/* Item details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`text-2xs font-medium px-1.5 py-0.5 rounded ${
                            item.brand === 'ohana' ? 'badge-ohana' : 'badge-chilli'
                          }`}>
                            {item.brand === 'ohana' ? 'Ohana' : 'Chilli'}
                          </span>
                          <h4 className="font-medium text-sm mt-1">
                            {item.type === 'product' 
                              ? item.product?.name 
                              : 'Bowl Personalizado'}
                          </h4>
                          {item.type === 'custom-bowl' && (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                              {formatBowlSummary(item)}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground italic mt-0.5">
                              Nota: {item.notes}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        {/* Quantity controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                            aria-label="Reducir cantidad"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-full border flex items-center justify-center hover:bg-muted transition-colors"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Price */}
                        <span className="font-semibold">
                          {formatPrice(item.totalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between items-center text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-ohana">{formatPrice(cart.total)}</span>
              </div>
              <Button
                onClick={handleCheckout}
                className="w-full btn-ohana"
                size="lg"
              >
                Ir a Checkout
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
