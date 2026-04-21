import type { CustomBowl, Ingredient } from '@/types';
import { formatPrice } from './formatPrice';
import { calculateBowlExtraCharges, calculateBowlPrice, getBowlChargeLines } from './bowlPricing';

interface BowlSummaryRow {
  label: string;
  value: string;
}

function groupIngredients(items: Ingredient[]) {
  const grouped = new Map<string, { name: string; quantity: number }>();

  items.forEach((item) => {
    const current = grouped.get(item.id);

    if (current) {
      current.quantity += 1;
      return;
    }

    grouped.set(item.id, { name: item.name, quantity: 1 });
  });

  return Array.from(grouped.values());
}

export function formatGroupedIngredients(items: Ingredient[]) {
  if (items.length === 0) return 'Sin seleccionar';

  return groupIngredients(items)
    .map((item) => (item.quantity > 1 ? `${item.name} x${item.quantity}` : item.name))
    .join(', ');
}

export function getBowlSummaryRows(bowl: CustomBowl): BowlSummaryRow[] {
  const rows: BowlSummaryRow[] = [
    { label: 'Base', value: formatGroupedIngredients(bowl.bases) },
    { label: 'Proteínas', value: formatGroupedIngredients(bowl.proteins) },
    { label: 'Acompañantes', value: formatGroupedIngredients(bowl.acompanantes) },
    { label: 'Salsas', value: formatGroupedIngredients(bowl.sauces ?? []) },
    { label: 'Complementos', value: formatGroupedIngredients(bowl.complementos ?? []) },
  ];

  const extras = getBowlChargeLines(bowl).map(
    (line) => `${line.label}${line.quantity > 1 ? ` x${line.quantity}` : ''} (+${formatPrice(line.amount)})`,
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
