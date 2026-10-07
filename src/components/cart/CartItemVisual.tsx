import ProductImage from '@/components/products/ProductImage';
import BrandIllustration from '@/components/ohana/BrandIllustration';
import type { CartItem } from '@/types';

export default function CartItemVisual({ item }: { item: CartItem }) {
  return <div className="cart-item-visual">
    {item.type === 'product' && item.product
      ? <ProductImage product={item.product} ratio={1} sizes="72px" imageClassName="object-contain" />
      : <BrandIllustration kind="bowl" />}
  </div>;
}
