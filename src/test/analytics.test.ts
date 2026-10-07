import { beforeEach, describe, expect, it, vi } from 'vitest';

const orderApi = vi.hoisted(() => vi.fn(() => Promise.resolve({ accepted: true })));

vi.mock('@/lib/orderApi', () => ({ orderApi }));

import { trackEvent } from '@/lib/analytics';

describe('analytics tracking', () => {
  beforeEach(() => {
    orderApi.mockClear();
  });

  it('uses the rate-limited Edge route instead of a direct public table insert', () => {
    trackEvent({ type: 'add_to_cart', productId: 'bowl-1', productName: 'Bowl', brand: 'ohana', priceCents: 25900 });

    expect(orderApi).toHaveBeenCalledWith('analytics', {
      event_type: 'add_to_cart',
      metadata: { productId: 'bowl-1', productName: 'Bowl', brand: 'ohana', priceCents: 25900 },
    });
  });

  it('does not await analytics before the caller continues', () => {
    trackEvent({ type: 'page_view', page: '/' });
    trackEvent({ type: 'page_view', page: '/checkout' });

    expect(orderApi).toHaveBeenCalledTimes(2);
  });
});
