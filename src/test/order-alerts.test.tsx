import { act, render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OrderAlerts from '@/components/admin/OrderAlerts';

const mocks = vi.hoisted(() => ({ financial: 1, refresh: undefined as (() => void) | undefined, removed: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  channel: () => {
    const channel = { on: (_event: unknown, _filter: unknown, callback: () => void) => { mocks.refresh = callback; return channel; }, subscribe: (callback: (status: string) => void) => { callback('SUBSCRIBED'); return channel; } };
    return channel;
  }, removeChannel: mocks.removed,
} }));
vi.mock('@/lib/orderDb', () => ({ orderDb: { from: () => {
  let financial = false;
  const query = {
    select: (columns: string) => { financial = columns.includes('financial_attention_at'); return query; },
    eq: () => query, is: () => query, not: () => query, order: () => query,
    limit: async () => ({ error: null, count: financial ? mocks.financial : 0, data: financial && mocks.financial ? [{ financial_attention_at: new Date().toISOString() }] : [] }),
  };
  return query;
} } }));
afterEach(cleanup);
describe('financial order alerts', () => {
  it('alerts for cancelled paid incidents and reconciles acknowledgement via the shell listener', async () => {
    mocks.financial = 1;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><OrderAlerts>Panel</OrderAlerts></QueryClientProvider>);
    expect(await screen.findByText('1 incidencia financiera por reconocer')).toBeInTheDocument();
    expect(screen.getByText('1 pedido por reconocer')).toBeInTheDocument();
    mocks.financial = 0;
    await act(async () => { mocks.refresh(); });
    await waitFor(() => expect(screen.getByText('0 pedidos por reconocer')).toBeInTheDocument());
    expect(screen.queryByText('1 incidencia financiera por reconocer')).not.toBeInTheDocument();
    client.clear();
  });
});
