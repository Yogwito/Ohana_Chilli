import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getAdditionalIngredientImageUrl, resolveProductImageUrl } from '@/domain/productImages';
import { MENU_IMAGE_OVERRIDES } from '@/domain/menuImages';

describe('product image resolution', () => {
  it('uses the curated menu image instead of the old stock photo', () => {
    expect(resolveProductImageUrl({
      id: '446beb63-71b7-7242-3797-db75472451d9',
      imageUrl: 'https://images.unsplash.com/old-stock-photo.jpg',
    })).toBe('/images/menu/burgers-veggie.webp');
  });

  it('ships valid distinct menu photos and official beverage assets', () => {
    const paths = Object.values(MENU_IMAGE_OVERRIDES);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) {
      const file = resolve(process.cwd(), 'public', path.slice(1));
      expect(existsSync(file), path).toBe(true);
      const data = readFileSync(file);
      if (path.endsWith('.png')) {
        expect(Array.from(data.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
        continue;
      }
      expect(data.toString('ascii', 0, 4)).toBe('RIFF');
      expect(data.toString('ascii', 8, 12)).toBe('WEBP');
      const mobileFile = file.replace(/\.webp$/, '-480.webp');
      expect(existsSync(mobileFile), `${path} mobile variant`).toBe(true);
      expect(readFileSync(mobileFile).toString('ascii', 8, 12)).toBe('WEBP');
    }
  });

  it('shares the same extras photography between menu and builder', () => {
    expect(getAdditionalIngredientImageUrl('Guacamole')).toBe(resolveProductImageUrl({ id: '23e44c1b-fe27-251a-0759-74f798d65e53' }));
    expect(getAdditionalIngredientImageUrl('Papas a la francesa')).toBe(resolveProductImageUrl({ id: '3d9f5e71-d95c-7b13-5898-33a0c9e8e04e' }));
  });
  it('shows grated cheese separately from cheese sauce', () => {
    const image = getAdditionalIngredientImageUrl('Queso rallado');
    expect(image).toBe('/images/menu/ingredientes-queso-rallado.webp');
    expect(image).not.toBe(getAdditionalIngredientImageUrl('Queso'));
    expect(existsSync(resolve(process.cwd(), 'public', image.slice(1)))).toBe(true);
  });
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
