import { describe, expect, it } from 'vitest';
import { resolveProductImageUrl } from '@/domain/productImages';

describe('product image resolution', () => {
  it('rejects legacy bare filenames that do not exist in the public app', () => {
    expect(resolveProductImageUrl({
      id: 'chilli-burger-classic',
      imageUrl: 'burger-clasica.jpg',
    })).toBeUndefined();
  });

  it('keeps valid root-relative and remote urls', () => {
    expect(resolveProductImageUrl({
      id: 'ohana-bowl-teriyaki',
      imageUrl: '/products/teriyaki.jpg',
    })).toBe('/products/teriyaki.jpg');

    expect(resolveProductImageUrl({
      id: 'ohana-bowl-paisa',
      imageUrl: 'https://cdn.example.com/paisa.jpg',
    })).toBe('https://cdn.example.com/paisa.jpg');
  });

  it('suppresses the known incorrect veggie burger mapping', () => {
    expect(resolveProductImageUrl({
      id: 'chilli-burger-veggie',
      imageUrl: 'https://cdn.example.com/wrong-burger.jpg',
    })).toBeUndefined();
  });

  it('suppresses catalog stock-photo placeholders', () => {
    const placeholderIds = [
      'be1fa199-5029-433f-7ccf-8fce38116665',
      '1232c37b-9b66-78d2-43af-285c23ddcd7b',
      '446beb63-71b7-7242-3797-db75472451d9',
      'edfc2bdb-d986-d364-5080-a7868f942bf4',
      '2422e354-e353-b8ca-626d-a97d577ca8cc',
    ];

    for (const id of placeholderIds) {
      expect(resolveProductImageUrl({
        id,
        imageUrl: 'https://images.unsplash.com/placeholder?w=400&q=80',
      })).toBeUndefined();
    }
  });

  it('uses optimized local WebP overrides instead of external placeholders', () => {
    expect(resolveProductImageUrl({
      id: '12135ae7-32db-9903-7179-f48581e8b8cc',
      imageUrl: 'https://images.unsplash.com/placeholder?w=400&q=80',
    })).toBe('/images/adicionales/02_queso_frito.webp');
  });
});
