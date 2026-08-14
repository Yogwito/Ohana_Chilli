import { ReactNode, useState, lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { House, UtensilsCrossed, ShoppingBag, Info } from 'lucide-react';
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
    <div className="flex min-h-screen flex-col overflow-x-clip">
      <RestaurantSchema />
      <ClosedBanner />
      <Navbar />
      <main className="flex-1 pb-[calc(4.25rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
      <Footer />

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex min-h-[4.25rem] items-stretch border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden">
        {bottomNavItems.map(({ href, icon: Icon, label, exact }) => (
          <Link
            key={label}
            to={href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 font-utility text-[9px] font-semibold uppercase transition-colors',
              isActive(href, exact) ? 'text-brand-dark dark:text-brand' : 'text-muted-foreground',
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </Link>
        ))}

        {/* Cart button */}
        <button
          onClick={() => setCartOpen(true)}
          className="flex flex-1 flex-col items-center justify-center gap-1 font-utility text-[9px] font-semibold uppercase text-muted-foreground transition-colors"
          aria-label="Abrir carrito"
        >
          <div className="relative">
            <ShoppingBag className="h-[18px] w-[18px]" />
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-sm bg-[hsl(var(--maiz))] px-0.5 text-[8px] font-bold text-[hsl(var(--maiz-foreground))]">
                {itemCount > 9 ? '9+' : itemCount}
              </span>
            )}
          </div>
          Carrito
        </button>

        <Link
          to="/nosotros"
          className={cn(
              'flex flex-1 flex-col items-center justify-center gap-1 font-utility text-[9px] font-semibold uppercase transition-colors',
              isActive('/nosotros') ? 'text-brand-dark dark:text-brand' : 'text-muted-foreground',
          )}
        >
          <Info className="h-[18px] w-[18px]" />
          Nosotros
        </Link>
      </nav>

      <Suspense fallback={null}>
        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      </Suspense>
    </div>
  );
}
