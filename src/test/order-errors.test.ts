import { describe, expect, it } from 'vitest';
import { describeOrderError } from '@/domain/orderErrors';

describe('describeOrderError', () => {
  it('explica qué hacer cuando el precio no coincide', () => {
    expect(describeOrderError('Precio no coincide para Bowl (enviado 1, vigente 2)')).toMatch(/precios de tu carrito cambiaron/);
    expect(describeOrderError('Total no coincide (enviado 1, vigente 2)')).toMatch(/precios de tu carrito cambiaron/);
  });

  it('conserva el detalle de productos no disponibles', () => {
    expect(describeOrderError('Adicional no disponible: Queso')).toBe('Adicional no disponible: Queso. Quita ese producto del carrito o vuelve a armarlo.');
  });

  it('tiene un mensaje por defecto', () => {
    expect(describeOrderError(undefined)).toBe('No pudimos crear el pedido. Intenta nuevamente.');
    expect(describeOrderError('Teléfono inválido')).toBe('Teléfono inválido');
  });
});
