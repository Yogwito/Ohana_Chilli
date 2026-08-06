import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildProductImageStoragePath,
  getOptimizedImageDimensions,
  optimizeProductImage,
} from '@/domain/productImageUpload';

describe('product image upload optimization', () => {
  afterEach(() => vi.restoreAllMocks());

  it('constrains the longest edge without upscaling', () => {
    expect(getOptimizedImageDimensions(1600, 800)).toEqual({ width: 768, height: 384 });
    expect(getOptimizedImageDimensions(320, 480)).toEqual({ width: 320, height: 480 });
  });

  it('creates a uniquely versioned WebP storage path', () => {
    expect(buildProductImageStoragePath('Product ID', 1234)).toBe('optimized/product-id-1234.webp');
  });

  it('draws the resized bitmap and returns a WebP file', async () => {
    const close = vi.fn();
    vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1600, height: 800, close }));
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => {
      callback(new Blob(['optimized'], { type: 'image/webp' }));
    });

    const result = await optimizeProductImage(new File(['original'], 'Producto.png', { type: 'image/png' }));

    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 768, 384);
    expect(result.name).toBe('Producto.webp');
    expect(result.type).toBe('image/webp');
    expect(close).toHaveBeenCalledOnce();
  });
});
