import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AnalyticsAdmin from '@/components/admin/AnalyticsAdmin';
import SettingsAdmin from '@/components/admin/SettingsAdmin';
import { BowlRulesAdmin, IngredientsAdmin } from '@/pages/AdminPage';

const mocks = vi.hoisted(() => ({ from: vi.fn(), sync: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/hooks/use-catalog', () => ({ useBusinessSettings: () => ({ data: undefined }) }));
vi.mock('@/hooks/use-catalog-sync', () => ({ useCatalogMutationSync: () => mocks.sync }));

function query(result: unknown) {
  const builder = { select: vi.fn(), order: vi.fn(), limit: vi.fn(), in: vi.fn(), range: vi.fn(), then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve) };
  for (const method of ['select', 'order', 'limit', 'in', 'range'] as const) builder[method].mockReturnValue(builder);
  return builder;
}

beforeEach(() => vi.clearAllMocks());

describe('admin loading and recipe accessibility regressions', () => {
  it.each([
    ['ingredients', IngredientsAdmin, 'No se pudieron cargar los ingredientes.'],
    ['bowl_rules', BowlRulesAdmin, 'No se pudieron cargar las reglas.'],
  ] as const)('shows %s failures and permits retry', async (_table, Component, message) => {
    mocks.from.mockReturnValueOnce(query({ error: { message: 'offline' }, data: null })).mockReturnValue(query({ error: null, data: [] }));
    render(<Component />);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
    expect(mocks.from).toHaveBeenCalledTimes(2);
  });

  it('associates all four rule labels with their number inputs', async () => {
    mocks.from.mockReturnValue(query({ error: null, data: [{ size: 'small', name: 'Pequeño', price_cents: 10000, bases: 1, proteins: 1, accompaniments: 2 }] }));
    render(<BowlRulesAdmin />);
    fireEvent.click(await screen.findByRole('button', { name: 'Editar regla' }));
    for (const name of ['Precio', 'Bases', 'Proteínas', 'Acomp.']) expect(screen.getByRole('spinbutton', { name })).toBeInTheDocument();
  });
});

describe('analytics sample consistency', () => {
  it('does not present unavailable item data as an empty report and can recover', async () => {
    let fail = true;
    mocks.from.mockImplementation((table: string) => query(table === 'orders'
      ? { error: null, count: 600, data: [{ id: 'order-1', total_cents: 10000, order_type: 'pickup', created_at: '2026-10-06' }] }
      : table === 'analytics_events' ? { error: null, count: 0, data: [] }
      : { error: fail ? { message: 'offline' } : null, count: 1, data: fail ? null : [{ name: 'Bowl', quantity: 2, brand_id: 'ohana' }] }));
    render(<AnalyticsAdmin />);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar las estadísticas');
    expect(screen.queryByText('Sin datos aún')).not.toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await screen.findByText('Bowl')).toBeInTheDocument();
    expect(screen.getByText(/Muestra: 1 de 600 pedidos/)).toHaveTextContent('incluye cancelados');
    expect(screen.getByText('Pedidos en la muestra')).toBeInTheDocument();
  });

  it('fetches item pages only for the displayed order IDs', async () => {
    const items = query({ error: null, count: 501, data: [] });
    items.range.mockImplementation((offset: number) => query({ error: null, count: 501, data: offset === 0 ? Array.from({ length: 500 }, () => ({ name: 'Bowl', quantity: 1 })) : [{ name: 'Bebida', quantity: 1 }] }));
    mocks.from.mockImplementation((table: string) => table === 'order_items' ? items : query({ error: null, count: 1, data: table === 'orders' ? [{ id: 'sample-id', total_cents: 10000, order_type: 'delivery' }] : [] }));
    render(<AnalyticsAdmin />);
    expect(await screen.findByText('Bebida')).toBeInTheDocument();
    expect(items.in).toHaveBeenCalledWith('order_id', ['sample-id']);
    expect(items.range).toHaveBeenCalledWith(0, 499);
    expect(items.range).toHaveBeenCalledWith(500, 999);
  });
});


describe('settings catalog synchronization', () => {
  it('broadcasts successful settings mutations and does not broadcast failed writes', async () => {
    let fail = false;
    const reads = query({ data: [], error: null });
    const builder = { ...reads, eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }), upsert: vi.fn(() => Promise.resolve({ error: fail ? { message: 'offline' } : null })) };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.in.mockReturnValue(builder);
    mocks.from.mockReturnValue(builder);
    render(<SettingsAdmin />);
    const toggle = await screen.findByRole('switch', { name: 'Bloquear pedidos fuera de horario' });
    fireEvent.click(toggle);
    await waitFor(() => expect(mocks.sync).toHaveBeenCalledWith(['settings']));
    mocks.sync.mockClear();
    await waitFor(() => expect(toggle).not.toBeDisabled());
    fail = true;
    fireEvent.click(toggle);
    await waitFor(() => expect(builder.upsert).toHaveBeenCalledTimes(2));
    expect(mocks.sync).not.toHaveBeenCalled();
  });
});
