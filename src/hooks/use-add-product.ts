import { useState } from 'react';
import { toast } from 'sonner';
import { useCart } from '@/context/CartContext';
import { trackEvent } from '@/lib/analytics';
import { formatPrice } from '@/domain/formatPrice';
import {
  calculateProductUnitPrice,
  isProductCustomizable,
  normalizeProductCustomization,
} from '@/domain/productCustomizations';
import type { ProductConfig } from '@/components/products/ProductDrawer';
import type { Product } from '@/types';

/**
 * Shared add-to-cart flow: customizable products open the ProductDrawer,
 * the rest are added directly. Handles tracking, toast and the "added" flash.
 *
 * `productForCustomization` lets callers pass a product enriched with
 * category info, which `isProductCustomizable` needs to decide.
 */
export function useAddProduct(product: Product, productForCustomization: Product = product) {
  const { addProduct } = useCart();
  const [added, setAdded] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const flashAdded = () => {
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

  const handleAddClick = () => {
    if (isProductCustomizable(productForCustomization)) {
      setDrawerOpen(true);
      return;
    }

    addProduct(product);
    trackEvent({
      type: 'add_to_cart',
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      priceCents: product.price,
    });
    toast.success(`${product.name} agregado`, { description: formatPrice(product.price) });
    flashAdded();
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
    toast.success(`${product.name} agregado`, { description: formatPrice(unitPrice) });
    flashAdded();
  };

  return { added, drawerOpen, setDrawerOpen, handleAddClick, handleDrawerConfirm };
}
