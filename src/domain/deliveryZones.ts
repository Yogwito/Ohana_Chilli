import type { DeliveryZone } from '@/types';

export function formatDeliveryZoneName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function normalizeDeliveryZoneName(value: string) {
  return formatDeliveryZoneName(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function findDeliveryZoneByIdOrName(zones: DeliveryZone[], candidate: string) {
  if (!candidate) return undefined;

  const byId = zones.find((zone) => zone.id === candidate);
  if (byId) return byId;

  const normalizedCandidate = normalizeDeliveryZoneName(candidate);
  return zones.find((zone) => normalizeDeliveryZoneName(zone.name) === normalizedCandidate);
}
