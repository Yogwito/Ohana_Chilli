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
import ProductDrawer from '@/components/products/ProductDrawer';
import ScrollHero from '@/components/ohana/ScrollHero';
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
const HEADER_OFFSET = 148;

// ─── Product row skeleton ────────────────────────────────────────────────────

function ProductRowSkeleton() {
  return (
    <div className="grid min-h-36 grid-cols-[1fr_108px] overflow-hidden rounded-md border bg-card sm:grid-cols-[1fr_132px]">
      <div className="space-y-3 p-4">
        <Skeleton className="h-5 w-2/3 rounded-sm" />
        <Skeleton className="h-4 w-full rounded-sm" />
        <Skeleton className="h-5 w-24 rounded-sm" />
      </div>
      <Skeleton className="h-full min-h-36 w-full rounded-none" />
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

  // El drawer se monta la primera vez que se abre. Montándolo con la card,
  // cada uno de los ~35 productos de la home lanzaba su propia consulta de
  // ingredientes por defecto (35 GET + 35 preflight CORS) antes de que el
  // usuario tocara nada. Tras la primera apertura permanece montado.
  const [hasOpenedDrawer, setHasOpenedDrawer] = useState(false);
  useEffect(() => {
    if (drawerOpen) setHasOpenedDrawer(true);
  }, [drawerOpen]);

  return (
    <>
      <div
        ref={ref}
        style={{ transitionDelay: `${Math.min(index % 4 * 60, 240)}ms` }}
        className={cn(
          'group grid min-h-36 grid-cols-[1fr_108px] overflow-hidden rounded-md border bg-card sm:grid-cols-[1fr_132px]',
          'transition-colors duration-150 hover:border-foreground/30',
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
        )}
      >
        <div className="flex min-w-0 flex-col p-4">
          <p className="text-sm font-extrabold leading-snug text-foreground sm:text-base">{product.name}</p>
          {product.description?.trim() && (
            <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {product.description.trim()}
            </p>
          )}
          <p className="mt-auto pt-3 font-utility text-sm font-semibold text-brand-dark dark:text-brand">
            {formatPrice(product.price)}
          </p>
        </div>

        <div className={cn(
          'relative min-h-full overflow-hidden border-l transition-all duration-200',
          compact && 'sm:max-w-[108px]',
        )}>
          <ProductImage
            product={product}
            ratio={1}
            imageClassName="group-hover:scale-[1.03]"
            className="h-full rounded-none"
            fallbackClassName="h-full rounded-none bg-brand-muted"
          />

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAddClick();
            }}
            className={cn(
              'absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm',
              'transition-colors duration-150 hover:bg-[hsl(var(--mesa-light))] active:translate-y-px',
              added && 'bg-brand',
            )}
            aria-label="Agregar al carrito"
          >
            {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {hasOpenedDrawer && (
        <ProductDrawer
          product={product}
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onConfirm={handleDrawerConfirm}
        />
      )}
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
    const query = searchQuery.trim().toLowerCase();
    const visibleProducts = query
      ? allProducts.filter((product) => {
        const category = categories.find((cat) => cat.id === product.categoryId);
        return [product.name, product.description, category?.name]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      })
      : allProducts;

    for (const p of visibleProducts) {
      if (!map[p.categoryId]) map[p.categoryId] = [];
      map[p.categoryId].push(p);
    }
    return map;
  }, [allProducts, categories, searchQuery]);

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
    <div ref={pageRef} className="min-h-screen bg-background">
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

        <div className="border-b bg-background">
          <div className="container grid gap-5 py-5 md:grid-cols-[1fr_auto] md:items-center">
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p
                    style={{ transitionDelay: '80ms' }}
                    className={cn('font-display text-3xl font-black leading-none text-foreground', 'scroll-fade-up', mounted && 'in-view')}
                  >
                    Ohana Bowls
                  </p>
                  <div
                    style={{ transitionDelay: '160ms' }}
                    className={cn('mt-2 flex flex-wrap items-center gap-x-4 gap-y-2', 'scroll-fade-up', mounted && 'in-view')}
                  >
                    {storeIsOpen !== null ? (
                      <span className="inline-flex items-center gap-2 font-utility text-[10px] font-semibold uppercase tracking-[0.1em] text-brand-dark dark:text-brand">
                        <span className={cn('h-2 w-2 rounded-full', storeIsOpen ? 'bg-brand' : 'bg-destructive')} />
                        {storeIsOpen ? 'Abierto' : 'Cerrado'}
                      </span>
                    ) : null}
                    {businessSettings?.deliveryEta ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Clock className="w-3.5 h-3.5 shrink-0" />
                        {businessSettings.deliveryEta}
                      </span>
                    ) : null}
                    {businessSettings?.reviewRating ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                        <Star className="w-3.5 h-3.5 shrink-0 text-amber-400 fill-amber-400" />
                        {businessSettings.reviewRating}
                      </span>
                    ) : null}
                  </div>
                </div>

              </div>

              <div
                style={{ transitionDelay: '240ms' }}
                className={cn('mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground', 'scroll-fade-up', mounted && 'in-view')}
              >
                {businessSettings?.contactAddress ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 shrink-0 text-brand-dark dark:text-brand" />
                    {businessSettings.contactAddress}
                  </span>
                ) : null}
                {compactHours ? (
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0 text-brand-dark dark:text-brand" />
                    {compactHours}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {whatsappHref ? (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-md border px-4 text-sm font-bold transition-colors hover:bg-muted">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              ) : null}
              {businessSettings?.instagramUrl ? (
                <a href={businessSettings.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-md border transition-colors hover:bg-muted" aria-label="Instagram">
                  <Instagram className="h-4 w-4" />
                </a>
              ) : null}
              {businessSettings?.facebookUrl ? (
                <a href={businessSettings.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-md border transition-colors hover:bg-muted" aria-label="Facebook">
                  <Facebook className="h-4 w-4" />
                </a>
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
      <div id="menu" className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur-xl">
        <div className="container">
          <div className="flex min-h-16 items-center gap-2">
            {/* Left: menu tools */}
            <div className="flex shrink-0 items-center gap-1 py-1">
              <button
                type="button"
                onClick={() => setSearchOpen((open) => !open)}
                className="flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
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
                  'flex h-10 w-10 items-center justify-center rounded-md transition-colors',
                  compactView
                    ? 'bg-brand-muted text-brand-dark'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
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
              className="flex flex-1 items-center gap-1 overflow-x-auto px-2 py-2 scrollbar-hide"
              style={{ touchAction: 'pan-x' }}
            >
              {hasActivePromotions && (
                <button
                  onClick={() => promotionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  className="shrink-0 rounded-sm bg-[hsl(var(--tomate))] px-3 py-2 font-utility text-[10px] font-semibold uppercase tracking-[0.08em] text-white"
                >
                  Promos
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
                      'shrink-0 whitespace-nowrap rounded-sm px-3 py-2 text-sm font-bold transition-colors sm:px-4',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {searchOpen && (
            <div className="border-t py-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  id="menu-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Busca bowls, bebidas o ingredientes..."
                  className="h-11 w-full rounded-md border bg-card pl-10 pr-4 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
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
      <div className="container py-8 sm:py-12">
        {isLoading && visibleCategories.length === 0 ? (
          <div className="grid gap-5 md:grid-cols-2">
            {[1, 2, 3].map((g) => (
              <div key={g} className="space-y-3">
                <Skeleton className="h-7 w-40 rounded-sm" />
                {[1, 2, 3].map((i) => <ProductRowSkeleton key={i} />)}
              </div>
            ))}
          </div>
        ) : searchQuery.trim() && totalVisibleProducts === 0 ? (
          <div className="rounded-md border border-dashed bg-card p-8 text-center">
            <p className="text-lg font-semibold text-foreground">No encontramos “{searchQuery.trim()}”</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Prueba con otro ingrediente, una bebida o vuelve a ver el menú completo.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="mt-5 rounded-md bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-[hsl(var(--mesa-light))]"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : (
          <div className="space-y-16">
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
                  <div data-reveal className="mb-5 border-b pb-4">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <h2 className="hero-title text-4xl text-foreground sm:text-5xl">
                        {cat.name}
                      </h2>
                      {isBowlBuilder && (
                        <span className="rounded-sm bg-brand-muted px-2 py-1 font-utility text-[10px] font-semibold uppercase tracking-[0.08em] text-brand-dark">
                          Hecho por ti
                        </span>
                      )}
                    </div>
                    {!isBowlBuilder && (
                      <p className="mt-2 font-utility text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                        {products.length} {products.length === 1 ? 'opción' : 'opciones'}
                      </p>
                    )}
                  </div>

                  {/* Bowl Builder section */}
                  {isBowlBuilder && (
                    <AnimatedElement animation="scale-up" threshold={0.05}>
                      <Suspense fallback={<Skeleton className="h-[520px] rounded-xl" />}>
                        <BowlBuilder />
                      </Suspense>
                    </AnimatedElement>
                  )}

                  {/* Product rows */}
                  {!isBowlBuilder && (
                    <div className="grid gap-3 md:grid-cols-2">
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

      {whatsappHref ? (
        <section className="mt-10 bg-[hsl(var(--maiz))] text-[hsl(var(--maiz-foreground))]">
          <div className="container grid gap-6 py-12 sm:grid-cols-[1fr_auto] sm:items-center sm:py-16">
            <div>
              <p data-reveal className="section-kicker !text-foreground/60">Pedido directo</p>
              <h3 data-reveal className="mt-2 max-w-xl text-4xl leading-none sm:text-5xl">
                ¿Prefieres hablar con nosotros?
              </h3>
            </div>
            <div data-reveal>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-md bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-[hsl(var(--mesa-light))] sm:w-auto"
              >
                <MessageCircle className="w-4 h-4" />
                Pedir por WhatsApp
              </a>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
