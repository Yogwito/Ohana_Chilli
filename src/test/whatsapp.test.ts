import { describe, expect, it } from 'vitest';
import { generateWhatsAppMessage } from '@/domain/whatsapp';
import type { CartItem } from '@/types';

describe('WhatsApp order formatting', () => {
  it('identifies an approved Wompi handoff as an online payment', () => {
    const items: CartItem[] = [{
      id: 'item-1',
      brand: 'ohana',
      type: 'product',
      product: {
        id: 'product-1',
        name: 'Bowl Ohana',
        description: '',
        price: 25000,
        brand: 'ohana',
        categoryId: 'bowls',
      },
      quantity: 1,
      unitPrice: 25000,
      totalPrice: 25000,
    }];

    const message = generateWhatsAppMessage(items, 25000, {
      name: 'Cliente',
      phone: '3001234567',
      orderType: 'pickup',
      orderId: '12345678-0000-0000-0000-000000000000',
      paymentMethod: 'wompi',
    });

    expect(message).toContain('Pago: Pago en línea con Wompi');
    expect(message).toContain('Ref: 12345678');
  });
});
