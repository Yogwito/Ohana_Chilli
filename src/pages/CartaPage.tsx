import { useState, useMemo } from 'react';
import { Search, Leaf, Coffee, MapPin, Phone, Clock, Instagram, MessageCircle, ChevronDown, Star, Plus } from 'lucide-react';
import { useProducts, useCategories, useBowlRules, useIngredients, useBeverages, useBeverageCategories } from '@/hooks/use-catalog';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/domain/formatPrice';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import SEOHead from '@/components/SEOHead';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { trackEvent } from '@/lib/analytics';
import type { Product, Ingredient, BowlSizeRule } from '@/types';

/* ─── helpers ─── */

/* ─── mini product card for the carta ─── */
function MenuItemCard({ product, categoryName }: { product: Product; categoryName?: string }) {
  const { addProduct } = useCart();

  const handleAdd = () => {
    addProduct(product);
    trackEvent({ type: 'add_to_cart', productId: product.id, productName: product.name, brand: product.brand, priceCents: product.price });
    toast.success(`${product.name} agregado`, { description: formatPrice(product.price) });
  };

  return (
    <article className="group relative flex flex-col rounded-2xl border bg-card p-4 gap-2 transition-all duration-200 hover:shadow-lg border-ohana/10 hover:border-ohana/30">
      {/* top accent line */}
      <div className="absolute top-0 left-4 right-4 h-0.5 rounded-b-full bg-gradient-to-r from-ohana/60 to-ohana-dark/60" />

      {/* name + price */}
      <div className="flex items-start justify-between gap-3">
        <h4 className="font-semibold text-sm sm:text-base leading-tight">{product.name}</h4>
        <span className="shrink-0 font-bold tabular-nums text-sm sm:text-base whitespace-nowrap text-ohana-dark">
          {formatPrice(product.price)}
        </span>
      </div>

      {/* description */}
      {product.description && (
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">{product.description}</p>
      )}

      {/* badges */}
      <div className="flex flex-wrap items-center gap-1.5 mt-auto pt-1">
        {product.isPopular && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-accent/15 text-accent-foreground border border-accent/30">
            <Star className="w-2.5 h-2.5 fill-accent text-accent" /> Popular
          </span>
        )}
        {product.isNew && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-primary/10 text-primary border border-primary/30">
            Nuevo
          </span>
        )}
        {product.isVegan && (
          <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-ohana/10 text-ohana-dark border border-ohana/25">
            <Leaf className="w-2.5 h-2.5" /> Veggie
          </span>
        )}
      </div>

      {/* add button */}
      <Button
        onClick={handleAdd}
        size="sm"
        className="w-full mt-1 rounded-xl font-medium min-h-[40px] active:scale-[0.97] transition-all bg-ohana text-ohana-foreground hover:bg-ohana-dark shadow-sm shadow-ohana/20"
      >
        <Plus className="h-4 w-4 mr-1" /> Agregar
      </Button>
    </article>
  );
}

