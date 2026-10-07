import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { hostedCheckout, minorUnits, sha256, verifyEvent, type WompiEvent } from '../../supabase/functions/_shared/wompi';
beforeAll(()=>vi.stubGlobal('crypto',webcrypto));
const transaction={id:'test-id',reference:'test-ref',amount_in_cents:2390000,currency:'COP',status:'APPROVED',payment_method_type:'CARD'};
async function event():Promise<WompiEvent>{return{event:'transaction.updated',environment:'test',timestamp:123,data:{transaction:{...transaction}},signature:{properties:['transaction.id','transaction.status','transaction.amount_in_cents'],checksum:await sha256('test-idAPPROVED2390000123secret')}};}
describe('Wompi integrity',()=>{
  it('converts integer COP only at the provider boundary',()=>{expect(minorUnits(23900)).toBe(2390000);expect(()=>minorUnits(23.9)).toThrow();expect(()=>minorUnits(-1)).toThrow();});
  it('signs hosted checkout server-side including expiration',async()=>{
    const url=new URL(await hostedCheckout({reference:'test-ref',amount_cop:23900,expires_at:'2026-10-06T18:00:00.000Z'},'pub_test_key','secret','https://example.com/pedido/token'));
    expect(url.searchParams.get('signature:integrity')).toBe(await sha256('test-ref2390000COP2026-10-06T18:00:00.000Zsecret'));
    expect(url.searchParams.get('amount-in-cents')).toBe('2390000');expect(url.toString()).not.toContain('secret');
  });
  it('accepts authentic repeated events for database idempotency',async()=>{const data=await event();expect(await verifyEvent(data,'secret')).toBe(true);expect(await verifyEvent(data,'secret')).toBe(true);});
  it('rejects forged signatures, amounts, timestamps, missing signed fields and wrong secrets',async()=>{
    const data=await event();expect(await verifyEvent({...data,timestamp:124},'secret')).toBe(false);
    expect(await verifyEvent({...data,data:{transaction:{...transaction,amount_in_cents:1}}},'secret')).toBe(false);
    expect(await verifyEvent({...data,signature:{...data.signature,checksum:'a'.repeat(64)}},'secret')).toBe(false);
    expect(await verifyEvent({...data,signature:{...data.signature,properties:['transaction.id']}},'secret')).toBe(false);
    expect(await verifyEvent(data,'wrong')).toBe(false);
  });
  it('supports variable signed-property order',async()=>{
    const data=await event();data.signature.properties=['transaction.status','transaction.id','transaction.amount_in_cents','transaction.reference'];
    data.signature.checksum=await sha256('APPROVEDtest-id2390000test-ref123secret');expect(await verifyEvent(data,'secret')).toBe(true);
  });
});
