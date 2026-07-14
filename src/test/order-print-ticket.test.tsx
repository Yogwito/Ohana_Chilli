import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {},
}));

import { PrintOrderTicket, type KanbanOrder } from '@/components/admin/orders/OrdersKanban';

const order: KanbanOrder = {
  id: '12345678-1234-1234-1234-123456789012',
  customer_name: 'Cliente Cocina',
  phone: '3001234567',
  order_type: 'pickup',
  address: null,
  delivery_zone: null,
  delivery_fee_cents: 0,
  notes: 'Entregar cubiertos',
  total_cents: 29900,
  status: 'pending',
  payment_method: 'cash',
  created_at: '2026-07-14T17:00:00.000Z',
  estimated_ready_at: null,
  cancellation_reason: null,
  items: [{
    id: 'item-1',
    order_id: '12345678-1234-1234-1234-123456789012',
    name: 'Bowl Personalizado',
    quantity: 1,
    unit_price_cents: 29900,
    details: {
      size: 'Mediano',
      bases: ['Arroz'],
      proteins: ['Pollo'],
      acompanantes: ['Maíz'],
      sauces: ['Mayo cilantro'],
      complementos: ['Doritos'],
      notes: 'Salsa aparte',
    },
  }],
};

describe('PrintOrderTicket', () => {
  it('renderiza una comanda completa para cocina', () => {
    render(<PrintOrderTicket order={order} />);

    expect(screen.getByText('COMANDA DE COCINA')).toBeInTheDocument();
    expect(screen.getByText('#12345678')).toBeInTheDocument();
    expect(screen.getByText(/Cliente Cocina/)).toBeInTheDocument();
    expect(screen.getByText(/Mediano/)).toBeInTheDocument();
    expect(screen.getByText(/Mayo cilantro/)).toBeInTheDocument();
    expect(screen.getByText(/NOTA: Salsa aparte/)).toBeInTheDocument();
    expect(screen.getByText(/Entregar cubiertos/)).toBeInTheDocument();
    expect(screen.getByText(/TOTAL.*29\.900/)).toBeInTheDocument();
  });
});
