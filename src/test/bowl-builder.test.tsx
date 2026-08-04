import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import BowlBuilder from '@/components/ohana/BowlBuilder';
import type { BowlSizeRule, Ingredient } from '@/types';

const mocks = vi.hoisted(() => ({
  addCustomBowl: vi.fn(),
  bowlRule: {
    size: 'small',
    name: 'Pequeño',
    price: 23900,
    maxBases: 1,
    maxProteins: 2,
    maxAcompanantes: 1,
    maxSauces: 2,
    maxComplementos: 1,
  } as BowlSizeRule,
  ingredientMap: {
    base: [{ id: 'base-arroz', name: 'Arroz', type: 'base' }],
    protein: [{ id: 'protein-pollo', name: 'Pollo', type: 'protein' }],
    acompanante: [{ id: 'acomp-maiz', name: 'Maíz', type: 'acompanante' }],
    sauce: [{ id: 'sauce-pina', name: 'Piña', type: 'sauce' }],
    topping: [{ id: 'top-queso', name: 'Queso Frito', type: 'topping', price: 6000 }],
  } as Record<Ingredient['type'], Ingredient[]>,
}));

vi.mock('@/hooks/use-catalog', () => ({
  useBowlRules: () => ({ data: [mocks.bowlRule], isLoading: false }),
  useIngredients: (type?: Ingredient['type']) => ({
    data: type ? mocks.ingredientMap[type] : Object.values(mocks.ingredientMap).flat(),
    isLoading: false,
  }),
  useProducts: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/context/CartContext', () => ({
  useCart: () => ({ addCustomBowl: mocks.addCustomBowl }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}));

describe('BowlBuilder', () => {
  beforeEach(() => {
    mocks.addCustomBowl.mockReset();
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  it('allows repeated selections, skipping optional steps, and preserves the final bowl payload', async () => {
    render(<BowlBuilder />);

    fireEvent.click(screen.getByRole('button', { name: /Pequeño/i }));

    fireEvent.click(screen.getByRole('button', { name: /Agregar Arroz/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Siguiente$/i }));

    fireEvent.click(screen.getByRole('button', { name: /Agregar Pollo/i }));
    fireEvent.click(screen.getByRole('button', { name: /Agregar Pollo/i }));
    expect(screen.getAllByText(/Pollo x2/i).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /^Siguiente$/i }));

    const addAcompananteButton = screen.getByRole('button', { name: /Agregar Ma[ií]z/i });
    fireEvent.click(addAcompananteButton);
    await waitFor(() => expect(screen.getByRole('button', { name: /Agregar Ma[ií]z/i })).toBeDisabled());
    fireEvent.click(screen.getByRole('button', { name: /Agregar Ma[ií]z/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Siguiente$/i }));

    const skipSaucesButton = screen.getByRole('button', { name: /^Omitir$/i });
    expect(skipSaucesButton).toBeEnabled();
    fireEvent.click(skipSaucesButton);

    const skipToppingsButton = screen.getByRole('button', { name: /^Omitir$/i });
    expect(skipToppingsButton).toBeEnabled();
    fireEvent.click(skipToppingsButton);

    const skipExtrasButton = screen.getByRole('button', { name: /Saltar este paso/i });
    expect(skipExtrasButton).toBeEnabled();
    fireEvent.click(skipExtrasButton);

    expect(screen.getByText(/Pollo x2/i)).toBeInTheDocument();
    expect(screen.getAllByText(/\$.*23\.900/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Agregar al carrito/i }));

    expect(mocks.addCustomBowl).toHaveBeenCalledTimes(1);

    const savedBowl = mocks.addCustomBowl.mock.calls[0][0];

    expect(savedBowl.proteins).toHaveLength(2);
    expect(savedBowl.proteins[0].id).toBe('protein-pollo');
    expect(savedBowl.proteins[1].id).toBe('protein-pollo');
    expect(savedBowl.acompanantes).toHaveLength(1);
    expect(savedBowl.acompanantes[0].id).toBe('acomp-maiz');
    expect(savedBowl.sauces).toEqual([]);
    expect(savedBowl.complementos).toEqual([]);
  });
});
