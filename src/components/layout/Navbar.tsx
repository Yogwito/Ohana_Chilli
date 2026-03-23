import { useState, lazy, Suspense, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useCart } from '@/context/CartContext';
import { useCategories } from '@/hooks/use-catalog';
import { cn } from '@/lib/utils';

const CartDrawer = lazy(() => import('@/components/cart/CartDrawer'));

const HEADER_OFFSET = 112;
const BOWL_BUILDER_DB_ID = 'ohana-arma-tu-bowl';
const VIRTUAL_BOWL_TAB = { id: 'arma-tu-bowl', name: 'Arma tu Bowl', slug: 'arma-tu-bowl' };

const STATIC_LINKS = [
  { href: '/nosotros', label: 'Nosotros' },
  { href: '/contacto', label: 'Contacto' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { getItemCount } = useCart();
  const { data: rawCategories = [] } = useCategories('ohana');

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [badgeAnimating, setBadgeAnimating] = useState(false);
  const [activeCategory, setActiveCategory] = useState('');
  const prevCountRef = useRef(0);

  // Build full category list: virtual bowl-builder first, then DB categories (excluding the DB bowl-builder entry)
  const categories = [
    VIRTUAL_BOWL_TAB,
    ...rawCategories.filter((c) => c.id !== BOWL_BUILDER_DB_ID),
  ];

  // Cart badge animation
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

  // Sync active category from scroll-spy events dispatched by OhanaPage
  useEffect(() => {
    const handler = (e: Event) => {
      const slug = (e as CustomEvent<{ section: string }>).detail?.section;
      if (slug) setActiveCategory(slug);
    };
    window.addEventListener('sectionchange', handler);
    return () => window.removeEventListener('sectionchange', handler);
  }, []);

  const scrollToCategory = (slug: string) => {
    const el = document.getElementById(slug);
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top, behavior: 'smooth' });
  };

  const handleCategoryClick = (slug: string) => {
    if (location.pathname !== '/') {
      navigate('/');
      setTimeout(() => scrollToCategory(slug), 300);
    } else {
      scrollToCategory(slug);
    }
  };

  const isOnHome = location.pathname === '/';

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/40">
        <nav className="container flex h-14 items-center gap-4">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-1 shrink-0">
            <span className="font-display font-black text-xl tracking-tight text-brand">Ohana</span>
            <span className="font-display font-light text-xl tracking-tight text-brand-light">Bowls</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1 flex-1 min-w-0">
            {/* Inicio */}
            <Link
              to="/"
              className={cn(
                'text-sm font-medium px-3 py-1.5 rounded-lg transition-colors shrink-0',
                isOnHome
                  ? 'text-brand font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              Inicio
            </Link>

            {/* Separator */}
            <div className="w-px h-4 bg-border mx-1 shrink-0" />

            {/* Dynamic category links */}
            <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide min-w-0">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.slug)}
                  className={cn(
                    'text-sm font-medium px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0',
                    'transition-colors hover:text-brand hover:bg-brand/5',
                    activeCategory === cat.slug && isOnHome
                      ? 'text-brand bg-brand/8 font-semibold'
                      : 'text-muted-foreground',
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Right-side actions */}
          <div className="flex items-center gap-1 shrink-0 ml-auto md:ml-0">
            {/* Static links — desktop only */}
            {STATIC_LINKS.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  'hidden lg:block text-sm font-medium px-3 py-1.5 rounded-lg transition-colors shrink-0',
                  location.pathname.startsWith(link.href)
                    ? 'text-brand'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                )}
              >
                {link.label}
              </Link>
            ))}

            {/* Cart button */}
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
                    'absolute -top-1 -right-1 h-5 w-5 rounded-full bg-brand-dark text-[10px] font-bold text-white flex items-center justify-center transition-transform duration-200',
                    badgeAnimating && 'scale-125',
                  )}
                >
                  {itemCount > 99 ? '99+' : itemCount}
                </span>
              )}
            </Button>

            {/* Mobile hamburger */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </SheetTrigger>

              <SheetContent side="right" className="w-[280px] sm:w-[320px] overflow-y-auto">
                {/* Logo */}
                <div className="flex items-center gap-1 mb-6 mt-2">
                  <span className="font-display font-black text-lg text-brand">Ohana</span>
                  <span className="font-display font-light text-lg text-brand-light">Bowls</span>
                </div>

                {/* Inicio */}
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center text-base font-medium px-4 py-2.5 rounded-lg transition-colors',
                    isOnHome ? 'text-brand bg-brand/5' : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  Inicio
                </Link>

                {/* Category section */}
                <div className="mt-3 mb-1 px-4">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Menú</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleCategoryClick(cat.slug);
                      }}
                      className={cn(
                        'text-left text-base font-medium px-4 py-2.5 rounded-lg transition-colors',
                        activeCategory === cat.slug && isOnHome
                          ? 'text-brand bg-brand/5'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      )}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                {/* Divider + static links */}
                <div className="border-t border-border/60 mt-4 pt-4 flex flex-col gap-0.5">
                  {STATIC_LINKS.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'text-base font-medium px-4 py-2.5 rounded-lg transition-colors',
                        location.pathname.startsWith(link.href)
                          ? 'text-brand bg-brand/5'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                      )}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      <Suspense fallback={null}>
        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      </Suspense>
    </>
  );
}
