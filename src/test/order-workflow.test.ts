import { describe, expect, it } from 'vitest';
import { actionsFor, needsAcknowledgement, needsFinancialResolution, type StaffOrder } from '@/domain/orderWorkflow';
const base:StaffOrder={id:'test',version:0,customer_name:'Test',phone:'3001234567',order_type:'pickup',address:null,delivery_zone:null,delivery_fee_cents:0,notes:null,total_cents:10000,status:'pending',created_at:new Date().toISOString(),acknowledged_at:null,actionable_at:null,payment_method:'online',payment_state:'pending'};
describe('staff order workflow',()=>{
  it('keeps cancelled paid orders in financial review without reopening preparation',()=>{
    const incident={...base,status:'cancelled',payment_state:'paid',financial_attention_at:new Date().toISOString()};
    expect(needsAcknowledgement(incident)).toBe(true);
    expect(actionsFor(incident)).toEqual(['acknowledge_financial']);
    const acknowledged={...incident,financial_acknowledged_at:new Date().toISOString()};
    expect(needsAcknowledgement(acknowledged)).toBe(false);expect(needsFinancialResolution(acknowledged)).toBe(true);
    expect(actionsFor(acknowledged)).toEqual([]);
    expect(needsFinancialResolution({...acknowledged,payment_state:'refunded',financial_resolved_at:new Date().toISOString()})).toBe(false);
  });
  it('offers audited manual financial resolution without operational actions',()=>{
    const incident={...base,status:'cancelled',payment_method:'transfer',payment_state:'paid',financial_attention_at:new Date().toISOString()};
    expect(actionsFor(incident)).toEqual(['acknowledge_financial','resolve_financial']);
  });
  it('keeps online pending/rejected orders out of acceptance and alerts',()=>{
    for(const payment_state of ['pending','rejected']){const order={...base,payment_state};expect(needsAcknowledgement(order)).toBe(false);expect(actionsFor(order)).not.toContain('accept');}
  });
  it('alerts after verified payment and separates acknowledgement from acceptance',()=>{
    const paid={...base,payment_state:'paid',actionable_at:new Date().toISOString()};
    expect(needsAcknowledgement(paid)).toBe(true);expect(actionsFor(paid)).toContain('accept');
    const acknowledged={...paid,acknowledged_at:new Date().toISOString()};expect(needsAcknowledgement(acknowledged)).toBe(false);expect(actionsFor(acknowledged)).toContain('accept');
  });
  it('cash and transfer are actionable without assuming payment',()=>{
    for(const payment_method of ['cash','transfer'])expect(needsAcknowledgement({...base,payment_method,payment_state:'unpaid',actionable_at:new Date().toISOString()})).toBe(true);
  });
  it('offers an explicit path for pending legacy orders without inferring payment',()=>{
    expect(actionsFor({...base,payment_method:'legacy',payment_state:'unknown',actionable_at:null})).toContain('accept_legacy');
    expect(actionsFor({...base,payment_method:'legacy',payment_state:'unknown',actionable_at:new Date().toISOString()})).not.toContain('accept_legacy');
  });
  it('blocks preparation after a refund',()=>{expect(actionsFor({...base,status:'confirmed',payment_state:'refunded'})).not.toContain('prepare');});
  it('offers only the next operational step',()=>{
    expect(actionsFor({...base,status:'confirmed',payment_state:'paid'})).toEqual(['prepare','resolve','cancel']);
    expect(actionsFor({...base,status:'preparing',payment_state:'paid'})).toEqual(['ready','resolve','cancel']);
    expect(actionsFor({...base,status:'ready',payment_state:'paid'})).toEqual(['complete','resolve','cancel']);
    expect(actionsFor({...base,status:'delivered'})).toEqual([]);
  });
});
