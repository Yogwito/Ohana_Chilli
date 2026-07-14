import { formatProductCustomizationLines } from '@/domain/productCustomizations';
import type { ProductCustomization } from '@/types';

export interface OrderItemDetailRow {
  label: string;
  value: string;
}

export interface OrderItemPresentation {
  kind: 'custom-bowl' | 'product';
  rows: OrderItemDetailRow[];
  notes: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map(readText).filter(Boolean);
}

function listValue(value: unknown, emptyLabel: string) {
  const values = readList(value);
  return values.length > 0 ? values.join(', ') : emptyLabel;
}

function splitFormattedLine(line: string): OrderItemDetailRow {
  const separator = line.indexOf(':');
  if (separator === -1) return { label: 'Detalle', value: line };
  return {
    label: line.slice(0, separator).trim(),
    value: line.slice(separator + 1).trim(),
  };
}

export function getOrderItemPresentation(details: Record<string, unknown> | null): OrderItemPresentation {
  if (!isRecord(details)) return { kind: 'product', rows: [], notes: [] };

  const size = readText(details.size);
  const isCustomBowl = Boolean(size)
    || ['bases', 'proteins', 'acompanantes', 'sauces', 'complementos'].some((key) => Array.isArray(details[key]));
  const itemNote = readText(details.notes);

  if (isCustomBowl) {
    return {
      kind: 'custom-bowl',
      rows: [
        { label: 'Tamaño', value: size || 'Sin especificar' },
        { label: 'Base', value: listValue(details.bases, 'Sin base') },
        { label: 'Proteínas', value: listValue(details.proteins, 'Sin proteínas') },
        { label: 'Acompañantes', value: listValue(details.acompanantes, 'Sin acompañantes') },
        { label: 'Salsas', value: listValue(details.sauces, 'Sin salsas') },
        { label: 'Complementos', value: listValue(details.complementos, 'Sin complementos') },
      ],
      notes: itemNote ? [itemNote] : [],
    };
  }

  const customizationLines = isRecord(details.customizations)
    ? formatProductCustomizationLines(details.customizations as unknown as ProductCustomization)
    : [];
  const rows: OrderItemDetailRow[] = [];
  const notes: string[] = [];

  customizationLines.forEach((line) => {
    const row = splitFormattedLine(line);
    if (row.label.toLowerCase() === 'nota') notes.push(row.value);
    else rows.push(row);
  });
  if (itemNote && !notes.includes(itemNote)) notes.push(itemNote);

  return { kind: 'product', rows, notes };
}
