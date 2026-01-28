import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/context/CartContext';
import BrandSelectorModal from './BrandSelectorModal';
import CartDrawer from '@/components/cart/CartDrawer';

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
  
  const itemCount = getItemCount();
  
  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex">
              <span className="text-xl font-bold text-ohana">Ohana</span>
              <span className="text-xl font-bold text-muted-foreground mx-1">&</span>
              <span className="text-xl font-bold text-chilli-dark">Chilli</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  isActive(link.href)
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              >
                {link.label}
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
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-chilli-dark text-[10px] font-bold text-white flex items-center justify-center">
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Button>

            {/* Order Now Button */}
            <Button
              onClick={() => setBrandModalOpen(true)}
              className="hidden sm:flex btn-ohana"
            >
              Ordenar Ahora
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
                <div className="flex flex-col gap-6 mt-6">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`text-lg font-medium transition-colors ${
                        isActive(link.href)
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setBrandModalOpen(true);
                    }}
                    className="btn-ohana w-full mt-4"
                  >
                    Ordenar Ahora
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

      {/* Cart Drawer */}
      <CartDrawer 
        open={cartOpen} 
        onOpenChange={setCartOpen} 
      />
    </>
  );
}
