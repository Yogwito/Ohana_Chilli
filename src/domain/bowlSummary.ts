import type { CustomBowl } from '@/types';

export function formatBowlSummary(bowl: CustomBowl): string {
  const parts = [
    bowl.size.name,
    bowl.bases.map(b => b.name).join(', '),
    bowl.proteins.map(p => p.name).join(', '),
    `${bowl.acompanantes.length} acompañantes`,
  ];
  if (bowl.sauces?.length) parts.push(bowl.sauces.map(s => s.name).join(', '));
  return parts.join(' • ');
}

export function formatBowlDetail(bowl: CustomBowl): string {
  let detail = `${bowl.size.name}: ${bowl.bases.map(b => b.name).join(', ')} + ${bowl.proteins.map(p => p.name).join(', ')} + ${bowl.acompanantes.map(a => a.name).join(', ')}`;
  if (bowl.sauces?.length) detail += ` + Salsas: ${bowl.sauces.map(s => s.name).join(', ')}`;
  return detail;
}
