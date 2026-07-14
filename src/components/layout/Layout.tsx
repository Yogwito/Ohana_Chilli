import { ReactNode, useState, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { House, UtensilsCrossed, ShoppingCart, Info } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import ClosedBanner from './ClosedBanner';
import RestaurantSchema from '@/components/RestaurantSchema';
import { useCart } from '@/context/CartContext';
import { cn } from '@/lib/utils';

const CartDrawer = lazy(() => import('@/components/cart/CartDrawer'));

interface LayoutProps {
  children: ReactNode;
}

const bottomNavItems = [
  { href: '/', icon: House, label: 'Inicio', exact: true },
  { href: '/#arma-tu-bowl', icon: UtensilsCrossed, label: 'Menú', exact: false },
] as const;

export default function Layout({ children }: LayoutProps) {
  const [cartOpen, setCartOpen] = useState(false);
  const location = useLocation();
  const { getItemCount } = useCart();
  const itemCount = getItemCount();

  const isActive = (path: string, exact = false) => {
    if (path.includes('#')) return location.pathname === '/' && location.hash === path.slice(path.indexOf('#'));
    if (exact) return location.pathname === path && !location.hash;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col min-h-screen">
      <RestaurantSchema />
      <ClosedBanner />
      <Navbar />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />

      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 min-h-16 bg-background/95 backdrop-blur-xl border-t border-border/40 flex items-stretch pb-[env(safe-area-inset-bottom)]">
        {bottomNavItems.map(({ href, icon: Icon, label, exact }) => (
          <Link
            key={label}
            to={href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
              isActive(href, exact) ? 'text-brand' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}

        {/* Cart button */}
        <button
          onClick={() => setCartOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-muted-foreground transition-colors"
          aria-label="Abrir carrito"
        >
          <div className="relative">
            <ShoppingCart className="h-5 w-5" />
            {itemCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-brand-dark text-[9px] font-bold text-white flex items-center justify-center">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </div>
          Carrito
        </button>

        <Link
          to="/nosotros"
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
            isActive('/nosotros') ? 'text-brand' : 'text-muted-foreground',
          )}
        >
          <Info className="h-5 w-5" />
          Nosotros
        </Link>
      </nav>

      <Suspense fallback={null}>
        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      </Suspense>
    </div>
  );
}
