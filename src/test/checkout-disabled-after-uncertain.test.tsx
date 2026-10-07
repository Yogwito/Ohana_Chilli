import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { webcrypto } from 'node:crypto';
const mocks=vi.hoisted(()=>({fetch:vi.fn(),clearCart:vi.fn(),cart:{items:[],subtotal:0,total:0}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:async()=>({data:{session:null}})}}}));
vi.mock('@/context/CartContext',()=>({useCart:()=>({cart:mocks.cart,clearCart:mocks.clearCart,updateQuantity:vi.fn(),removeItem:vi.fn()})}));
vi.mock('@/hooks/use-mobile',()=>({useIsMobile:()=>true}));
vi.mock('@/hooks/use-catalog',()=>({useProducts:()=>({refetch:async()=>({data:[]})}),useIngredients:()=>({refetch:async()=>({data:[]})}),useBowlRules:()=>({refetch:async()=>({data:[]})}),usePromotions:()=>({refetch:async()=>({data:[]})}),useBusinessSettings:()=>({data:{whatsappNumber:'573001234567'}}),useBusinessOpenStatus:()=>({isClosed:false}),useActiveDeliveryZones:()=>({data:[]})}));
vi.mock('@/components/checkout/BotProtection',()=>({default:function MockBotProtection({onToken}:{onToken:(token:string)=>void}){useEffect(()=>onToken('bot-fixture'),[onToken]);return null;}}));
vi.mock('@/components/ui/AnimatedElement',()=>({AnimatedElement:({children}:{children:React.ReactNode})=><div>{children}</div>}));
vi.mock('@/domain/cartCatalogSync',async(orig)=>({...(await orig<object>()),reconcileCartWithCatalog:(cart:unknown)=>cart}));
import CheckoutPage from '@/pages/CheckoutPage';
import { OrderApiError, orderApi, isMaintenanceError, getPendingCheckout } from '@/lib/orderApi';
const item={id:'cart',type:'product',brand:'ohana',quantity:1,unitPrice:10000,totalPrice:10000,product:{id:'p1',name:'Producto',price:10000,categoryId:'c',brand:'ohana',description:''}};
beforeEach(()=>{cleanup();sessionStorage.clear();localStorage.clear();vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',mocks.fetch);vi.stubGlobal('AbortSignal',{timeout:()=>undefined});mocks.fetch.mockReset();mocks.clearCart.mockReset();mocks.cart={items:[structuredClone(item)],subtotal:10000,total:10000};});
const quoteOk={fingerprint:'q1',total:10000,subtotal:10000,delivery_fee:0,items:[{name:'Producto',quantity:1,unit_price_cents:10000}]};
const disabled={ok:false,status:503,json:async()=>({error:'orders_disabled',code:'orders_disabled',message:'Pedidos desactivados'})};
const creates=()=>mocks.fetch.mock.calls.filter(([url])=>String(url).endsWith('/create'));
function mount(){return render(<MemoryRouter initialEntries={['/checkout']}><Routes><Route path="/checkout" element={<CheckoutPage/>}/><Route path="/pedido/:token" element={<p>Seguimiento recuperado</p>}/></Routes></MemoryRouter>);}
async function fillAndSubmit(){
  fireEvent.change(screen.getByLabelText('Nombre completo'),{target:{value:'Ana Pérez'}});
  fireEvent.change(screen.getByLabelText('Teléfono'),{target:{value:'3001234567'}});
  fireEvent.click(screen.getByText('Recoger en tienda'));
  fireEvent.click(screen.getByRole('checkbox'));
  const submit=screen.getByRole('button',{name:'Crear pedido y abrir WhatsApp'});
  await waitFor(()=>expect(submit).toBeEnabled());
  fireEvent.click(submit);
}
describe('orders_disabled after an uncertain create',()=>{
  it('keeps the pending attempt and identity through maintenance, then retries with the same key after re-enable',async()=>{
    let enabled=true;
    mocks.fetch.mockImplementation(async(url:string)=>{
      if(!enabled) return disabled;
      if(url.endsWith('/quote')) return {ok:true,json:async()=>quoteOk};
      if(url.endsWith('/create')) throw new Error('network abort');
      return {ok:true,json:async()=>({})};
    });
    mount();await fillAndSubmit();
    await screen.findByRole('button',{name:'Reenviar solicitud original'});
    const original=getPendingCheckout();expect(original?.key).toBeTruthy();expect(original?.request).toBeTruthy();
    // Backend kill switch flips on; user retries the original request.
    enabled=false;
    await waitFor(()=>expect(screen.getByRole('button',{name:'Reenviar solicitud original'})).toBeEnabled());
    fireEvent.click(screen.getByRole('button',{name:'Reenviar solicitud original'}));
    expect((await screen.findAllByText(/mantenimiento/)).length).toBeGreaterThan(0);
    expect(getPendingCheckout()).toMatchObject({key:original.key,token:original.token});
    expect(screen.queryByText('Seguimiento recuperado')).toBeNull();
    expect(mocks.clearCart).not.toHaveBeenCalled();expect(mocks.cart.items).toHaveLength(1);
    expect(screen.getByRole('button',{name:'Verificar pedido anterior'})).toBeInTheDocument();
    // Backend re-enabled: same identity and same request, no duplicate.
    enabled=true;
    mocks.fetch.mockImplementation(async(url:string)=>({ok:true,json:async()=>(url.endsWith('/create')?{id:'order-1'}:quoteOk)}));
    fireEvent.click(screen.getByRole('button',{name:'Reenviar solicitud original'}));
    await screen.findByText('Seguimiento recuperado');
    const sent=creates().map(([,o])=>JSON.parse(o.body));
    expect(sent.length).toBeGreaterThanOrEqual(2);
    for(const b of sent){expect(b.idempotency_key).toBe(original.key);expect(b.tracking_token).toBe(original.token);expect(b.request).toEqual(original.request);expect(b.quote).toBe(original.quote);}
    expect(getPendingCheckout()).toBeNull();
  });
  it('a FRESH attempt rejected with orders_disabled leaves no pending attempt',async()=>{
    mocks.fetch.mockImplementation(async(url:string)=>url.endsWith('/quote')?{ok:true,json:async()=>quoteOk}:disabled);
    mount();
    fireEvent.change(screen.getByLabelText('Nombre completo'),{target:{value:'Ana Pérez'}});
    fireEvent.change(screen.getByLabelText('Teléfono'),{target:{value:'3001234567'}});
    fireEvent.click(screen.getByText('Recoger en tienda'));fireEvent.click(screen.getByRole('checkbox'));
    // First submit rejected as a fresh attempt: nothing stored.
    fireEvent.click(await screen.findByRole('button',{name:'Crear pedido y abrir WhatsApp'}));
    expect((await screen.findAllByText(/mantenimiento/)).length).toBeGreaterThan(0);
    expect(getPendingCheckout()).toBeNull();
  });
});
