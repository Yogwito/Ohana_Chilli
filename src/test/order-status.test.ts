import { describe, expect, it } from 'vitest';
import { getElapsedMinutes, getUrgencyLevel, NEXT_ORDER_STATUS } from '@/domain/orderStatus';

describe('order status domain', () => {
  const now = new Date('2026-07-14T17:30:00.000Z');

  it('uses the controlled kitchen workflow', () => {
    expect(NEXT_ORDER_STATUS.pending).toBe('confirmed');
    expect(NEXT_ORDER_STATUS.confirmed).toBe('preparing');
    expect(NEXT_ORDER_STATUS.preparing).toBe('ready');
    expect(NEXT_ORDER_STATUS.ready).toBe('delivered');
    expect(NEXT_ORDER_STATUS.delivered).toBeUndefined();
  });

  it('calculates elapsed time without returning negative values', () => {
    expect(getElapsedMinutes('2026-07-14T17:20:00.000Z', now)).toBe(10);
    expect(getElapsedMinutes('2026-07-14T17:40:00.000Z', now)).toBe(0);
  });

  it('raises urgency for aging active orders but not completed ones', () => {
    expect(getUrgencyLevel('2026-07-14T17:25:00.000Z', 'pending', now)).toBe('fresh');
    expect(getUrgencyLevel('2026-07-14T17:15:00.000Z', 'preparing', now)).toBe('attention');
    expect(getUrgencyLevel('2026-07-14T16:50:00.000Z', 'ready', now)).toBe('late');
    expect(getUrgencyLevel('2026-07-14T16:50:00.000Z', 'delivered', now)).toBe('done');
  });
});
