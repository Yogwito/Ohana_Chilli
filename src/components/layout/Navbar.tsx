import { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, ShoppingCart, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/context/CartContext';
import BrandSelectorModal from './BrandSelectorModal';
import { cn } from '@/lib/utils';

const CartDrawer = lazy(() => import('@/components/cart/CartDrawer'));

const navLinks = [
  { href: '/', label: 'Inicio' },
  { href: '/ohana', label: 'Ohana' },
  { href: '/chilli', label: 'Chilli' },
  { href: '/bebidas', label: 'Bebidas' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
];

export default function Navbar() {
  const location = useLocation();
  const { getItemCount } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [badgeAnimating, setBadgeAnimating] = useState(false);
  const prevCountRef = useRef(0);

  const itemCount = getItemCount();

  useEffect(() => {
    if (itemCount !== prevCountRef.current && prevCountRef.current !== 0) {
      setBadgeAnimating(true);
      const timer = setTimeout(() => setBadgeAnimating(false), 400);
      prevCountRef.current = itemCount;
      return () => clearTimeout(timer);
    }
    prevCountRef.current = itemCount;
  }, [itemCount]);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const activeBrand =
    location.pathname === '/ohana' || location.pathname.startsWith('/ohana/')
      ? 'ohana'
      : location.pathname === '/chilli' || location.pathname.startsWith('/chilli/')
        ? 'chilli'
        : null;

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/40 transition-all duration-300',
          activeBrand === 'ohana' && '[border-bottom-color:hsl(var(--ohana))]',
          activeBrand === 'chilli' && '[border-bottom-color:hsl(var(--chilli-dark))]',
        )}
      >
        <nav className="container flex h-14 items-center justify-between">
          {/* Logo: dual brand pills */}
          <Link to="/" className="flex items-center gap-1.5">
            <span className="bg-ohana/15 text-ohana-dark text-sm font-semibold px-3 py-1 rounded-full transition-transform duration-200 hover:scale-105 inline-block">
              Ohana
            </span>
            <span className="w-px h-3.5 bg-border" />
            <span className="bg-chilli-dark/15 text-chilli-dark text-sm font-semibold px-3 py-1 rounded-full transition-transform duration-200 hover:scale-105 inline-block">
              Chilli
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'relative text-sm font-medium transition-colors pb-1',
                  isActive(link.href)
                    ? activeBrand === 'chilli'
                      ? 'text-chilli-dark'
                      : 'text-ohana-dark'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {link.label}
                {isActive(link.href) && (
                  <span
                    className={cn(
                      'absolute -bottom-px left-1/2 -translate-x-1/2 w-1 h-1 rounded-full',
                      activeBrand === 'chilli' ? 'bg-chilli-dark' : 'bg-ohana',
                    )}
                  />
                )}
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Cart Button */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setCartOpen(true)}
              aria-label="Abrir carrito"
            >
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <span
                  className={cn(
                    'absolute -top-1 -right-1 h-5 w-5 rounded-full bg-chilli-dark text-[10px] font-bold text-white flex items-center justify-center transition-transform duration-200',
                    badgeAnimating && 'scale-125',
                  )}
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Button>

            {/* Order Now Button */}
            <Button
              onClick={() => setBrandModalOpen(true)}
              variant="ghost"
              className={cn(
                'gap-1.5 rounded-full transition-all duration-200',
                activeBrand === 'chilli'
                  ? 'text-chilli-dark hover:bg-chilli-dark/10'
                  : 'text-ohana-dark hover:bg-ohana/10',
              )}
              aria-label="Ordenar ahora"
            >
              <span className="hidden sm:inline text-sm font-medium">Ordenar</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            {/* Mobile Menu Trigger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                {/* Brand pills at top */}
                <div className="flex items-center gap-2 mb-8 mt-2">
                  <span className="bg-ohana/15 text-ohana-dark text-sm font-semibold px-3 py-1 rounded-full">Ohana</span>
                  <span className="w-px h-3.5 bg-border" />
                  <span className="bg-chilli-dark/15 text-chilli-dark text-sm font-semibold px-3 py-1 rounded-full">Chilli</span>
                </div>

                <div className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'relative text-base font-medium transition-colors px-4 py-2.5 rounded-lg',
                        isActive(link.href)
                          ? activeBrand === 'chilli'
                            ? 'text-chilli-dark bg-chilli-dark/5'
                            : 'text-ohana-dark bg-ohana/5'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      )}
                    >
                      {isActive(link.href) && (
                        <span
                          className={cn(
                            'absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full',
                            activeBrand === 'chilli' ? 'bg-chilli-dark' : 'bg-ohana',
                          )}
                        />
                      )}
                      {link.label}
                    </Link>
                  ))}
                </div>

                <div className="border-t border-border/60 mt-4 pt-4">
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setBrandModalOpen(true);
                    }}
                    className={cn(
                      'w-full rounded-full gap-2',
                      activeBrand === 'chilli'
                        ? 'bg-gradient-to-r from-chilli to-chilli-dark text-chilli-foreground hover:opacity-90'
                        : 'btn-ohana',
                    )}
                  >
                    Ordenar Ahora
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      {/* Brand Selector Modal */}
      <BrandSelectorModal
        open={brandModalOpen}
        onOpenChange={setBrandModalOpen}
      />

      {/* Cart Drawer - lazy loaded */}
      <Suspense fallback={null}>
        <CartDrawer
          open={cartOpen}
          onOpenChange={setCartOpen}
        />
      </Suspense>
    </>
  );
}
