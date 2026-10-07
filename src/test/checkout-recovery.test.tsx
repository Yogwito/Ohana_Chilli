import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import { webcrypto } from 'node:crypto';
const mocks=vi.hoisted(()=>({fetch:vi.fn(),clearCart:vi.fn(),cart:{items:[],subtotal:0,total:0}}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{auth:{getSession:async()=>({data:{session:null}})}}}));
vi.mock('@/context/CartContext',()=>({useCart:()=>({cart:mocks.cart,clearCart:mocks.clearCart,updateQuantity:vi.fn(),removeItem:vi.fn()})}));
vi.mock('@/hooks/use-mobile',()=>({useIsMobile:()=>true}));
vi.mock('@/hooks/use-catalog',()=>({useProducts:()=>({}),useIngredients:()=>({}),useBowlRules:()=>({}),usePromotions:()=>({}),useBusinessSettings:()=>({data:{whatsappNumber:'573001234567'}}),useBusinessOpenStatus:()=>({isClosed:false}),useActiveDeliveryZones:()=>({data:[]})}));
vi.mock('@/components/checkout/BotProtection',()=>({default:function MockBotProtection({onToken}:{onToken:(token:string)=>void}){useEffect(()=>onToken('bot-fixture'),[onToken]);return null;}}));
vi.mock('@/components/ui/AnimatedElement',()=>({AnimatedElement:({children}:{children:React.ReactNode})=><div>{children}</div>}));
import CheckoutPage from '@/pages/CheckoutPage';
import { checkoutAttempt, getPendingCheckout } from '@/lib/orderApi';
const request={customer_name:'Nombre original',phone:'3001234567',order_type:'pickup',payment_method:'cash',items:[{type:'product',product_id:'original',quantity:1,notes:'',removed:[],extras:[]}]};
const originalCart={items:[{id:'cart',type:'product',brand:'ohana',quantity:1,unitPrice:10000,totalPrice:10000,product:{id:'original',name:'Producto',price:10000,categoryId:'category',brand:'ohana',description:''}}],subtotal:10000,total:10000};
function mount(){return render(<MemoryRouter initialEntries={['/checkout']}><Routes><Route path="/checkout" element={<CheckoutPage/>}/><Route path="/pedido/:token" element={<p>Seguimiento recuperado</p>}/></Routes></MemoryRouter>);}
beforeEach(()=>{cleanup();sessionStorage.clear();localStorage.clear();vi.stubGlobal('crypto',webcrypto);vi.stubGlobal('fetch',mocks.fetch);vi.stubGlobal('AbortSignal',{timeout:()=>undefined});mocks.fetch.mockReset();mocks.clearCart.mockReset();mocks.cart={items:[],subtotal:0,total:0};});
describe('uncertain checkout recovery after reload',()=>{
  it('serializes rapid verify and resend clicks before React commits disabled controls',async()=>{
    await checkoutAttempt(request,'quote');
    let resolveTrack: (value: unknown) => void;
    mocks.fetch.mockImplementation(()=>new Promise(resolve=>{resolveTrack=resolve;}));
    mount();
    act(()=>{
      fireEvent.click(screen.getByRole('button',{name:'Verificar pedido anterior'}));
      fireEvent.click(screen.getByRole('button',{name:'Reenviar solicitud original'}));
      fireEvent.click(screen.getByRole('button',{name:'Verificar pedido anterior'}));
    });
    await waitFor(()=>expect(mocks.fetch).toHaveBeenCalledTimes(1));
    resolveTrack({ok:true,json:async()=>({status:'pending'})});
    await screen.findByText('Seguimiento recuperado');
    expect(mocks.fetch.mock.calls[0][0]).toMatch(/\/track$/);
  });
  it('shows recovery even with an empty cart, retains identity on missing tracking, and resends exactly once with original data',async()=>{
    const original=await checkoutAttempt(request,'original-quote');
    mocks.fetch.mockResolvedValueOnce({ok:false,json:async()=>({error:'tracking_not_found'})}).mockRejectedValueOnce(new Error('network uncertainty'));
    const firstMount=mount();
    fireEvent.click(screen.getByRole('button',{name:'Verificar pedido anterior'}));
    await screen.findByText(/El pedido aún no aparece/);
    fireEvent.click(screen.getByRole('button',{name:'Reenviar solicitud original'}));
    await screen.findByText(/No pudimos confirmar el resultado/);
    expect(getPendingCheckout().key).toBe(original.key);
    firstMount.unmount();mount(); // a refresh creates a fresh Checkout instance
    mocks.fetch.mockResolvedValueOnce({ok:true,json:async()=>({id:'persisted-order'})});
    fireEvent.click(screen.getByRole('button',{name:'Reenviar solicitud original'}));
    await screen.findByText('Seguimiento recuperado');
    const creates=mocks.fetch.mock.calls.filter(([url])=>url.endsWith('/create'));
    expect(creates).toHaveLength(2);
    for(const [,options] of creates){const body=JSON.parse(options.body);expect(body.request).toEqual(request);expect(body.idempotency_key).toBe(original.key);expect(body.tracking_token).toBe(original.token);expect(body.quote).toBe('original-quote');}
    expect(sessionStorage.getItem('ohana-pending-order:v1')).toBeNull();
  });
  it('restores customer fields after reload and never uses later edits for original-request recovery',async()=>{
    const original=await checkoutAttempt(request,'quote');
    Object.assign(mocks.cart,{items:[{id:'cart',type:'product',brand:'ohana',quantity:1,unitPrice:10000,totalPrice:10000,product:{id:'original',name:'Producto',price:10000,categoryId:'category',brand:'ohana',description:''}}],subtotal:10000});
    mocks.fetch.mockResolvedValue({ok:true,json:async()=>({id:'persisted'})});mount();
    expect(screen.getByLabelText('Nombre completo')).toHaveValue('Nombre original');expect(screen.getByLabelText('Teléfono')).toHaveValue('3001234567');
    fireEvent.change(screen.getByLabelText('Nombre completo'),{target:{value:'Nombre cambiado'}});
    expect(screen.getByRole('button',{name:'Crear pedido y abrir WhatsApp'})).toBeDisabled();
    fireEvent.click(screen.getByRole('button',{name:'Reenviar solicitud original'}));
    await screen.findByText('Seguimiento recuperado');
    const body=JSON.parse(mocks.fetch.mock.calls[0][1].body);expect(body.request.customer_name).toBe('Nombre original');expect(body.idempotency_key).toBe(original.key);
  });
  it('requires explicit review of a changed quote while keeping the same request identity',async()=>{
    const original=await checkoutAttempt(request,'old-quote');
    mocks.fetch.mockResolvedValueOnce({ok:false,json:async()=>({error:'quote_changed'})})
      .mockResolvedValueOnce({ok:true,json:async()=>({fingerprint:'new-quote',total:12000,subtotal:12000,delivery_fee:0,items:[{name:'Producto actualizado',quantity:1,unit_price_cents:12000}]})})
      .mockResolvedValueOnce({ok:true,json:async()=>({id:'persisted'})});
    mount();fireEvent.click(screen.getByRole('button',{name:'Reenviar solicitud original'}));
    await screen.findByText(/El presupuesto original cambió/);
    expect(getPendingCheckout().quote).toBe('old-quote');
    fireEvent.click(screen.getByRole('button',{name:'Aceptar presupuesto para la solicitud original'}));
    await waitFor(()=>expect(getPendingCheckout().quote).toBe('new-quote'));
    fireEvent.click(screen.getByRole('button',{name:'Reenviar solicitud original'}));
    await screen.findByText('Seguimiento recuperado');
    const creates=mocks.fetch.mock.calls.filter(([url])=>url.endsWith('/create'));
    expect(JSON.parse(creates[1][1].body)).toMatchObject({request,quote:'new-quote',idempotency_key:original.key,tracking_token:original.token});
  });
  it('recovers a committed order by tracking without making another create request',async()=>{
    const pending=await checkoutAttempt(request,'quote');mocks.cart=structuredClone(originalCart);mocks.fetch.mockResolvedValue({ok:true,json:async()=>({status:'pending'})});mount();
    fireEvent.click(screen.getByRole('button',{name:'Verificar pedido anterior'}));
    await screen.findByText('Seguimiento recuperado');expect(mocks.fetch).toHaveBeenCalledTimes(1);expect(mocks.fetch.mock.calls[0][0]).toMatch(/\/track$/);
    expect(mocks.clearCart).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('ohana-tracking-links:v1'))).toContain(`${window.location.origin}/pedido/${pending.token}`);
  });
  it.each(['track','create'])('preserves later cart edits after successful %s recovery',async(route)=>{
    await checkoutAttempt(request,'quote');mocks.cart=structuredClone(originalCart);mocks.cart.items[0].quantity=2;
    mocks.fetch.mockResolvedValue({ok:true,json:async()=>({status:'pending',id:'persisted'})});mount();
    fireEvent.click(screen.getByRole('button',{name:route==='track'?'Verificar pedido anterior':'Reenviar solicitud original'}));
    await screen.findByText('Seguimiento recuperado');expect(mocks.clearCart).not.toHaveBeenCalled();
    expect(mocks.cart.items[0].quantity).toBe(2);
  });
});
