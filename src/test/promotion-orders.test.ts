import { describe, expect, it } from 'vitest';
import { reconcileCartWithCatalog } from '@/domain/cartCatalogSync';
import { orderItemRequest } from '@/lib/orderApi';
import type { CartState, Promotion } from '@/types';
const promotion: Promotion = {id:'combo-test',title:'Combo vigente',type:'combo',price_cents:18000,is_active:true,discount_type:'label',discount_value:0,sort_order:0,created_at:''};
const state: CartState = {items:[{id:'cart',brand:'ohana',type:'product',product:{id:'promo-combo-test',name:'Old title',description:'',price:1,brand:'ohana',categoryId:'promociones'},quantity:2,unitPrice:1,totalPrice:2}],subtotal:2,total:2};
const catalog={products:[],ingredients:[],bowlRules:[]};
describe('authoritative combo orders',()=>{
  it('preserves a promotion across reconciliation and adopts its current price and title',()=>{
    const result=reconcileCartWithCatalog(state,{...catalog,promotions:[promotion]});
    expect(result.items).toHaveLength(1);expect(result.total).toBe(36000);expect(result.items[0].product?.name).toBe('Combo vigente');
    expect(orderItemRequest(result.items[0])).toEqual({type:'promotion',promotion_id:'combo-test',quantity:2,notes:''});
  });
  it.each([{...promotion,is_active:false},{...promotion,ends_at:'2000-01-01'}, {...promotion,starts_at:'2999-01-01'}, {...promotion,type:'informative' as const}, {...promotion,price_cents:0}])('removes unavailable combos',promo=>{
    expect(reconcileCartWithCatalog(state,{...catalog,promotions:[promo]}).items).toHaveLength(0);
  });
  it('maps saved legacy promo IDs without sending trusted client prices',()=>{
    expect(orderItemRequest(state.items[0])).toEqual({type:'promotion',promotion_id:'combo-test',quantity:2,notes:''});
  });
});
