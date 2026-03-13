import { describe, expect, it } from 'vitest';
import { findDeliveryZoneByIdOrName, formatDeliveryZoneName, normalizeDeliveryZoneName } from '@/domain/deliveryZones';

describe('delivery zone normalization', () => {
  it('normalizes whitespace and accents for matching', () => {
    expect(normalizeDeliveryZoneName('  TeleCafé   ')).toBe('telecafe');
    expect(normalizeDeliveryZoneName('Villa   Café Minitas')).toBe('villa cafe minitas');
  });

  it('preserves a display-safe formatted name', () => {
    expect(formatDeliveryZoneName('  San   Rafael ')).toBe('San Rafael');
  });

  it('matches zones by id or normalized name', () => {
    const zones = [
      { id: 'zone-1', name: 'TeleCafé', feeCents: 7500 },
      { id: 'zone-2', name: 'Villa Café Minitas', feeCents: 6000 },
    ];

    expect(findDeliveryZoneByIdOrName(zones, 'zone-1')?.feeCents).toBe(7500);
    expect(findDeliveryZoneByIdOrName(zones, 'telecafe')?.id).toBe('zone-1');
    expect(findDeliveryZoneByIdOrName(zones, '  villa cafe minitas ')?.id).toBe('zone-2');
  });
});
