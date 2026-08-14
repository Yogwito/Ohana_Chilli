import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Moon, ShoppingBag, Sun } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/lib/utils';

const CartDrawer = lazy(() => import('@/components/cart/CartDrawer'));

const NAV_LINKS = [
  { href: '/#arma-tu-bowl', label: 'Arma tu bowl' },
  { href: '/#menu', label: 'Menú' },
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
] as const;

export default function Navbar() {
  const location = useLocation();
  const { getItemCount } = useCart();
  const { theme, setTheme } = useTheme();
  const [cartOpen, setCartOpen] = useState(false);
  const [badgeAnimating, setBadgeAnimating] = useState(false);
  const previousCount = useRef(0);
  const itemCount = getItemCount();

  useEffect(() => {
    if (itemCount !== previousCount.current && previousCount.current > 0) {
      setBadgeAnimating(true);
      const timer = window.setTimeout(() => setBadgeAnimating(false), 300);
      previousCount.current = itemCount;
      return () => window.clearTimeout(timer);
    }
    previousCount.current = itemCount;
  }, [itemCount]);

  const isActive = (href: string) => {
    if (href.includes('#')) return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur-xl">
        <nav className="container flex h-16 items-center gap-5">
          <Link to="/" className="group flex shrink-0 items-end gap-2" aria-label="Ohana Bowls, inicio">
            <span className="font-display text-3xl font-black leading-none text-brand-dark dark:text-brand">
              OHANA
            </span>
            <span className="mb-0.5 hidden font-utility text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:block">
              Bowls · MZL
            </span>
          </Link>

          <div className="ml-4 hidden flex-1 items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'rounded-sm px-3 py-2 text-sm font-semibold transition-colors',
                  isActive(link.href)
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex h-11 w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Cambiar tema"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>

            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="relative inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-3.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-[hsl(var(--mesa-light))] sm:px-4"
              aria-label={`Abrir pedido${itemCount ? `, ${itemCount} productos` : ''}`}
            >
              <ShoppingBag className="h-4.5 w-4.5" />
              <span className="hidden sm:inline">Tu pedido</span>
              {itemCount > 0 && (
                <span
                  className={cn(
                    'flex h-5 min-w-5 items-center justify-center rounded-sm bg-[hsl(var(--maiz))] px-1 font-utility text-[10px] font-bold text-[hsl(var(--maiz-foreground))] transition-transform',
                    badgeAnimating && 'scale-110',
                  )}
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </button>
          </div>
        </nav>
      </header>

      <Suspense fallback={null}>
        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      </Suspense>
    </>
  );
}
