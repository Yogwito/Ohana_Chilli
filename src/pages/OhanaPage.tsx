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
import ScrollHero from '@/components/ohana/ScrollHero';
import BrandMarquee from '@/components/ohana/BrandMarquee';
import MagneticButton from '@/components/ui/MagneticButton';
import DeferredSection from '@/components/ui/DeferredSection';
import { useGsapReveal } from '@/hooks/use-gsap-reveal';
import {
  buildBusinessWhatsAppUrl,
  formatCompactHours,
  isBusinessOpenNow,
} from '@/domain/businessSettings';
import { formatPrice } from '@/domain/formatPrice';
import { useBusinessSettings, useProducts, useCategories, usePromotions } from '@/hooks/use-catalog';
import { useAddProduct } from '@/hooks/use-add-product';
import { cn } from '@/lib/utils';
import { Product, Category } from '@/types';

const BowlBuilder = lazy(() => import('@/components/ohana/BowlBuilder'));
const PromotionsSection = lazy(() => import('@/components/ohana/PromotionsSection'));
const ProductDrawer = lazy(() => import('@/components/products/ProductDrawer'));

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

function ProductRow({
  product,
  category,
  index = 0,
  compact = false,
}: {
  product: Product;
  category?: Category;
  index?: number;
  compact?: boolean;
}) {
  const { ref, isVisible } = useIntersection({ threshold: 0.05 });

  const productWithCategory = useMemo(
    () => ({
      ...product,
      categorySlug: category?.slug,
      categoryName: category?.name,
      category,
    }),
    [category, product],
  );

  const { added, drawerOpen, setDrawerOpen, handleAddClick, handleDrawerConfirm } =
    useAddProduct(product, productWithCategory);

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
            {formatPrice(product.price)}
          </p>
        </div>

        {/* Right: image with add button */}
        <div className={cn(
          'relative shrink-0 overflow-hidden rounded-2xl shadow-md transition-all duration-200',
          compact ? 'h-20 w-20 sm:h-24 sm:w-24' : 'h-28 w-28 sm:h-32 sm:w-32',
        )}>
          <ProductImage
            product={product}
            ratio={1}
            imageClassName="group-hover:scale-105"
            className="rounded-2xl"
            fallbackClassName="rounded-2xl bg-gradient-to-br from-brand/30 to-brand-dark/50"
          />

          {/* Floating add button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddClick();
            }}
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

      {drawerOpen ? (
        <Suspense fallback={null}>
          <ProductDrawer
            product={product}
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            onConfirm={handleDrawerConfirm}
          />
        </Suspense>
      ) : null}
    </>
  );
}
// ─── Main page ───────────────────────────────────────────────────────────────

export default function OhanaPage() {
  const location = useLocation();
  const pageRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const promotionsRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [activeSlug, setActiveSlug] = useState<string>('arma-tu-bowl');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [compactView, setCompactView] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { data: categories = [], error: categoriesError } = useCategories('ohana');
  const { data: allProducts = [], isLoading, error: productsError } = useProducts();
  const ohanaProducts = useMemo(
    () => allProducts.filter((product) => product.brand === 'ohana'),
    [allProducts],
  );
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
    const query = searchQuery.trim().toLowerCase();
    const visibleProducts = query
      ? ohanaProducts.filter((product) => {
        const category = categories.find((cat) => cat.id === product.categoryId);
        return [product.name, product.description, category?.name]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      })
      : ohanaProducts;

    for (const p of visibleProducts) {
      if (!map[p.categoryId]) map[p.categoryId] = [];
      map[p.categoryId].push(p);
    }
    return map;
  }, [ohanaProducts, categories, searchQuery]);

  // Visible categories: bowl builder always shows; others when they have products
  const visibleCategories = useMemo(() => {
    return allTabs.filter((cat) => {
      if (cat.id === BOWL_BUILDER_ID) return true;
      return (productsByCategory[cat.id]?.length ?? 0) > 0;
    });
  }, [allTabs, productsByCategory]);

  const totalVisibleProducts = useMemo(
    () => Object.values(productsByCategory).reduce((sum, products) => sum + products.length, 0),
    [productsByCategory],
  );

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
  }, [searchOpen]);

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

  // Scroll active tab into view in the tabs bar when activeSlug changes.
  // Skipped on mount: block 'nearest' would vertically scroll the PAGE to the
  // tab bar on load, yanking the user past the hero before they ever scroll.
  const tabSyncReadyRef = useRef(false);
  useEffect(() => {
    if (!tabSyncReadyRef.current) {
      tabSyncReadyRef.current = true;
      return;
    }
    if (!tabsRef.current) return;
    const activeBtn = tabsRef.current.querySelector<HTMLElement>('[data-active="true"]');
    activeBtn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeSlug]);

  // GSAP scroll-triggered entrances for [data-reveal] elements; re-scans as
  // sections render (products load, search filters, view mode changes)
  useGsapReveal(pageRef, [visibleCategories, searchQuery, compactView, isLoading]);

  return (
    <div ref={pageRef} className="min-h-screen">
      <SEOHead
        title="Ohana Bowls — Menú"
        description="Bowls frescos, burgers, hot dogs, nachos y más. Arma tu bowl o elige entre nuestras opciones."
        path="/"
      />

      {/* ── SECTION 1: Restaurant header ────────────────────────────────── */}
      <div>
        {/* Scroll-driven hero (video scrubbing + staged text reveal) */}
        <ScrollHero
          onPrimaryClick={() => scrollToSection(BOWL_BUILDER_ID)}
          onSecondaryClick={() => {
            const first = allTabs.find((t) => t.id !== BOWL_BUILDER_ID);
            scrollToSection(first?.slug ?? BOWL_BUILDER_ID);
          }}
        />

        {/* Info row */}
        <div className="bg-background px-4 pt-3 pb-5">
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

      {/* ── Brand marquee strip ─────────────────────────────────────────── */}
      <BrandMarquee />

      {/* ── SECTION 2: Promotions ───────────────────────────────────────── */}
      {hasActivePromotions ? (
        <div ref={promotionsRef}>
          <DeferredSection
            rootMargin="250px 0px"
            fallback={<Skeleton className="mx-auto my-4 h-[248px] w-full max-w-4xl rounded-2xl" />}
          >
            <Suspense fallback={<Skeleton className="mx-auto my-4 h-[248px] w-full max-w-4xl rounded-2xl" />}>
              <PromotionsSection />
            </Suspense>
          </DeferredSection>
        </div>
      ) : null}

      {/* ── SECTION 3: Sticky category tabs ────────────────────────────── */}
      <div className="sticky top-14 z-40 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="container max-w-4xl">
          <div className="flex items-center gap-2">
            {/* Left: menu tools */}
            <div className="flex items-center gap-1 shrink-0 py-1">
              <button
                type="button"
                onClick={() => setSearchOpen((open) => !open)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label={searchOpen ? 'Cerrar búsqueda' : 'Buscar en el menú'}
                aria-expanded={searchOpen}
                aria-controls="menu-search"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCompactView((value) => !value)}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  compactView
                    ? 'bg-brand/10 text-brand-dark'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
                )}
                aria-label={compactView ? 'Ver menú con imágenes grandes' : 'Ver menú compacto'}
                aria-pressed={compactView}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable category tabs — use allTabs so they appear before products load */}
            <div
              ref={tabsRef}
              className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-hide py-2 px-4"
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

          {searchOpen && (
            <div className="border-t border-border/40 py-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  id="menu-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Busca bowls, bebidas o ingredientes..."
                  className="h-11 w-full rounded-full border border-border bg-card pl-10 pr-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </div>
              {searchQuery.trim() ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  {totalVisibleProducts} resultado{totalVisibleProducts === 1 ? '' : 's'} para “{searchQuery.trim()}”
                </p>
              ) : null}
            </div>
          )}
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
        ) : searchQuery.trim() && totalVisibleProducts === 0 ? (
          <div className="rounded-3xl border border-dashed bg-card p-8 text-center">
            <p className="text-lg font-semibold text-foreground">No encontramos “{searchQuery.trim()}”</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Prueba con otro ingrediente, una bebida o vuelve a ver el menú completo.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-5 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              Limpiar búsqueda
            </button>
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
                  <div data-reveal className="py-3 mb-2">
                    <div className="flex items-baseline gap-3">
                      <h2 className="hero-title text-2xl sm:text-4xl tracking-tight text-foreground dark:text-white">
                        {cat.name}
                      </h2>
                      <span
                        aria-hidden="true"
                        className="h-2.5 w-2.5 rounded-full shrink-0 translate-y-[-2px]"
                        style={{ background: 'hsl(var(--maiz))' }}
                      />
                      {isBowlBuilder && (
                        <span className="text-xs bg-brand text-white px-2.5 py-1 rounded-full font-semibold whitespace-nowrap">
                          Personalizable
                        </span>
                      )}
                    </div>
                    {!isBowlBuilder && (
                      <p className="mt-1 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                        {products.length} {products.length === 1 ? 'opción' : 'opciones'}
                      </p>
                    )}
                  </div>

                  {/* Bowl Builder section */}
                  {isBowlBuilder && (
                    <AnimatedElement animation="scale-up" threshold={0.05} className="rounded-2xl border bg-card p-4 md:p-6 mt-4">
                      <DeferredSection
                        rootMargin="500px 0px"
                        fallback={<Skeleton className="h-[520px] rounded-xl" />}
                      >
                        <Suspense fallback={<Skeleton className="h-[520px] rounded-xl" />}>
                          <BowlBuilder />
                        </Suspense>
                      </DeferredSection>
                    </AnimatedElement>
                  )}

                  {/* Product rows */}
                  {!isBowlBuilder && (
                    <div>
                      {isLoading
                        ? [1, 2, 3].map((i) => <ProductRowSkeleton key={i} />)
                        : products.map((p, idx) => (
                          <ProductRow key={p.id} product={p} category={cat} index={idx} compact={compactView} />
                        ))
                      }
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* ── WhatsApp CTA — back on the emerald tabletop ─────────────────── */}
      {whatsappHref ? (
        <div className="hero-grain relative overflow-hidden mt-6" style={{ background: 'hsl(var(--mesa))' }}>
          <div className="container max-w-4xl px-4 py-14 sm:py-20 flex flex-col items-center text-center gap-5">
            <p data-reveal className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: 'hsl(var(--maiz))' }}>
              📍 Cable Plaza · Piso 4 Terraza
            </p>
            <h3 data-reveal className="hero-title text-3xl sm:text-5xl text-white leading-tight max-w-xl">
              ¿Listo para tu bowl?
            </h3>
            <div data-reveal>
              <MagneticButton
                as="a"
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 rounded-full bg-white px-8 py-3.5 text-sm font-bold text-brand-dark shadow-xl hover:shadow-2xl transition-shadow"
              >
                <MessageCircle className="w-4 h-4" />
                Pedir por WhatsApp
              </MagneticButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
