export interface DailyHours { open: string; close: string }
export type WeeklyHours = (DailyHours | null)[];

export function shouldBlockOrderSend(isOpen: boolean | null, weeklyScheduleConfigured: boolean, enforcementEnabled: boolean): boolean {
  return isOpen === false && (weeklyScheduleConfigured || enforcementEnabled);
}

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

export function parseWeeklyHours(value: string | null | undefined): WeeklyHours | null {
  if (!value) return null;
  try {
    const days: unknown = JSON.parse(value);
    if (!Array.isArray(days) || days.length !== 7 || !days.every((day) => day === null || (
      typeof day === 'object' && typeof day.open === 'string' && typeof day.close === 'string'
      && timePattern.test(day.open) && timePattern.test(day.close) && day.open < day.close
    ))) return null;
    return days as WeeklyHours;
  } catch { return null; }
}

export function getBusinessOpenStatus(schedule: WeeklyHours | null, now = new Date()) {
  if (!schedule) return { isOpen: null as boolean | null, message: null as string | null };
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const time = `${get('hour')}:${get('minute')}`;
  const today = schedule[day];
  if (today && time >= today.open && time < today.close) return { isOpen: true, message: null };
  for (let offset = 0; offset < 7; offset++) {
    const next = schedule[(day + offset) % 7];
    if (!next || (offset === 0 && time >= next.open)) continue;
    const when = offset === 0 ? 'hoy' : offset === 1 ? 'mañana' : `el ${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][(day + offset) % 7]}`;
    return { isOpen: false, message: `Estamos cerrados. Abrimos ${when} a las ${next.open}` };
  }
  return { isOpen: false, message: 'Estamos cerrados. Consulta nuestro próximo horario de atención' };
}
