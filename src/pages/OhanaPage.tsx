import { Suspense, lazy, useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  MapPin, Clock, Star, Plus, Check, Search,
  LayoutGrid, MessageCircle, Instagram, Facebook,
} from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts, useCategories } from '@/hooks/use-catalog';
import { useCart } from '@/context/CartContext';
import { trackEvent } from '@/lib/analytics';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Product, Category } from '@/types';

const BowlBuilder = lazy(() => import('@/components/ohana/BowlBuilder'));

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
      <Skeleton className="w-32 h-24 md:w-40 md:h-28 rounded-xl shrink-0" />
    </div>
  );
}

// ─── Product row (La Cocina style: text left, image right) ───────────────────

function ProductRow({ product }: { product: Product }) {
  const { addProduct } = useCart();
  const [added, setAdded] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  return (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border/10 hover:bg-muted/30 dark:hover:bg-white/5 transition-colors px-2 rounded-lg cursor-pointer">
      {/* Left: text */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-base text-foreground">{product.name}</p>
        {product.description?.trim() && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1 max-w-sm leading-relaxed">
            {product.description.trim()}
          </p>
        )}
        <p className="font-bold text-lg text-foreground dark:text-white mt-3">
          {formatCOP(product.price)}
        </p>
      </div>

      {/* Right: image with add button */}
      <div className="w-32 h-24 md:w-40 md:h-28 rounded-xl overflow-hidden relative shrink-0">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="bg-brand/10 w-full h-full flex items-center justify-center">
            <span className="text-4xl font-black text-brand/30 select-none">
              {product.name.charAt(0)}
            </span>
          </div>
        )}

        {/* Floating add button */}
        <button
          onClick={handleAdd}
          className={cn(
            'absolute bottom-2 right-2 w-8 h-8 rounded-full bg-brand text-white shadow-md',
            'flex items-center justify-center hover:bg-brand-dark active:scale-95 transition-all duration-200',
            added && 'scale-110',
          )}
          aria-label="Agregar al carrito"
        >
          {added ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function OhanaPage() {
  const location = useLocation();
  const tabsRef = useRef<HTMLDivElement>(null);
  const [activeSlug, setActiveSlug] = useState<string>('arma-tu-bowl');

  const { data: categories = [] } = useCategories('ohana');
  const { data: allProducts = [], isLoading } = useProducts({ brandId: 'ohana' });

  // Build tab list: virtual bowl builder first, then all DB categories except the bowl-builder one
  const allTabs = useMemo<Category[]>(() => {
    const rest = categories.filter((c) => c.id !== BOWL_BUILDER_DB_ID);
    return [VIRTUAL_BOWL_TAB, ...rest];
  }, [categories]);

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
    <div className="min-h-screen bg-white dark:bg-[#0f0f0f]">
      <SEOHead
        title="Ohana Bowls — Menú"
        description="Bowls frescos, burgers, hot dogs, nachos y más. Arma tu bowl o elige entre nuestras opciones."
        path="/"
      />

      {/* ── SECTION 1: Restaurant header ────────────────────────────────── */}
      <div>
        {/* Cover photo strip */}
        <div
          className="w-full h-[200px] md:h-[280px] overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #8CC878 0%, #4a9e3f 50%, #2d6e28 100%)',
          }}
        />

        {/* Info row */}
        <div className="bg-white dark:bg-[#0f0f0f] px-4 pb-5">
          <div className="container max-w-4xl">
            <div className="flex items-end gap-4 -mt-12 mb-4">
              {/* Logo card */}
              <div className="w-[120px] h-[120px] rounded-2xl shadow-lg bg-white dark:bg-[#1a1a1a] border border-brand/30 flex flex-col items-center justify-center shrink-0">
                <span className="font-display font-black text-2xl text-brand leading-none">Ohana</span>
                <span className="font-display font-light text-xl text-brand leading-none">Bowls</span>
              </div>

              {/* Name + badges + social */}
              <div className="flex-1 min-w-0 pt-14 flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="font-display font-black text-2xl text-foreground leading-tight truncate">
                    Ohana Bowls
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400">
                      Abierto
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      35–50 min
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="w-3.5 h-3.5 shrink-0 text-amber-400 fill-amber-400" />
                      4.9
                    </span>
                  </div>
                </div>

                {/* Social links */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href="https://wa.me/573215667170"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-muted p-2 hover:bg-brand/10 transition-colors"
                    aria-label="WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  </a>
                  <a
                    href="https://www.instagram.com/bowlsohana"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-muted p-2 hover:bg-brand/10 transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="w-4 h-4 text-muted-foreground" />
                  </a>
                  <a
                    href="https://www.facebook.com/share/1FMJDYhpdD/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-muted p-2 hover:bg-brand/10 transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-4 h-4 text-muted-foreground" />
                  </a>
                </div>
              </div>
            </div>

            {/* Address + hours */}
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 shrink-0" />
                c.c Cable Plaza Piso 4 Terraza, Manizales, Caldas
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 shrink-0" />
                Lun–Dom: 11:00 – 21:00
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION 2: Sticky category tabs ─────────────────────────────── */}
      <div className="sticky top-14 z-40 bg-background/95 dark:bg-[#0f0f0f]/95 backdrop-blur-md border-b border-border/40">
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
              className="flex-1 flex overflow-x-auto scrollbar-hide"
            >
              {allTabs.map((cat) => {
                const isActive = activeSlug === cat.slug;
                return (
                  <button
                    key={cat.id}
                    data-active={isActive}
                    onClick={() => scrollToSection(cat.slug)}
                    className={cn(
                      'px-4 py-3 text-sm font-semibold uppercase tracking-wide whitespace-nowrap shrink-0',
                      'transition-colors duration-150 border-b-2',
                      isActive
                        ? 'text-brand border-brand'
                        : 'text-muted-foreground border-transparent hover:text-foreground',
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
      <div className="container max-w-4xl py-4 md:py-6">
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
                  <div className="flex items-center gap-3 py-3 border-b border-border/20 mb-2">
                    <h2 className="font-display font-bold text-xl uppercase tracking-wide text-foreground dark:text-white">
                      {cat.name}
                    </h2>
                    {isBowlBuilder && (
                      <span className="text-xs bg-brand text-white px-2 py-0.5 rounded-full font-semibold">
                        Personalizable
                      </span>
                    )}
                  </div>

                  {/* Bowl Builder section */}
                  {isBowlBuilder && (
                    <div className="rounded-2xl border bg-card p-4 md:p-6 mt-4">
                      <Suspense fallback={<Skeleton className="h-[520px] rounded-xl" />}>
                        <BowlBuilder />
                      </Suspense>
                    </div>
                  )}

                  {/* Product rows */}
                  {!isBowlBuilder && (
                    <div>
                      {isLoading
                        ? [1, 2, 3].map((i) => <ProductRowSkeleton key={i} />)
                        : products.map((p) => <ProductRow key={p.id} product={p} />)
                      }
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
