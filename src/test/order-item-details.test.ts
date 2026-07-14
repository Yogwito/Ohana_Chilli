import { describe, expect, it } from 'vitest';
import { getOrderItemPresentation } from '@/domain/orderItemDetails';

describe('getOrderItemPresentation', () => {
  it('desglosa todos los componentes de un bowl personalizado', () => {
    expect(getOrderItemPresentation({
      size: 'Mediano',
      bases: ['Arroz blanco'],
      proteins: ['Pollo al panko', 'Proteína extra: Res molida (+$ 5.000)'],
      acompanantes: ['Maíz', 'Guacamole'],
      sauces: [],
      complementos: ['Doritos'],
      notes: 'Salsa aparte',
    })).toEqual({
      kind: 'custom-bowl',
      rows: [
        { label: 'Tamaño', value: 'Mediano' },
        { label: 'Base', value: 'Arroz blanco' },
        { label: 'Proteínas', value: 'Pollo al panko, Proteína extra: Res molida (+$ 5.000)' },
        { label: 'Acompañantes', value: 'Maíz, Guacamole' },
        { label: 'Salsas', value: 'Sin salsas' },
        { label: 'Complementos', value: 'Doritos' },
      ],
      notes: ['Salsa aparte'],
    });
  });

  it('conserva modificaciones y notas de productos regulares', () => {
    const result = getOrderItemPresentation({
      customizations: {
        removedIngredients: ['Cebolla'],
        extras: [{ id: 'tocineta', name: 'Tocineta', price: 4000 }],
        note: 'Bien cocida',
      },
    });

    expect(result.kind).toBe('product');
    expect(result.rows[0]).toEqual({ label: 'Sin', value: 'Cebolla' });
    expect(result.rows[1].label).toBe('Adicionales');
    expect(result.rows[1].value).toContain('Tocineta');
    expect(result.notes).toEqual(['Bien cocida']);
  });
});
