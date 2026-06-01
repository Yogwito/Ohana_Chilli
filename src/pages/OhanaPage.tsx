import { Suspense, lazy, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useIntersection } from '@/hooks/use-intersection';
import { useLocation } from 'react-router-dom';
import {
  MapPin, Clock, Star, Plus, Check, Search,
  LayoutGrid, MessageCircle, Instagram, Facebook,
} from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedElement } from '@/components/ui/AnimatedElement';
import ProductImage from '@/components/products/ProductImage';
import ProductDrawer, { type ProductConfig } from '@/components/products/ProductDrawer';
import {
  buildBusinessWhatsAppUrl,
  formatCompactHours,
  isBusinessOpenNow,
} from '@/domain/businessSettings';
import {
  calculateProductUnitPrice,
  isProductCustomizable,
  normalizeProductCustomization,
} from '@/domain/productCustomizations';
import { useBusinessSettings, useProducts, useCategories, usePromotions } from '@/hooks/use-catalog';
import { useCart } from '@/context/CartContext';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Product, Category } from '@/types';

const BowlBuilder = lazy(() => import('@/components/ohana/BowlBuilder'));
const PromotionsSection = lazy(() => import('@/components/ohana/PromotionsSection'));

// Virtual bowl-builder tab — always first, regardless of DB order
const BOWL_BUILDER_ID = 'arma-tu-bowl';
const BOWL_BUILDER_DB_ID = 'ohana-arma-tu-bowl'; // DB category to exclude from allTabs
const VIRTUAL_BOWL_TAB: Category = {
  id: BOWL_BUILDER_ID,
  name: 'Arma tu Bowl',
  slug: BOWL_BUILDER_ID,
  brand: 'ohana',
  icon: undefined,
};
const HEADER_OFFSET = 120;

