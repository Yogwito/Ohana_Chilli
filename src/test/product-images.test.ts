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
});
