import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTopProducts } from '@/hooks/use-catalog';
import { useCart } from '@/context/CartContext';
import { formatPrice } from '@/domain/formatPrice';
import type { Product } from '@/types';

function ProductCard({ product }: { product: Product }) {
  const { addProduct } = useCart();
  const [imgError, setImgError] = useState(false);

  return (
    <div className="snap-start shrink-0 w-36 md:w-auto">
      {product.imageUrl && !imgError ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-24 object-cover rounded-lg"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-24 bg-brand/20 rounded-lg" />
      )}
      <p className="text-xs font-semibold text-foreground mt-2 line-clamp-2">{product.name}</p>
      <p className="text-xs text-brand font-bold">{formatPrice(product.price)}</p>
      <button
        type="button"
        onClick={() => addProduct(product)}
        className="w-full mt-2 text-xs py-1.5 rounded-lg bg-brand text-white hover:bg-brand/90 transition-colors"
      >
        + Agregar
      </button>
    </div>
  );
}

export default function UpsellSection() {
  const { data: products = [], isLoading } = useTopProducts(4);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="snap-start shrink-0 w-36 md:w-auto space-y-2">
            <Skeleton className="w-full h-24 rounded-lg" />
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-7 w-full rounded-lg" />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div>
      <h2 className="text-xl font-bold text-foreground">⭐ Los más pedidos</h2>
      <p className="text-sm text-muted-foreground mb-4">Añádelos a tu pedido con un click</p>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory md:grid md:grid-cols-4 md:overflow-visible">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
