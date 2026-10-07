import MenuProductCard from '@/components/products/MenuProductCard';
import type { Product } from '@/types';

interface ProductCardProps {
  product: Product;
  variant?: 'default' | 'compact';
  categoryName?: string;
}

export default function ProductCard({ product, variant = 'default', categoryName }: ProductCardProps) {
  return <MenuProductCard product={product} categoryName={categoryName} compact={variant === 'compact'} />;
}
