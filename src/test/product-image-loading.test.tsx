import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProductImage from '@/components/products/ProductImage';
import type { Product } from '@/types';

describe('ProductImage loading', () => {
  let intersectionCallback: IntersectionObserverCallback;
  const observe = vi.fn();
  const disconnect = vi.fn();

  beforeEach(() => {
    observe.mockClear();
    disconnect.mockClear();

    class IntersectionObserverMock {
      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback;
      }

      observe = observe;
      disconnect = disconnect;
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = '600px 0px';
      thresholds = [0];
    }

    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  });

  it('waits until the product card approaches the viewport before requesting its image', () => {
    const product: Product = {
      id: 'test-product',
      name: 'Producto de prueba',
      description: 'Descripción',
      price: 10000,
      brand: 'ohana',
      categoryId: 'test-category',
      imageUrl: 'https://cdn.example.com/product.jpg',
    };

    render(<ProductImage product={product} />);

    expect(observe).toHaveBeenCalledOnce();
    expect(screen.queryByRole('img', { name: product.name })).not.toBeInTheDocument();

    act(() => {
      intersectionCallback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    expect(screen.getByRole('img', { name: product.name })).toHaveAttribute('src', product.imageUrl);
  });
});
