export async function sha256(value: string): Promise<string> {
  const bytes = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}
export function equalDigest(left: string, right: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  let difference = 0;
  for (let i = 0; i < 64; i++) difference |= left.toLowerCase().charCodeAt(i) ^ right.toLowerCase().charCodeAt(i);
  return difference === 0;
}
export interface WompiTransaction {
  id: string; reference: string; amount_in_cents: number; currency: string; status: string; payment_method_type: string;
}
export interface WompiEvent {
  event: string; environment: string; timestamp: number;
  data: { transaction: WompiTransaction };
  signature: { properties: string[]; checksum: string };
}
export async function verifyEvent(event: WompiEvent, secret: string): Promise<boolean> {
  if (event.event !== 'transaction.updated' || !Number.isSafeInteger(event.timestamp) || !event.signature || !Array.isArray(event.signature.properties)) return false;
  const properties = event.signature.properties;
  if (!['transaction.id', 'transaction.status', 'transaction.amount_in_cents'].every(key => properties.includes(key)) || properties.length > 20) return false;
  const values: string[] = [];
  for (const path of properties) {
    if (!/^transaction\.[a-z_]+$/.test(path)) return false;
    const key = path.slice('transaction.'.length) as keyof WompiTransaction;
    const value = event.data?.transaction?.[key];
    if (typeof value !== 'string' && typeof value !== 'number') return false;
    values.push(String(value));
  }
  return equalDigest(await sha256(values.join('') + event.timestamp + secret), event.signature.checksum);
}
export function minorUnits(cop: number): number {
  if (!Number.isSafeInteger(cop) || cop <= 0 || !Number.isSafeInteger(cop * 100)) throw new Error('invalid_amount');
  return cop * 100;
}
export async function hostedCheckout(attempt: {reference: string; amount_cop: number; expires_at: string}, publicKey: string, secret: string, returnUrl: string) {
  const amount = minorUnits(attempt.amount_cop);
  const signature = await sha256(`${attempt.reference}${amount}COP${attempt.expires_at}${secret}`);
  const params = new URLSearchParams({
    'public-key': publicKey, currency: 'COP', 'amount-in-cents': String(amount), reference: attempt.reference,
    'signature:integrity': signature, 'redirect-url': returnUrl, 'expiration-time': attempt.expires_at,
  });
  return `https://checkout.wompi.co/p/?${params}`;
}
