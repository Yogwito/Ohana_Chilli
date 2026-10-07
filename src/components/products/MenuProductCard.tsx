import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Check, Plus } from 'lucide-react';
import ProductImage from '@/components/products/ProductImage';
import ProductDrawer, { type ProductConfig } from '@/components/products/ProductDrawer';
import { calculateProductUnitPrice, isProductCustomizable, normalizeProductCustomization } from '@/domain/productCustomizations';
import { formatPrice } from '@/domain/formatPrice';
import { useCart } from '@/context/CartContext';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Product, Category } from '@/types';

function getCategoryTone(id: string) {
  if (id.includes('bowls')) return 'mint';
  if (id.includes('burgers') || id.includes('hot-dogs')) return 'melon';
  return 'orchid';
}

export default function MenuProductCard({
  product,
  category,
  categoryName,
  compact = false,
  featured = false,
}: {
  product: Product;
  category?: Category;
  categoryName?: string;
  compact?: boolean;
  featured?: boolean;
}) {
  const resetTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(resetTimer.current), []);
  const { addProduct } = useCart();
  const [added, setAdded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const detailsTriggerRef = useRef<HTMLButtonElement | null>(null);
  const openDetails = (event: React.MouseEvent<HTMLButtonElement>) => {
    detailsTriggerRef.current = event.currentTarget;
    setDrawerOpen(true);
  };
  const closeDetails = () => {
    setDrawerOpen(false);
    requestAnimationFrame(() => detailsTriggerRef.current?.focus());
  };

  const productWithCategory = useMemo(
    () => ({
      ...product,
      categorySlug: category?.slug,
      categoryName: category?.name ?? categoryName,
      category,
    }),
    [category, categoryName, product],
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

  const handleAddClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();

    if (isProductCustomizable(productWithCategory)) {
      openDetails(e);
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
      <article className={cn("experience-product group", compact && "experience-product-compact")} data-category-tone={getCategoryTone(product.categoryId)}>
        {/* Recipe and ordering information */}
        <div className="experience-product-copy">
          {(category?.name || categoryName) && <p className="menu-category-label">{category?.name ?? categoryName}</p>}
          <h3 className="experience-product-name">
            <button type="button" onClick={openDetails} className="text-left" aria-label={`Ver detalles de ${product.name}`}>
              {product.name}
            </button>
          </h3>
          {product.description?.trim() && (
            <p className="experience-product-description">
              {product.description.trim()}
            </p>
          )}
          {product.description?.trim() && <button type="button" className="menu-recipe-link" onClick={openDetails}>Ver ingredientes <ArrowUpRight size={14} aria-hidden="true" /></button>}
          <p className="experience-product-price">
            {formatPrice(product.price)}
          </p>
        </div>

        {/* Right: image with add button */}
        <div className="experience-product-image">
          <ProductImage
            product={product}
            ratio={4 / 3}
            sizes={featured
              ? '(max-width: 767px) 82vw, (max-width: 1023px) 45vw, 440px'
              : '(max-width: 379px) calc(100vw - 32px), (max-width: 767px) calc((100vw - 60px) / 2), (max-width: 1023px) 45vw, 440px'}
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
            <span className="sr-only" role="status">{added ? `${product.name} agregado` : ""}</span>
          </button>
        </div>
      </article>

      {drawerOpen && (
        <ProductDrawer
          product={product}
          open={drawerOpen}
          onClose={closeDetails}
          onConfirm={handleDrawerConfirm}
        />
      )}
    </>
  );
}
