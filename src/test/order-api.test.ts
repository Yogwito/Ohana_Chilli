import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:async()=>({data:{session:null}})}}}));
import { checkoutAttempt, getPendingCheckout, orderItemRequest, OrderApiError } from '@/lib/orderApi';
import type { CartItem } from '@/types';
beforeEach(()=>{sessionStorage.clear();vi.stubGlobal('crypto',webcrypto);});
describe('order request identity',()=>{
  it('never sends catalog display names or authoritative prices',()=>{
    const item:CartItem={id:'cart',brand:'ohana',type:'product',product:{id:'product-id',name:'Forged name',price:1,description:'',brand:'ohana',categoryId:'test'},quantity:2,unitPrice:1,totalPrice:2,customizations:{removedIngredients:['Queso'],extras:[{id:'extra-id',name:'Extra',price:1},{id:'extra-id',name:'Extra',price:1}],note:'Test',extraTotal:2}};
    expect(orderItemRequest(item)).toEqual({type:'product',product_id:'product-id',quantity:2,notes:'Test',removed:['Queso'],extras:[{ingredient_id:'extra-id',quantity:2}]});
  });
  it('reuses identity after uncertain network results and refreshes',async()=>{
    const first=await checkoutAttempt({items:['test']});const again=await checkoutAttempt({items:['test']});expect(first).toEqual(again);expect(first.token).toHaveLength(64);
  });
  it('recovers the exact original request and quote after a reload without minting another key',async()=>{
    const request={customer_name:'Cliente',phone:'3001234567',order_type:'delivery',address:'Calle 1',delivery_zone_id:'zone',notes:'Sin cebolla',payment_method:'cash',items:[{type:'product',product_id:'product',quantity:2}]};
    const first=await checkoutAttempt(request,'quote-original');
    // Reading storage is the same recovery path used when Checkout mounts again.
    const recovered=getPendingCheckout();
    expect(recovered.request).toEqual(request);
    expect(recovered.quote).toBe('quote-original');
    const retry=await checkoutAttempt(recovered.request,recovered.quote);
    expect(retry.key).toBe(first.key);expect(retry.token).toBe(first.token);
    expect(localStorage.getItem('ohana-pending-order:v1')).toBeNull();
  });
  it('keeps identity when a changed quote is explicitly reviewed and accepted',async()=>{
    const request={items:['original']};const first=await checkoutAttempt(request,'old');
    const reviewed=await checkoutAttempt(request,'new');
    expect(reviewed.key).toBe(first.key);expect(reviewed.token).toBe(first.token);expect(reviewed.quote).toBe('new');
  });
  it('keeps legacy pending identities available for tracking without inventing a request',async()=>{
    const first=await checkoutAttempt({items:['original']});
    sessionStorage.setItem('ohana-pending-order:v1',JSON.stringify({key:first.key,token:first.token,signature:first.signature}));
    expect(getPendingCheckout().token).toBe(first.token);expect(getPendingCheckout().request).toBeUndefined();
  });
  it('does not hydrate malformed persisted fields into the checkout form',async()=>{
    const first=await checkoutAttempt({customer_name:42,phone:'3001234567',items:[]},'quote');
    sessionStorage.setItem('ohana-pending-order:v1',JSON.stringify({...first,quote:{malformed:true}}));
    expect(getPendingCheckout()).toMatchObject({key:first.key,token:first.token});
    expect(getPendingCheckout().request).toBeUndefined();
    expect(getPendingCheckout().quote).toBeUndefined();
  });
  it('rejects changing a pending request instead of accidentally placing another order',async()=>{
    await checkoutAttempt({items:['first']});await expect(checkoutAttempt({items:['changed']})).rejects.toBeInstanceOf(OrderApiError);
    expect(getPendingCheckout()?.request).toBeUndefined(); // malformed recovery data remains tracking-only
  });
});