/** Colombian peso format: $ 24.900 */
function formatCOP(cents: number): string {
  return `$ ${cents.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

// ─── Product row skeleton ────────────────────────────────────────────────────

function ProductRowSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border/10 px-2">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-48 rounded" />
        <Skeleton className="h-4 w-64 rounded" />
        <Skeleton className="h-5 w-24 rounded mt-3" />
      </div>
      <Skeleton className="w-24 h-[72px] rounded-xl shrink-0" />
    </div>
  );
}

// ─── Product row (La Cocina style: text left, image right) ───────────────────

function ProductRow({ product, category, index = 0 }: { product: Product; category?: Category; index?: number }) {
  const { ref, isVisible } = useIntersection({ threshold: 0.05 });
  const { addProduct } = useCart();
  const [added, setAdded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const productWithCategory = useMemo(
    () => ({
      ...product,
      categorySlug: category?.slug,
      categoryName: category?.name,
      category,
    }),
    [category, product],
  );

  const handleAddDirect = () => {
    addProduct(product);
    trackEvent({
      type: 'add_to_cart',
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      priceCents: product.price,
    });
    toast.success(`${product.name} agregado`);
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isProductCustomizable(productWithCategory)) {
      setDrawerOpen(true);
      return;
    }

    handleAddDirect();
  };

  const handleDrawerConfirm = (config: ProductConfig) => {
    const customizations = normalizeProductCustomization(config);
    const unitPrice = calculateProductUnitPrice(product.price, customizations);
    const notes = customizations?.note || undefined;

    addProduct(product, 1, notes, customizations);
    trackEvent({
      type: 'add_to_cart',
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      priceCents: unitPrice,
    });
    toast.success(`${product.name} agregado`, { description: formatCOP(unitPrice) });
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  return (
    <>
      <div
        ref={ref}
        style={{ transitionDelay: `${Math.min(index % 4 * 60, 240)}ms` }}
        className={cn(
          'group flex items-center gap-3 p-3 rounded-2xl border-b border-border/50 last:border-0',
          'hover:bg-accent/50 cursor-pointer transition-colors duration-150',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}
      >
        {/* Left: text */}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm sm:text-base text-foreground">{product.name}</p>
          {product.description?.trim() && (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
              {product.description.trim()}
            </p>
          )}
          <p className="text-sm font-bold text-brand mt-1">
            {formatCOP(product.price)}
          </p>
        </div>

        {/* Right: image with add button */}
        <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 overflow-hidden rounded-2xl shadow-md">
          <ProductImage
            product={product}
            ratio={1}
            imageClassName="group-hover:scale-105"
            className="rounded-2xl"
            fallbackClassName="rounded-2xl bg-gradient-to-br from-brand/30 to-brand-dark/50"
          />

          {/* Floating add button */}
          <button
            onClick={handleAddClick}
            className={cn(
              'absolute bottom-2 right-2 w-9 h-9 rounded-full bg-brand text-white shadow-md',
              'flex items-center justify-center hover:bg-brand/90 hover:shadow-lg active:scale-90 transition-all duration-150',
              added && 'scale-110 bg-brand-dark',
            )}
            aria-label="Agregar al carrito"
          >
            {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <ProductDrawer
        product={product}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onConfirm={handleDrawerConfirm}
      />
    </>
  );
}
// ─── Main page ───────────────────────────────────────────────────────────────

export default function OhanaPage() {
  const location = useLocation();
  const tabsRef = useRef<HTMLDivElement>(null);
  const promotionsRef = useRef<HTMLDivElement>(null);
  const [activeSlug, setActiveSlug] = useState<string>('arma-tu-bowl');

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: categories = [], error: categoriesError } = useCategories('ohana');
  const { data: allProducts = [], isLoading, error: productsError } = useProducts({ brandId: 'ohana' });
  const { data: businessSettings } = useBusinessSettings();
  const { data: activePromotions = [] } = usePromotions();
  const hasActivePromotions = activePromotions.length > 0;

  // Build tab list: virtual bowl builder first, then all DB categories except the bowl-builder one
  const allTabs = useMemo<Category[]>(() => {
    const rest = categories.filter((c) => c.id !== BOWL_BUILDER_DB_ID);
    return [VIRTUAL_BOWL_TAB, ...rest];
  }, [categories]);

  const compactHours = useMemo(() => formatCompactHours({
    hoursWeekday: businessSettings?.hoursWeekday ?? null,
    hoursWeekend: businessSettings?.hoursWeekend ?? null,
  }), [businessSettings?.hoursWeekday, businessSettings?.hoursWeekend]);

  const storeIsOpen = useMemo(() => isBusinessOpenNow({
    hoursWeekday: businessSettings?.hoursWeekday ?? null,
    hoursWeekend: businessSettings?.hoursWeekend ?? null,
  }), [businessSettings?.hoursWeekday, businessSettings?.hoursWeekend]);

  const whatsappHref = useMemo(
    () => buildBusinessWhatsAppUrl(businessSettings?.whatsappNumber, 'Hola! Quiero hacer un pedido en Ohana Bowls.'),
    [businessSettings?.whatsappNumber],
  );

  // Products grouped by categoryId
  const productsByCategory = useMemo(() => {
    const map: Record<string, Product[]> = {};
    for (const p of allProducts) {
      if (!map[p.categoryId]) map[p.categoryId] = [];
      map[p.categoryId].push(p);
    }
    return map;
  }, [allProducts]);

  // Visible categories: bowl builder always shows; others when they have products
  const visibleCategories = useMemo(() => {
    return allTabs.filter((cat) => {
      if (cat.id === BOWL_BUILDER_ID) return true;
      return (productsByCategory[cat.id]?.length ?? 0) > 0;
    });
  }, [allTabs, productsByCategory]);

  const scrollToSection = useCallback((slug: string) => {
    const el = document.getElementById(slug);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setActiveSlug(slug);
    window.dispatchEvent(new CustomEvent('sectionchange', { detail: { section: slug } }));
  }, []);

  // Hash navigation (e.g. /ohana#bebidas from Navbar "Bebidas" link)
  useEffect(() => {
    const hash = location.hash.slice(1);
    if (!hash || visibleCategories.length === 0) return;
    const timer = setTimeout(() => scrollToSection(hash), 250);
    return () => clearTimeout(timer);
  }, [location.hash, visibleCategories, scrollToSection]);

  // IntersectionObserver: track active section + broadcast to Navbar NavCategoryBar
  useEffect(() => {
    if (visibleCategories.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const slug = entry.target.getAttribute('data-section') ?? '';
            if (slug) {
              setActiveSlug(slug);
              window.dispatchEvent(new CustomEvent('sectionchange', { detail: { section: slug } }));
            }
          }
        }
      },
      { rootMargin: `-${HEADER_OFFSET}px 0px -50% 0px`, threshold: 0.3 },
    );
    document.querySelectorAll('[data-section]').forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [visibleCategories]);

  // Scroll active tab into view in the tabs bar when activeSlug changes
  useEffect(() => {
    if (!tabsRef.current) return;
    const activeBtn = tabsRef.current.querySelector<HTMLElement>('[data-active="true"]');
    activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeSlug]);

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Ohana Bowls — Menú"
        description="Bowls frescos, burgers, hot dogs, nachos y más. Arma tu bowl o elige entre nuestras opciones."
        path="/"
      />

      {/* ── SECTION 1: Restaurant header ────────────────────────────────── */}
      <div>
        {/* Hero strip */}
        <div
          className="hero-grain relative w-full overflow-hidden min-h-[420px] sm:min-h-[480px] flex items-center"
          style={{ background: 'linear-gradient(135deg, #5a9e45 0%, #8CC878 50%, #a8d87a 100%)' }}
        >
          <div className="container max-w-4xl flex items-center justify-between gap-6 px-4 py-8 md:py-14">
            {/* Left: copy + CTAs */}
            <div className="flex flex-col gap-3 max-w-xs">
              <span className="inline-flex w-fit items-center rounded-full backdrop-blur-sm bg-white/20 border border-white/30 px-3 py-1 text-xs font-medium text-white">
                🌿 Comida real. Sabor real.
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-normal tracking-tight text-white leading-tight">
                Eat Healthy, Live Happy
              </h1>
              <p className="text-sm sm:text-base text-white/85">
                Arma tu bowl perfecto o elige uno de nuestros sugeridos. Cable Plaza, Piso 4.
              </p>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                <button
                  onClick={() => scrollToSection(BOWL_BUILDER_ID)}
                  className="rounded-full bg-white px-4 py-2 sm:px-5 text-sm font-semibold text-brand-dark shadow-lg hover:bg-white/90 hover:shadow-xl transition-all duration-200 active:scale-95"
                >
                  Arma tu Bowl
                </button>
                <button
                  onClick={() => {
                    const first = allTabs.find((t) => t.id !== BOWL_BUILDER_ID);
                    scrollToSection(first?.slug ?? BOWL_BUILDER_ID);
                  }}
                  className="rounded-full border-2 border-white/70 px-4 py-2 sm:px-5 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
                >
                  Ver menú
                </button>
              </div>
            </div>
            {/* Right: decorative circle */}
            <div className="flex w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-full bg-white/15 items-center justify-center">
              <img
                src="https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/BowlLovers-cropped.png"
                alt="Bowls Lovers"
                className="w-40 h-40 sm:w-56 sm:h-56 object-contain drop-shadow-2xl rounded-full rotate-3 hover:rotate-0 transition-transform duration-300"
              />
            </div>
          </div>
        </div>

        {/* Info row */}
        <div className="bg-background px-4 pb-5">
          <div className="container max-w-4xl">
            <div className="flex items-start gap-4 mb-4">
              {/* Name + badges + social */}
              <div className="flex-1 min-w-0 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p
                    style={{ transitionDelay: '80ms' }}
                    className={cn('font-display font-black text-2xl text-foreground leading-tight truncate', 'scroll-fade-up', mounted && 'in-view')}
                  >
                    Ohana Bowls
                  </p>
                  <div
                    style={{ transitionDelay: '160ms' }}
                    className={cn('flex flex-wrap items-center gap-2 mt-1.5', 'scroll-fade-up', mounted && 'in-view')}
                  >
                    {storeIsOpen !== null ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-brand-muted text-brand-dark">
                        {storeIsOpen ? 'Abierto' : 'Cerrado'}
                      </span>
                    ) : null}
                    {businessSettings?.deliveryEta ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {businessSettings.deliveryEta}
                      </span>
                    ) : null}
                    {businessSettings?.reviewRating ? (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="w-3.5 h-3.5 shrink-0 text-amber-400 fill-amber-400" />
                        {businessSettings.reviewRating}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Social links */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-muted p-2 hover:bg-brand/10 transition-colors"
                      aria-label="WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    </a>
                  ) : null}
                  {businessSettings?.instagramUrl ? (
                    <a
                      href={businessSettings.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-muted p-2 hover:bg-brand/10 transition-colors"
                      aria-label="Instagram"
                    >
                      <Instagram className="w-4 h-4 text-muted-foreground" />
                    </a>
                  ) : null}
                  {businessSettings?.facebookUrl ? (
                    <a
                      href={businessSettings.facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg bg-muted p-2 hover:bg-brand/10 transition-colors"
                      aria-label="Facebook"
                    >
                      <Facebook className="w-4 h-4 text-muted-foreground" />
                    </a>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Address + hours */}
            <div
              style={{ transitionDelay: '240ms' }}
              className={cn('flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground', 'scroll-fade-up', mounted && 'in-view')}
            >
              {businessSettings?.contactAddress ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 shrink-0" />
                  {businessSettings.contactAddress}
                </span>
              ) : null}
              {compactHours ? (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 shrink-0" />
                  {compactHours}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Promotions ───────────────────────────────────────── */}
      <div ref={promotionsRef}>
        <Suspense fallback={null}>
          <PromotionsSection />
        </Suspense>
      </div>

      {/* ── SECTION 3: Sticky category tabs ────────────────────────────── */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-2">
            {/* Left: action icons (visual only) */}
            <div className="flex items-center gap-1 shrink-0 py-1">
              <button
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Buscar"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Ver como cuadrícula"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable category tabs — use allTabs so they appear before products load */}
            <div
              ref={tabsRef}
              className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide py-2"
              style={{ touchAction: 'pan-x' }}
            >
              {hasActivePromotions && (
                <button
                  onClick={() => promotionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-full text-sm font-medium bg-red-500 text-white animate-pulse"
                >
                  🔥 Promos
                </button>
              )}
              {allTabs.map((cat) => {
                const isActive = activeSlug === cat.slug;
                return (
                  <button
                    key={cat.id}
                    data-active={isActive}
                    onClick={() => scrollToSection(cat.slug)}
                    className={cn(
                      'px-3 py-2 sm:px-4 sm:py-2 text-sm font-semibold whitespace-nowrap shrink-0 rounded-full',
                      'transition-all duration-200',
                      isActive
                        ? 'bg-brand text-white shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 3: Product sections ──────────────────────────────────── */}
      <div className="container max-w-4xl px-4 sm:px-6 py-4 md:py-6">
        {isLoading && visibleCategories.length === 0 ? (
          <div className="space-y-8">
            {[1, 2, 3].map((g) => (
              <div key={g}>
                <Skeleton className="h-7 w-40 rounded mb-2" />
                {[1, 2, 3].map((i) => <ProductRowSkeleton key={i} />)}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-10">
            {visibleCategories.map((cat) => {
              const products = productsByCategory[cat.id] ?? [];
              const isBowlBuilder = cat.id === BOWL_BUILDER_ID;

              return (
                <section
                  key={cat.id}
                  id={cat.slug}
                  data-section={cat.slug}
                >
                  {/* Category section header */}
                  <AnimatedElement animation="fade-up">
                    <div className="py-3 mb-2">
                      <div className="flex items-center gap-3">
                        <h2 className="font-display font-bold text-xl sm:text-2xl tracking-tight text-foreground dark:text-white">
                          {cat.name}
                        </h2>
                        {isBowlBuilder && (
                          <span className="text-xs bg-brand text-white px-2 py-0.5 rounded-full font-semibold">
                            Personalizable
                          </span>
                        )}
                      </div>
                      <div className="mt-1 h-[3px] w-8 rounded-full bg-brand mb-4" />
                    </div>
                  </AnimatedElement>

                  {/* Bowl Builder section */}
                  {isBowlBuilder && (
                    <AnimatedElement animation="scale-up" threshold={0.05} className="rounded-2xl border bg-card p-4 md:p-6 mt-4">
                      <Suspense fallback={<Skeleton className="h-[520px] rounded-xl" />}>
                        <BowlBuilder />
                      </Suspense>
                    </AnimatedElement>
                  )}

                  {/* Product rows */}
                  {!isBowlBuilder && (
                    <div>
                      {isLoading
                        ? [1, 2, 3].map((i) => <ProductRowSkeleton key={i} />)
                        : products.map((p, idx) => <ProductRow key={p.id} product={p} category={cat} index={idx} />)
                      }
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* ── WhatsApp CTA ─────────────────────────────────────────────────── */}
      {whatsappHref ? (
        <div className="container max-w-4xl px-4 pb-8">
          <div className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand to-brand-dark p-5">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-white/80">📍 Cable Plaza · Piso 4 Terraza</p>
              <h3 className="text-base font-semibold text-white">¿Listo para pedir?</h3>
            </div>
            <span className="shrink-0 select-none text-5xl opacity-90">🥗</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
