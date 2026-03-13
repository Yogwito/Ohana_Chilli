import type { CustomBowl } from '@/types';

export function formatBowlSummary(bowl: CustomBowl): string {
  const parts = [
    bowl.size.name,
    bowl.bases.map((base) => base.name).join(', '),
    bowl.proteins.map((protein) => protein.name).join(', '),
    `${bowl.acompanantes.length} acompanantes`,
  ];

  if (bowl.sauces?.length) {
    parts.push(`Salsas: ${bowl.sauces.map((sauce) => sauce.name).join(', ')}`);
  }

  if (bowl.complementos?.length) {
    parts.push(`Complementos: ${bowl.complementos.map((complemento) => complemento.name).join(', ')}`);
  }

  return parts.join(' • ');
}

export function formatBowlDetail(bowl: CustomBowl): string {
  let detail = `${bowl.size.name}: ${bowl.bases.map((base) => base.name).join(', ')} + ${bowl.proteins.map((protein) => protein.name).join(', ')} + ${bowl.acompanantes.map((acompanante) => acompanante.name).join(', ')}`;

  if (bowl.sauces?.length) {
    detail += ` + Salsas: ${bowl.sauces.map((sauce) => sauce.name).join(', ')}`;
  }

  if (bowl.complementos?.length) {
    detail += ` + Complementos: ${bowl.complementos.map((complemento) => complemento.name).join(', ')}`;
  }

  return detail;
}
