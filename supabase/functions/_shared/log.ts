// Structured logging with central redaction. Logs must never contain secrets or customer PII.
const SENSITIVE_KEY = /pass(word)?|secret|token|authorization|api[-_]?key|apikey|service[-_]?role|private|integrity|cookie|signature|checksum|bearer|credential|^body$|^raw$|^request$|^payload$/i;
const PHONE_KEY = /phone|tel|whatsapp|mobile|celular/i;
const ADDRESS_KEY = /address|direccion|street|notes|note$|customer_name|full_name|first_name|last_name|recipient|contact|ubicacion|^name$|email/i;
const SECRET_VALUE = /(Bearer\s+[\w.~+/-]+=*|\b(?:prv|pub|prod|test)_(?:test_|prod_)?[A-Za-z0-9]{6,}|\beyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{5,}|\b[a-f0-9]{64}\b)/g;

export function maskPhone(value: unknown): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  return digits ? `***${digits.slice(-3)}` : '***';
}
export function redactString(value: string): string {
  return value.replace(SECRET_VALUE, '[redacted]').slice(0, 300);
}
export function redact(value: unknown, depth = 0): unknown {
  if (value == null || typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'string') return redactString(value);
  if (depth > 4) return '[truncated]';
  if (Array.isArray(value)) return value.slice(0, 20).map(v => redact(v, depth + 1));
  if (value instanceof Error) return { name: value.name };
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
      if (PHONE_KEY.test(key)) out[key] = maskPhone(v);
      else if (SENSITIVE_KEY.test(key) || ADDRESS_KEY.test(key)) out[key] = '[redacted]';
      else out[key] = redact(v, depth + 1);
    }
    return out;
  }
  return '[unsupported]';
}
export function log(level: 'info' | 'warn' | 'error', event: string, fields: Record<string, unknown> = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, service: 'order-api', event, ...(redact(fields) as object) });
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}
// Accept only short, conservative inbound ids; anything else is replaced.
export function requestId(inbound: string | null): string {
  return inbound && /^[A-Za-z0-9._-]{8,64}$/.test(inbound) ? inbound : crypto.randomUUID();
}
export function errorCategory(status: number, code: string): string {
  if (status === 429) return 'rate_limit';
  if (status === 401 || status === 403) return 'auth';
  if (code === 'orders_disabled' || code === 'online_payments_disabled' || code === 'refunds_disabled') return 'kill_switch';
  if (code.startsWith('provider') || code.includes('refund_requires_review')) return 'provider';
  if (status >= 500) return 'server';
  if (status === 409) return 'conflict';
  if (status >= 400) return 'client';
  return 'none';
}
