import { useEffect, useMemo, useRef, useState } from 'react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { PRODUCT_IMAGE_PLACEHOLDER_SRC, getProductImageFallbackInitial, resolveProductImageUrl } from '@/domain/productImages';
import { cn } from '@/lib/utils';
import type { Product } from '@/types';

interface ProductImageProps {
  product: Product;
  ratio?: number;
  className?: string;
  imageClassName?: string;
  fallbackClassName?: string;
}

function ProductImageContent({
  product,
  className,
  imageClassName,
  fallbackClassName,
}: Omit<ProductImageProps, 'ratio'>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [loadableImageUrl, setLoadableImageUrl] = useState<string | null>(null);

  const resolvedImageUrl = useMemo(() => resolveProductImageUrl(product), [product]);
  const showImage = Boolean(resolvedImageUrl && !hasError);
  const shouldLoadImage = Boolean(resolvedImageUrl && loadableImageUrl === resolvedImageUrl);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [resolvedImageUrl]);

  useEffect(() => {
    setLoadableImageUrl(null);
    if (!resolvedImageUrl) return;

    const container = containerRef.current;
    if (!container || typeof IntersectionObserver === 'undefined') {
      setLoadableImageUrl(resolvedImageUrl);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setLoadableImageUrl(resolvedImageUrl);
        observer.disconnect();
      },
      { rootMargin: '600px 0px' },
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, [resolvedImageUrl]);

  return (
    <div ref={containerRef} className={cn('relative h-full w-full overflow-hidden bg-brand-muted', className)}>
      {showImage ? (
        <>
          {!isLoaded ? <Skeleton className="absolute inset-0 rounded-none" /> : null}
          {shouldLoadImage ? (
            <img
              src={resolvedImageUrl}
              alt={product.name}
              loading="lazy"
              decoding="async"
              onLoad={() => setIsLoaded(true)}
              onError={() => {
                setHasError(true);
                setIsLoaded(false);
              }}
              className={cn(
                'h-full w-full object-cover transition-all duration-300',
                isLoaded ? 'opacity-100 group-hover:scale-105' : 'opacity-0',
                imageClassName,
              )}
            />
          ) : null}
        </>
      ) : (
        <div className={cn('relative flex h-full w-full items-center justify-center bg-brand/10', fallbackClassName)}>
          <img
            src={PRODUCT_IMAGE_PLACEHOLDER_SRC}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-35"
          />
          <span className="relative text-3xl font-black text-brand/40 select-none">
            {getProductImageFallbackInitial(product)}
          </span>
        </div>
      )}
    </div>
  );
}

export default function ProductImage({
  product,
  ratio = 4 / 3,
  className,
  imageClassName,
  fallbackClassName,
}: ProductImageProps) {
  return (
    <AspectRatio ratio={ratio}>
      <ProductImageContent
        product={product}
        className={className}
        imageClassName={imageClassName}
        fallbackClassName={fallbackClassName}
      />
    </AspectRatio>
  );
}
