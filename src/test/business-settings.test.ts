import { describe, expect, it } from 'vitest';
import {
  buildBusinessWhatsAppUrl,
  formatBusinessPhone,
  formatCompactHours,
  getSchemaOpeningHours,
  isBusinessOpenNow,
  mapBusinessSettings,
} from '@/domain/businessSettings';

describe('business settings helpers', () => {
  it('maps Supabase key/value rows into the canonical settings object', () => {
    const settings = mapBusinessSettings([
      { key: 'whatsapp_number', value: '573215667170' },
      { key: 'contact_address', value: 'c.c Cable Plaza Piso 4 Terraza, Manizales, Caldas' },
      { key: 'hours_weekday', value: '11:00 - 21:00' },
    ]);

    expect(settings.whatsappNumber).toBe('573215667170');
    expect(settings.contactAddress).toContain('Cable Plaza');
    expect(settings.hoursWeekday).toBe('11:00 - 21:00');
  });

  it('formats contact data consistently for UI and schema consumers', () => {
    expect(formatBusinessPhone('573215667170')).toBe('+57 321 566 7170');
    expect(buildBusinessWhatsAppUrl('573215667170', 'Hola')).toContain('https://wa.me/573215667170?text=');
    expect(formatCompactHours({ hoursWeekday: '11:00 - 21:00', hoursWeekend: '11:00 - 21:00' })).toBe('Lun–Dom: 11:00 - 21:00');
    expect(getSchemaOpeningHours({ hoursWeekday: '11:00 - 21:00', hoursWeekend: '12:00 - 20:00' })).toEqual([
      'Mo-Fr 11:00-21:00',
      'Sa-Su 12:00-20:00',
    ]);
  });

  it('derives open status from the configured business hours', () => {
    expect(
      isBusinessOpenNow(
        { hoursWeekday: '11:00 - 21:00', hoursWeekend: '12:00 - 20:00' },
        new Date('2026-04-13T15:00:00'),
      ),
    ).toBe(true);

    expect(
      isBusinessOpenNow(
        { hoursWeekday: '11:00 - 21:00', hoursWeekend: '12:00 - 20:00' },
        new Date('2026-04-13T22:00:00'),
      ),
    ).toBe(false);
  });
});
