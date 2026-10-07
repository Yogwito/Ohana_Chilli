import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PromotionsSection from '@/components/ohana/PromotionsSection';
const mocks = vi.hoisted(() => ({ price: 18000, add: vi.fn() }));
vi.mock('@/hooks/use-catalog', () => ({ usePromotions: () => ({ data: [{ id: 'combo', title: 'Combo', type: 'combo', price_cents: mocks.price, discount_type: 'label' }], isLoading: false }) }));
vi.mock('@/context/CartContext', () => ({ useCart: () => ({ addProduct: mocks.add }) }));
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/components/ui/AnimatedElement', () => ({ AnimatedElement: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
afterEach(cleanup);
describe('combo purchase controls', () => {
  it('adds the promotion identity to the cart', () => {
    mocks.price = 18000; render(<PromotionsSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    expect(mocks.add).toHaveBeenCalledWith(expect.objectContaining({ promotionId: 'combo', price: 18000 }));
  });
  it.each([0, -1])('does not offer an invalid combo price %s', price => {
    mocks.price = price; render(<PromotionsSection />);
    expect(screen.queryByRole('button', { name: 'Agregar' })).not.toBeInTheDocument();
  });
});
