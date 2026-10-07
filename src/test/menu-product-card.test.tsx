import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MenuProductCard from '@/components/products/MenuProductCard';
import type { Product } from '@/types';

const { addProduct, trackEvent } = vi.hoisted(() => ({ addProduct: vi.fn(), trackEvent: vi.fn() }));
vi.mock('@/context/CartContext', () => ({ useCart: () => ({ addProduct }) }));
vi.mock('@/lib/analytics', () => ({ trackEvent }));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));
vi.mock('@/components/products/ProductDrawer', () => ({
  default: ({ onClose, onConfirm }: { onClose: () => void; onConfirm: (config: unknown) => void }) => (
    <div role="dialog">
      <button onClick={onClose}>Cerrar detalles</button>
      <button onClick={() => onConfirm({ removedIngredients: ['Arroz'], extras: [{ id: 'bacon', name: 'Tocineta', price: 3000 }], note: 'Sin cubiertos', extraTotal: 3000 })}>Confirmar extras</button>
    </div>
  ),
}));
const dish: Product = { id: 'paisa', name: 'Paisa', description: 'Arroz y frijoles', price: 27900, brand: 'ohana', categoryId: 'ohana-bowls-sugeridos' };

describe('shared menu product card', () => {
  beforeEach(() => vi.clearAllMocks());
  it('returns keyboard focus to the control that opened recipe details', async () => {
    render(<MenuProductCard product={dish} />);
    const trigger = screen.getByRole('button', { name: 'Ver ingredientes' });
    fireEvent.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar detalles' }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });
  it('adds a beverage directly without opening customization', () => {
    const beverage = { ...dish, id: 'water', name: 'Agua', categoryId: 'ohana-bebidas', price: 4000 };
    render(<MenuProductCard product={beverage} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Agua al carrito' }));
    expect(addProduct).toHaveBeenCalledWith(beverage);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it('retains paid extras, removed ingredients and notes when adding a customized dish', () => {
    render(<MenuProductCard product={dish} />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar Paisa al carrito' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar extras' }));
    expect(addProduct).toHaveBeenCalledWith(dish, 1, 'Sin cubiertos', expect.objectContaining({ extraTotal: 3000, removedIngredients: ['Arroz'] }));
    expect(trackEvent).toHaveBeenCalledWith(expect.objectContaining({ priceCents: 30900 }));
  });
});