/* ─── bowl builder info card ─── */
function BowlBuilderSection({ rules, ingredients }: { rules: BowlSizeRule[]; ingredients: Ingredient[] }) {
  const [expanded, setExpanded] = useState(false);
  const sizes = useMemo(() => [...rules].sort((a, b) => a.price - b.price), [rules]);

  const grouped = useMemo(() => {
    const groups: Record<string, Ingredient[]> = {};
    for (const ing of ingredients) {
      const key = ing.type;
      if (!groups[key]) groups[key] = [];
      groups[key].push(ing);
    }
    return groups;
  }, [ingredients]);

  const typeLabels: Record<string, string> = {
    base: '🍚 Bases',
    protein: '🥩 Proteínas',
    acompanante: '🥗 Acompañantes',
    sauce: '🫙 Salsas',
    topping: '✨ Complementos',
  };

  return (
    <div className="rounded-2xl border border-ohana/20 bg-gradient-to-br from-ohana-light/30 to-card p-5 sm:p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-ohana/15 flex items-center justify-center">
          <Leaf className="w-5 h-5 text-ohana-dark" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-ohana-dark">Arma tu Bowl</h3>
          <p className="text-xs text-muted-foreground">Personaliza tu bowl con tus ingredientes favoritos</p>
        </div>
      </div>

      {/* Sizes grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {sizes.map((s) => (
          <div key={s.size} className="rounded-xl border border-ohana/15 bg-card p-4 text-center space-y-1">
            <p className="font-bold text-base text-ohana-dark">{s.name}</p>
            <p className="text-xl font-black text-foreground">{formatPrice(s.price)}</p>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {s.maxBases} base · {s.maxProteins} prot · {s.maxAcompanantes} acomp
            </p>
          </div>
        ))}
      </div>

      {/* Expandable ingredients */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-ohana-dark hover:text-ohana transition-colors"
      >
        <ChevronDown className={cn('w-4 h-4 transition-transform', expanded && 'rotate-180')} />
        {expanded ? 'Ocultar ingredientes' : 'Ver todos los ingredientes'}
      </button>

      {expanded && (
        <div className="space-y-4 animate-fade-in">
          {Object.entries(typeLabels).map(([type, label]) => {
            const items = grouped[type];
            if (!items || items.length === 0) return null;
            return (
              <div key={type}>
                <h4 className="text-sm font-semibold mb-2">{label}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((ing) => (
                    <span
                      key={ing.id}
                      className="text-xs px-2.5 py-1 rounded-full bg-ohana/8 text-foreground border border-ohana/15"
                    >
                      {ing.name}
                      {ing.price ? ` (+${formatPrice(ing.price)})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── category section ─── */
function CategorySection({ name, products }: { name: string; products: Product[] }) {
  return (
    <section className="space-y-3">
      <h3 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2 text-ohana-dark">
        <span className="w-1 h-6 rounded-full bg-ohana" />
        {name}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map((p) => (
          <MenuItemCard key={p.id} product={p} categoryName={name} />
        ))}
      </div>
    </section>
  );
}

/* ─── skeleton ─── */
function MenuSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/* ─── main page ─── */
export default function CartaPage() {
  const [searchTerm, setSearchTerm] = useState('');

  // Data
  const { data: ohanaProducts = [], isLoading: loadingOhana } = useProducts({ brandId: 'ohana' });
  const { data: ohanaCategories = [] } = useCategories('ohana');
  const { data: bowlRules = [] } = useBowlRules();
  const { data: ingredients = [] } = useIngredients();
  const { data: beverages = [], isLoading: loadingBeverages } = useBeverages();
  const { data: beverageCategories = [] } = useBeverageCategories();

  const isLoading = loadingOhana;
  const allProducts = ohanaProducts;
  const categories = ohanaCategories;

  // Filter by search
  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return allProducts;
    const q = searchTerm.toLowerCase();
    return allProducts.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      (p.ingredients?.some((i) => i.toLowerCase().includes(q)) ?? false)
    );
  }, [allProducts, searchTerm]);

  // Group by category
  const categoryNameById = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.id] = c.name;
    return map;
  }, [categories]);

  const groupedProducts = useMemo(() => {
    const groups: { catId: string; name: string; products: Product[] }[] = [];
    const catOrder = categories.map((c) => c.id);
    const byCategory: Record<string, Product[]> = {};

    for (const p of filtered) {
      if (!byCategory[p.categoryId]) byCategory[p.categoryId] = [];
      byCategory[p.categoryId].push(p);
    }

    for (const catId of catOrder) {
      if (byCategory[catId] && byCategory[catId].length > 0) {
        groups.push({ catId, name: categoryNameById[catId] || catId, products: byCategory[catId] });
      }
    }
    // Catch any uncategorized
    for (const [catId, prods] of Object.entries(byCategory)) {
      if (!catOrder.includes(catId) && prods.length > 0) {
        groups.push({ catId, name: categoryNameById[catId] || 'Otros', products: prods });
      }
    }
    return groups;
  }, [filtered, categories, categoryNameById]);

  // Beverages grouped
  const bevCategoryNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of beverageCategories) m[c.id] = c.name;
    return m;
  }, [beverageCategories]);

  const filteredBeverages = useMemo(() => {
    if (!searchTerm.trim()) return beverages;
    const q = searchTerm.toLowerCase();
    return beverages.filter((b) => b.name.toLowerCase().includes(q));
  }, [beverages, searchTerm]);

  const showBowlBuilder = bowlRules.length > 0 && ingredients.length > 0;

  return (
    <>
      <SEOHead
        title="Carta — Ohana Bowls"
        description="Menú completo de Ohana Bowls. Bowls personalizados y bebidas. Pide por WhatsApp."
      />

      {/* ─── hero ─── */}
      <section className="relative overflow-hidden bg-ohana-gradient border-b border-ohana/15">
        <div className="container py-10 sm:py-14">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-2">Nuestra carta</p>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-foreground mb-3">
              Menú Completo
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Explora bowls saludables y personalizables, y mucho más.
            </p>
          </div>
        </div>
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-ohana/5 blur-3xl" />
      </section>

      <div className="container py-6 sm:py-8 space-y-6">
        {/* ─── search ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar en el menú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-card text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition"
            />
          </div>
        </div>

        {/* ─── bowl builder (ohana only) ─── */}
        {showBowlBuilder && !searchTerm && (
          <BowlBuilderSection rules={bowlRules} ingredients={ingredients} />
        )}

        {/* ─── product categories ─── */}
        {isLoading ? (
          <MenuSkeleton />
        ) : groupedProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchTerm ? `No se encontraron resultados para "${searchTerm}"` : 'No hay productos disponibles'}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedProducts.map((group) => (
              <CategorySection
                key={group.catId}
                name={group.name}
                products={group.products}
              />
            ))}
          </div>
        )}

        {/* ─── beverages ─── */}
        {!searchTerm || filteredBeverages.length > 0 ? (
          <section className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Coffee className="w-5 h-5 text-primary" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Bebidas</h2>
            </div>

            {loadingBeverages ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-2xl" />
                ))}
              </div>
            ) : filteredBeverages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay bebidas disponibles.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filteredBeverages.map((b) => (
                  <BeverageCard key={b.id} product={b} categoryName={bevCategoryNameById[b.categoryId]} />
                ))}
              </div>
            )}
          </section>
        ) : null}

        {/* ─── WhatsApp CTA ─── */}
        <section className="rounded-2xl bg-gradient-to-r from-ohana/10 via-background to-brand-muted border border-border p-6 sm:p-8 text-center space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold">¿Listo para pedir?</h2>
          <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
            Arma tu pedido y envíalo por WhatsApp. También puedes visitarnos en el local.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-xl bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold min-h-[48px] px-6"
            >
              <a href="/checkout">
                <MessageCircle className="w-5 h-5 mr-2" />
                Pedir por WhatsApp
              </a>
            </Button>
          </div>
        </section>

        {/* ─── contact footer ─── */}
        <section className="rounded-2xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-lg font-bold mb-4">Encuéntranos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <Phone className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-foreground">WhatsApp</p>
                <p>+57 300 000 0000</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-foreground">Dirección</p>
                <p>Calle 00 #00-00, Ciudad</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-foreground">Horarios</p>
                <p>Lun–Vie: 11:00–21:00</p>
                <p>Sáb–Dom: 11:00–21:00</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Instagram className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-foreground">Redes</p>
                <a href="#" className="hover:text-foreground transition-colors">@bowlsohana</a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

/* ─── small beverage card ─── */
function BeverageCard({ product, categoryName }: { product: Product; categoryName?: string }) {
  const { addProduct } = useCart();

  const handleAdd = () => {
    addProduct(product);
    toast.success(`${product.name} agregado`, { description: formatPrice(product.price) });
  };

  return (
    <div className="flex flex-col rounded-xl border border-border bg-card p-3 gap-2 hover:shadow-md transition-shadow">
      <h4 className="text-sm font-medium leading-tight">{product.name}</h4>
      <p className="text-xs text-muted-foreground line-clamp-1">{product.description}</p>
      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="font-bold text-sm tabular-nums">{formatPrice(product.price)}</span>
        <button
          onClick={handleAdd}
          className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-90"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
