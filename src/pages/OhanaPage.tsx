import {
  Suspense,
  lazy,
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  Clock,
  MapPin,
  Plus,
  Check,
  Search,
  X,
  SlidersHorizontal,
  Leaf,
  MoveUpRight,
} from "lucide-react";
import { useExperienceMotion } from "@/hooks/use-experience-motion";
import SEOHead from "@/components/SEOHead";
import { Skeleton } from "@/components/ui/skeleton";
import ProductImage from "@/components/products/ProductImage";
import ProductDrawer, {
  type ProductConfig,
} from "@/components/products/ProductDrawer";
import ExperienceHero from "@/components/ohana/ExperienceHero";
import {
  buildBusinessWhatsAppUrl,
  formatCompactHours,
  isBusinessOpenNow,
} from "@/domain/businessSettings";
import {
  calculateProductUnitPrice,
  isProductCustomizable,
  normalizeProductCustomization,
} from "@/domain/productCustomizations";
import { formatPrice } from "@/domain/formatPrice";
import {
  useBusinessSettings,
  useProducts,
  useCategories,
} from "@/hooks/use-catalog";
import { useCart } from "@/context/CartContext";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Product, Category } from "@/types";
const BowlBuilder = lazy(() => import("@/components/ohana/BowlBuilder"));
const PromotionsSection = lazy(
  () => import("@/components/ohana/PromotionsSection"),
);
const EMPTY_PRODUCTS: Product[] = [];
const EMPTY_CATEGORIES: Category[] = [];
const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function ProductRow({
  product,
  category,
}: {
  product: Product;
  category?: Category;
}) {
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(resetTimer.current), []);
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
      type: "add_to_cart",
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      priceCents: product.price,
    });
    toast.success(`${product.name} agregado`);
    setAdded(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setAdded(false), 1200);
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
      type: "add_to_cart",
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      priceCents: unitPrice,
    });
    toast.success(`${product.name} agregado`, {
      description: formatPrice(unitPrice),
    });
    setAdded(true);
    clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setAdded(false), 1200);
  };

  return (
    <>
      <article className="experience-product group">
        {/* Left: text */}
        <div className="experience-product-copy">
          <p className="experience-product-name">{product.name}</p>
          {product.description?.trim() && (
            <p className="experience-product-description">
              {product.description.trim()}
            </p>
          )}
          <p className="experience-product-price">
            {formatPrice(product.price)}
          </p>
        </div>

        {/* Right: image with add button */}
        <div className="experience-product-image">
          <ProductImage
            product={product}
            ratio={4 / 3}
            imageClassName="group-hover:scale-105"
            className="rounded-none"
            fallbackClassName="rounded-2xl bg-gradient-to-br from-brand/30 to-brand-dark/50"
          />

          {/* Floating add button */}
          <button
            onClick={handleAddClick}
            className={cn("experience-product-add", added && "is-added")}
            aria-label={`Agregar ${product.name} al carrito`}
          >
            {added ? <Check size={19} /> : <Plus size={19} />}
          </button>
        </div>
      </article>

      {drawerOpen && (
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
export default function OhanaPage() {
  const location = useLocation();
  const handledNavigation = useRef<string>();
  const pageRef = useRef<HTMLDivElement>(null);
  useExperienceMotion(pageRef);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [compact, setCompact] = useState(false);
  const {
    data: categories = EMPTY_CATEGORIES,
    error: categoryError,
    refetch: retryCategories,
  } = useCategories("ohana");
  const {
    data: products = EMPTY_PRODUCTS,
    isLoading,
    error: productError,
    refetch: retryProducts,
  } = useProducts({ brandId: "ohana" });
  const { data: settings } = useBusinessSettings();
  const menuCategories = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.id !== "ohana-arma-tu-bowl" &&
          products.some((product) => product.categoryId === category.id),
      ),
    [categories, products],
  );
  const filtered = useMemo(
    () =>
      products
        .filter((product) => {
          if (product.categoryId === "ohana-arma-tu-bowl") return false;
          const category = categories.find(
            (item) => item.id === product.categoryId,
          );
          return (
            (selectedCategory === "all" ||
              product.categoryId === selectedCategory) &&
            normalizeSearch(
              `${product.name} ${product.description ?? ""} ${category?.name ?? ""}`,
            ).includes(normalizeSearch(search.trim()))
          );
        })
        .sort(
          (a, b) =>
            categories.findIndex((c) => c.id === a.categoryId) -
            categories.findIndex((c) => c.id === b.categoryId),
        ),
    [products, categories, selectedCategory, search],
  );
  const scrollTo = useCallback((id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
  }, []);
  useEffect(() => {
    const hash = location.hash.slice(1);
    if (!hash || handledNavigation.current === location.key) return;
    const category = menuCategories.find((item) => item.slug === hash);
    if (!category && hash !== 'menu' && hash !== 'arma-tu-bowl') return;
    const timer = window.setTimeout(() => {
      if (category) {
        setSelectedCategory(category.id);
        setSearch('');
      }
      scrollTo(category ? 'menu' : hash);
      handledNavigation.current = location.key;
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.key, menuCategories, scrollTo]);
  const hours = formatCompactHours({
    hoursWeekday: settings?.hoursWeekday ?? null,
    hoursWeekend: settings?.hoursWeekend ?? null,
  });
  const open = isBusinessOpenNow({
    hoursWeekday: settings?.hoursWeekday ?? null,
    hoursWeekend: settings?.hoursWeekend ?? null,
  });
  const whatsapp = buildBusinessWhatsAppUrl(settings?.whatsappNumber);

  return (
    <div ref={pageRef} className="experience-home">
      <SEOHead
        title="Ohana Bowls — A tu gusto"
        description="Tu mezcla, tu antojo, tu momento. Arma tu bowl o encuentra tu próximo favorito en Ohana Bowls, Manizales."
        path="/"
      />
      <ExperienceHero
        onBuild={() => scrollTo("arma-tu-bowl")}
        onExplore={() => scrollTo("menu")}
      />
      <div className="experience-store-info">
        <span className="store-info-brand">
          NOS VEMOS EN OHANA <span aria-hidden="true">↗</span>
        </span>
        {settings?.contactAddress && (
          <span>
            <MapPin size={15} />
            {settings.contactAddress}
          </span>
        )}
        {hours && (
          <span>
            <Clock size={15} />
            {hours}
          </span>
        )}
        {open !== null && (
          <span className="store-status">
            <i className={open ? "is-open" : ""} />
            {open ? "Estamos abiertos" : "Ahora estamos cerrados"}
          </span>
        )}
      </div>
      <Suspense fallback={null}>
        <PromotionsSection />
      </Suspense>

      <section
        id="menu"
        className="experience-menu experience-section"
        aria-labelledby="menu-title"
      >
        <div className="experience-section-heading">
          <div>
            <p className="experience-eyebrow">ANTOJOS CON PERSONALIDAD</p>
            <h2 id="menu-title">
              Encuentra tu
              <br />
              <em>nuevo favorito.</em>
            </h2>
          </div>
          <p>
            Para los que saben lo que quieren.
            <br />Y los que quieren probarlo todo.
          </p>
        </div>
        <div className="experience-menu-tools">
          <label className="experience-search">
            <Search size={19} />
            <span className="sr-only">Buscar en el menú</span>
            <input
              aria-label="Buscar en el menú"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="¿Qué se te antoja hoy?"
              type="search"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Limpiar búsqueda"
              >
                <X size={17} />
              </button>
            )}
          </label>
          <button
            className="experience-view-toggle"
            aria-label={compact ? "Ver fotos grandes" : "Vista compacta"}
            onClick={() => setCompact((value) => !value)}
            aria-pressed={compact}
          >
            <SlidersHorizontal size={17} />
            <span>{compact ? "Ver fotos grandes" : "Vista compacta"}</span>
          </button>
        </div>
        <div
          className="experience-category-tabs"
          aria-label="Categorías del menú"
        >
          <button
            aria-pressed={selectedCategory === "all"}
            onClick={() => setSelectedCategory("all")}
          >
            Todo el menú{" "}
            <span>
              {
                products.filter((p) => p.categoryId !== "ohana-arma-tu-bowl")
                  .length
              }
            </span>
          </button>
          {menuCategories.map((category) => (
            <button
              key={category.id}
              aria-pressed={selectedCategory === category.id}
              onClick={() => setSelectedCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
        {productError || categoryError ? (
          <div className="experience-empty" role="alert">
            <h3>El menú está tardando en llegar.</h3>
            <p>Vuelve a intentarlo para ver los productos disponibles.</p>
            <button
              className="experience-button"
              onClick={() => {
                void retryProducts();
                void retryCategories();
              }}
            >
              Reintentar <ArrowUpRight size={18} />
            </button>
          </div>
        ) : isLoading ? (
          <div className="experience-product-grid" aria-label="Cargando menú">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <Skeleton className="h-80 rounded-3xl" key={n} />
            ))}
          </div>
        ) : filtered.length ? (
          <>
            <p className="experience-result-count" role="status">
              {filtered.length} opciones para disfrutar
              {search ? ` · “${search}”` : ""}
            </p>
            <div
              className={cn("experience-product-grid", compact && "is-compact")}
            >
              {filtered.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  category={categories.find(
                    (category) => category.id === product.categoryId,
                  )}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="experience-empty" role="status">
            <Search size={30} />
            <h3>
              {search || selectedCategory !== "all"
                ? "Probemos con otro antojo."
                : "Pronto habrá nuevos antojos."}
            </h3>
            <p>
              {search || selectedCategory !== "all"
                ? "No encontramos productos con estos filtros."
                : "El menú no tiene productos disponibles en este momento."}
            </p>
            {(search || selectedCategory !== "all") && (
              <button
                className="experience-button"
                onClick={() => {
                  setSearch("");
                  setSelectedCategory("all");
                }}
              >
                Ver todo el menú <ArrowUpRight size={18} />
              </button>
            )}
          </div>
        )}
      </section>

      <section
        id="arma-tu-bowl"
        className="experience-builder experience-section"
        aria-labelledby="builder-title"
      >
        <div className="experience-section-heading">
          <div>
            <p className="experience-eyebrow">
              <Leaf size={16} />
              TU BOWL, TUS REGLAS
            </p>
            <h2 id="builder-title">
              Aquí el chef
              <br />
              <em>eres tú.</em>
            </h2>
          </div>
          <p>
            Elige el tamaño, mezcla tus ingredientes
            <br />y termina con tu salsa favorita.
          </p>
        </div>
        <div className="experience-builder-steps" aria-hidden="true">
          <span>01 / Elige tu tamaño</span>
          <span>02 / Haz tu mezcla</span>
          <span>
            03 / Dale tu toque <MoveUpRight size={18} />
          </span>
        </div>
        <div className="experience-builder-surface">
          <Suspense fallback={<Skeleton className="h-[520px] rounded-3xl" />}>
            <BowlBuilder />
          </Suspense>
        </div>
      </section>

      <section className="experience-story experience-section">
        <span className="story-flower" aria-hidden="true">
          ✳
        </span>
        <div>
          <p className="experience-eyebrow">
            COMER RICO SE DISFRUTA MÁS EN FAMILIA
          </p>
          <h2>
            Más que un bowl.
            <br />
            Un momento <em>Ohana.</em>
          </h2>
          <p>
            Una pausa para ti. Una mesa para compartir. Y todas esas mezclas que
            hacen que quieras volver.
          </p>
          <Link className="experience-text-link" to="/nosotros">
            Conoce nuestra historia <ArrowUpRight size={19} />
          </Link>
        </div>
        {whatsapp && (
          <a
            className="experience-story-contact"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ArrowUpRight size={32} />
            <span>
              ¿Te ayudamos
              <br />a elegir?
            </span>
            <small>Hablemos por WhatsApp</small>
          </a>
        )}
      </section>
    </div>
  );
}
