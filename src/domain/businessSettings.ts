export const BUSINESS_SETTING_DEFINITIONS = [
  {
    key: 'whatsapp_number',
    label: 'Número de WhatsApp',
    placeholder: '573215667170',
    description: 'Sin espacios ni guiones. Se usa en checkout, footer y enlaces de contacto.',
  },
  {
    key: 'contact_email',
    label: 'Email de contacto',
    placeholder: 'hola@ohanachilli.com',
    description: 'Correo público mostrado en la app.',
  },
  {
    key: 'contact_address',
    label: 'Dirección',
    placeholder: 'c.c Cable Plaza Piso 4 Terraza, Manizales, Caldas',
    description: 'Dirección pública del local.',
  },
  {
    key: 'contact_maps_url',
    label: 'URL de Maps',
    placeholder: 'https://maps.app.goo.gl/...',
    description: 'Enlace para abrir la ubicación del local.',
  },
  {
    key: 'hours_weekday',
    label: 'Horario Lun-Vie',
    placeholder: '11:00 - 21:00',
    description: 'Se usa para footer, contacto y schema.',
  },
  {
    key: 'hours_weekend',
    label: 'Horario Sáb-Dom',
    placeholder: '11:00 - 21:00',
    description: 'Se usa para footer, contacto y schema.',
  },
  {
    key: 'instagram_url',
    label: 'Instagram URL',
    placeholder: 'https://www.instagram.com/bowlsohana',
    description: 'Enlace público a Instagram.',
  },
  {
    key: 'instagram_handle',
    label: 'Instagram usuario',
    placeholder: '@bowlsohana',
    description: 'Texto mostrado en checkout y contacto.',
  },
  {
    key: 'facebook_url',
    label: 'Facebook URL',
    placeholder: 'https://www.facebook.com/...',
    description: 'Enlace público a Facebook.',
  },
  {
    key: 'delivery_eta',
    label: 'Tiempo estimado de entrega',
    placeholder: '35-50 min',
    description: 'Se usa en Ohana y checkout.',
  },
  {
    key: 'review_rating',
    label: 'Calificación destacada',
    placeholder: '4.9',
    description: 'Badge público mostrado en Ohana.',
  },
] as const;

export type BusinessSettingKey = typeof BUSINESS_SETTING_DEFINITIONS[number]['key'];

interface SettingRow {
  key: string;
  value: string;
}

export interface BusinessSettings {
  whatsappNumber: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  contactMapsUrl: string | null;
  hoursWeekday: string | null;
  hoursWeekend: string | null;
  instagramUrl: string | null;
  instagramHandle: string | null;
  facebookUrl: string | null;
  deliveryEta: string | null;
  reviewRating: string | null;
}

export const EMPTY_BUSINESS_SETTINGS: BusinessSettings = {
  whatsappNumber: null,
  contactEmail: null,
  contactAddress: null,
  contactMapsUrl: null,
  hoursWeekday: null,
  hoursWeekend: null,
  instagramUrl: null,
  instagramHandle: null,
  facebookUrl: null,
  deliveryEta: null,
  reviewRating: null,
};

const BUSINESS_SETTING_KEY_MAP: Record<BusinessSettingKey, keyof BusinessSettings> = {
  whatsapp_number: 'whatsappNumber',
  contact_email: 'contactEmail',
  contact_address: 'contactAddress',
  contact_maps_url: 'contactMapsUrl',
  hours_weekday: 'hoursWeekday',
  hours_weekend: 'hoursWeekend',
  instagram_url: 'instagramUrl',
  instagram_handle: 'instagramHandle',
  facebook_url: 'facebookUrl',
  delivery_eta: 'deliveryEta',
  review_rating: 'reviewRating',
};

function sanitizePhone(rawPhone: string | null | undefined) {
  if (!rawPhone) return '';
  return rawPhone.replace(/[^\d]/g, '');
}

export function mapBusinessSettings(rows: SettingRow[]): BusinessSettings {
  return rows.reduce<BusinessSettings>((settings, row) => {
    if (!(row.key in BUSINESS_SETTING_KEY_MAP)) return settings;

    const mappedKey = BUSINESS_SETTING_KEY_MAP[row.key as BusinessSettingKey];
    settings[mappedKey] = row.value?.trim() || null;
    return settings;
  }, { ...EMPTY_BUSINESS_SETTINGS });
}

export function formatBusinessPhone(phone: string | null | undefined) {
  const sanitizedPhone = sanitizePhone(phone);

  if (!sanitizedPhone) return null;

  if (sanitizedPhone.startsWith('57') && sanitizedPhone.length === 12) {
    return `+57 ${sanitizedPhone.slice(2, 5)} ${sanitizedPhone.slice(5, 8)} ${sanitizedPhone.slice(8)}`;
  }

  if (sanitizedPhone.length === 10) {
    return `${sanitizedPhone.slice(0, 3)} ${sanitizedPhone.slice(3, 6)} ${sanitizedPhone.slice(6)}`;
  }

  return `+${sanitizedPhone}`;
}

export function buildBusinessWhatsAppUrl(phone: string | null | undefined, message?: string) {
  const sanitizedPhone = sanitizePhone(phone);

  if (!sanitizedPhone) return null;

  if (message) {
    return `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
  }

  return `https://wa.me/${sanitizedPhone}`;
}

export function formatCompactHours(settings: Pick<BusinessSettings, 'hoursWeekday' | 'hoursWeekend'>) {
  const weekday = settings.hoursWeekday?.trim();
  const weekend = settings.hoursWeekend?.trim();

  if (!weekday && !weekend) return null;
  if (weekday && weekend && weekday === weekend) return `Lun–Dom: ${weekday}`;
  if (weekday && weekend) return `Lun–Vie: ${weekday} · Sáb–Dom: ${weekend}`;
  if (weekday) return `Lun–Vie: ${weekday}`;
  return `Sáb–Dom: ${weekend}`;
}

export function parseBusinessAddress(address: string | null | undefined) {
  const parts = address?.split(',').map((part) => part.trim()).filter(Boolean) ?? [];

  return {
    streetAddress: parts[0] ?? null,
    addressLocality: parts[1] ?? null,
    addressRegion: parts[2] ?? null,
    addressCountry: 'CO',
  };
}

function normalizeHoursForSchema(hours: string | null | undefined) {
  if (!hours) return null;
  return hours.replace(/\s+/g, '').replace(/[–—]/g, '-');
}

export function getSchemaOpeningHours(settings: Pick<BusinessSettings, 'hoursWeekday' | 'hoursWeekend'>) {
  const weekday = normalizeHoursForSchema(settings.hoursWeekday);
  const weekend = normalizeHoursForSchema(settings.hoursWeekend);
  const values: string[] = [];

  if (weekday) values.push(`Mo-Fr ${weekday}`);
  if (weekend) values.push(`Sa-Su ${weekend}`);

  return values;
}

function parseBusinessHoursRange(hours: string | null | undefined) {
  if (!hours) return null;

  const match = hours.match(/(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;

  return {
    startMinutes: Number(match[1]) * 60 + Number(match[2]),
    endMinutes: Number(match[3]) * 60 + Number(match[4]),
  };
}

export function isBusinessOpenNow(settings: Pick<BusinessSettings, 'hoursWeekday' | 'hoursWeekend'>, now = new Date()) {
  const isWeekend = now.getDay() === 0 || now.getDay() === 6;
  const range = parseBusinessHoursRange(isWeekend ? settings.hoursWeekend : settings.hoursWeekday);
  if (!range) return null;

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  return currentMinutes >= range.startMinutes && currentMinutes <= range.endMinutes;
}
