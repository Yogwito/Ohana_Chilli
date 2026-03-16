import type { CustomBowl } from '@/types';
import { formatPrice } from './formatPrice';
import { calculateBowlExtraCharges, calculateBowlPrice, getBowlChargeableIngredients } from './bowlPricing';

interface BowlSummaryRow {
  label: string;
  value: string;
}

function joinNames(values: string[]) {
  return values.length > 0 ? values.join(', ') : 'Sin seleccionar';
}

export function getBowlSummaryRows(bowl: CustomBowl): BowlSummaryRow[] {
  const rows: BowlSummaryRow[] = [
    { label: 'Base', value: joinNames(bowl.bases.map((item) => item.name)) },
    { label: 'Proteínas', value: joinNames(bowl.proteins.map((item) => item.name)) },
    { label: 'Acompañantes', value: joinNames(bowl.acompanantes.map((item) => item.name)) },
    { label: 'Salsas', value: joinNames((bowl.sauces ?? []).map((item) => item.name)) },
    { label: 'Complementos', value: joinNames((bowl.complementos ?? []).map((item) => item.name)) },
  ];

  const extras = getBowlChargeableIngredients(bowl).map(
    (item) => `${item.name} (+${formatPrice(item.price ?? 0)})`,
  );

  if (extras.length > 0) {
    rows.push({ label: 'Cargos extra', value: extras.join(', ') });
  }

  return rows;
}

export function formatBowlSummary(bowl: CustomBowl): string {
  const header = `${bowl.size.name} · ${formatPrice(calculateBowlPrice(bowl))}`;
  return [header, ...getBowlSummaryRows(bowl).map((row) => `${row.label}: ${row.value}`)].join('\n');
}

export function formatBowlDetailLines(bowl: CustomBowl): string[] {
  const lines = getBowlSummaryRows(bowl).map((row) => `${row.label}: ${row.value}`);
  const extraTotal = calculateBowlExtraCharges(bowl);

  if (extraTotal > 0) {
    lines.push(`Extras: ${formatPrice(extraTotal)}`);
  }

  return lines;
}

export function formatBowlDetail(bowl: CustomBowl): string {
  return [`Bowl ${bowl.size.name}`, ...formatBowlDetailLines(bowl), `Total: ${formatPrice(calculateBowlPrice(bowl))}`].join('\n');
}
