import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CartProvider, useCart } from '@/context/CartContext';
import { useSavedBowls } from '@/hooks/use-saved-bowls';
import type { CustomBowl } from '@/types';
const fixtures = vi.hoisted(() => ({
  size: {
    size: 'small' as const,
    name: 'Pequeño',
    price: 23900,
    maxBases: 1,
    maxProteins: 1,
    maxAcompanantes: 4,
    maxSauces: 1,
    maxComplementos: 1,
  },
  rice: { id: 'rice', name: 'Arroz', type: 'base' as const },
  chicken: { id: 'chicken', name: 'Pollo', type: 'protein' as const },
  drink: {
    id: 'drink',
    name: 'Bretaña',
    price: 5000,
    brand: 'ohana' as const,
    categoryId: 'ohana-bebidas',
    description: '',
  },
}));
vi.mock('@/hooks/use-catalog', () => ({
  useProducts: () => ({ data: [fixtures.drink], isSuccess: true }),
  usePromotions: () => ({ data: [], isSuccess: true }),
  useIngredients: () => ({
    data: [fixtures.rice, fixtures.chicken],
    isSuccess: true,
  }),
  useBowlRules: () => ({ data: [fixtures.size], isSuccess: true }),
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
const bowl = (): CustomBowl => ({
  size: fixtures.size,
  bases: [fixtures.rice],
  proteins: [fixtures.chicken],
  acompanantes: [],
  extras: [
    {
      ingredient: fixtures.chicken,
      quantity: 1,
      source: 'upsell',
      unitPrice: 5000,
    },
  ],
  notes: 'Sin picante',
});
describe('bowl persistence and cart transactions', () => {
  beforeEach(() => localStorage.clear());
  it('adds bowl and drink quantities together and retains extras after remount', async () => {
    const hook = renderHook(useCart, { wrapper: CartProvider });
    act(() =>
      hook.result.current.addBowlOrder(bowl(), [
        { product: fixtures.drink, quantity: 2 },
      ]),
    );
    expect(hook.result.current.cart.items).toHaveLength(2);
    expect(hook.result.current.cart.total).toBe(38900);
    await waitFor(() =>
      expect(
        JSON.parse(localStorage.getItem('ohana-bowls-cart')!).version,
      ).toBe('cart:v4'),
    );
    hook.unmount();
    const restored = renderHook(useCart, { wrapper: CartProvider });
    await waitFor(() =>
      expect(restored.result.current.cart.items).toHaveLength(2),
    );
    expect(
      restored.result.current.cart.items[0].customBowl?.extras?.[0].ingredient
        .id,
    ).toBe('chicken');
    expect(restored.result.current.cart.items[0].reviewIssues).toEqual([]);
    expect(restored.result.current.cart.total).toBe(38900);
  });
  it('replaces an edited bowl while preserving its cart quantity', () => {
    const hook = renderHook(useCart, { wrapper: CartProvider });
    act(() => hook.result.current.addBowlOrder(bowl(), []));
    const id = hook.result.current.cart.items[0].id;
    act(() => hook.result.current.updateQuantity(id, 2));
    act(() =>
      hook.result.current.addBowlOrder(
        { ...bowl(), notes: 'Actualizada' },
        [],
        id,
      ),
    );
    expect(hook.result.current.cart.items).toHaveLength(1);
    expect(hook.result.current.cart.items[0].quantity).toBe(2);
    expect(hook.result.current.cart.items[0].notes).toBe('Actualizada');
    expect(hook.result.current.cart.total).toBe(57800);
  });
  it('recovers old cart versions and marks malformed bowls for reconstruction', () => {
    localStorage.setItem(
      'ohana-bowls-cart',
      JSON.stringify({
        version: 'cart:v3',
        items: [
          {
            id: 'old',
            brand: 'ohana',
            type: 'custom-bowl',
            customBowl: {},
            quantity: 1,
            unitPrice: 23900,
            totalPrice: 23900,
          },
        ],
        subtotal: 23900,
        total: 23900,
      }),
    );
    const hook = renderHook(useCart, { wrapper: CartProvider });
    expect(hook.result.current.cart.items).toHaveLength(1);
    expect(hook.result.current.cart.items[0].customBowl).toBeUndefined();
    expect(
      hook.result.current.cart.items[0].reviewIssues?.length,
    ).toBeGreaterThan(0);
  });
  it('ignores invalid favorite containers and invalid entries', () => {
    localStorage.setItem('ohana-saved-bowls', '{}');
    const invalid = renderHook(useSavedBowls);
    expect(invalid.result.current.saved).toEqual([]);
    invalid.unmount();
    localStorage.setItem(
      'ohana-saved-bowls',
      JSON.stringify([
        { id: 'invalid', name: 'Incompleto', config: {} },
        { id: 'valid', name: 'Pollo', config: bowl(), createdAt: '2026-10-05' },
      ]),
    );
    const recovered = renderHook(useSavedBowls);
    expect(recovered.result.current.saved.map((i) => i.id)).toEqual(['valid']);
  });
  it('versions favorites and restores extras separately from included portions', () => {
    const hook = renderHook(useSavedBowls);
    act(() => {
      hook.result.current.saveBowl('Pollo', bowl());
    });
    expect(JSON.parse(localStorage.getItem('ohana-saved-bowls')!).version).toBe(
      'saved:v2',
    );
    hook.unmount();
    const restored = renderHook(useSavedBowls);
    expect(restored.result.current.saved[0].config.proteins).toHaveLength(1);
    expect(restored.result.current.saved[0].config.extras).toHaveLength(1);
  });
});
