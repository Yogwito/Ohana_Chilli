import type { CustomBowl } from '@/types';

export function formatBowlSummary(bowl: CustomBowl): string {
  const parts = [
    bowl.size.name,
    bowl.bases.map(b => b.name).join(', '),
    bowl.proteins.map(p => p.name).join(', '),
    `${bowl.acompanantes.length} acompañantes`,
  ];
  return parts.join(' • ');
}

export function formatBowlDetail(bowl: CustomBowl): string {
  return `${bowl.size.name}: ${bowl.bases.map(b => b.name).join(', ')} + ${bowl.proteins.map(p => p.name).join(', ')} + ${bowl.acompanantes.map(a => a.name).join(', ')}`;
}
