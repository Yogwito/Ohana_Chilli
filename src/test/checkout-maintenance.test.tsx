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
describe('orderApi maintenance errors',()=>{
  it('maps orders_disabled 503 JSON ({code,message}) to a maintenance error',async()=>{
    mocks.fetch.mockResolvedValue({ok:false,status:503,json:async()=>({code:'orders_disabled',message:'x'})});
    const error=(await orderApi('quote',{}).catch(e=>e)) as OrderApiError;
    expect(isMaintenanceError(error)).toBe(true);expect(error.code).toBe('orders_disabled');expect(error.message).toMatch(/mantenimiento/);
  });
  it('treats a bare or non-JSON 503 as temporary unavailability',async()=>{
    mocks.fetch.mockResolvedValue({ok:false,status:503,json:async()=>{throw new Error('html');}});
    const error=await orderApi('create',{}).catch(e=>e);
    expect(error).toBeInstanceOf(OrderApiError);expect(isMaintenanceError(error)).toBe(true);
  });
  it('does not treat other 503 codes as maintenance',async()=>{
    mocks.fetch.mockResolvedValue({ok:false,status:503,json:async()=>({error:'rate_limit_unavailable'})});
    expect(isMaintenanceError(await orderApi('quote',{}).catch(e=>e))).toBe(false);
  });
});
describe('checkout with orders disabled',()=>{
  it('shows maintenance, blocks submit, keeps the cart and stores no recovery attempt',async()=>{
    mocks.fetch.mockResolvedValue({ok:false,status:503,json:async()=>({code:'orders_disabled',message:'Pedidos desactivados'})});
    render(<MemoryRouter initialEntries={['/checkout']}><Routes><Route path="/checkout" element={<CheckoutPage/>}/></Routes></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Nombre completo'),{target:{value:'Ana Pérez'}});
    fireEvent.change(screen.getByLabelText('Teléfono'),{target:{value:'3001234567'}});
    fireEvent.click(screen.getByText('Recoger en tienda'));
    fireEvent.click(screen.getByRole('checkbox'));
    const submit=screen.getByRole('button',{name:'Crear pedido y abrir WhatsApp'});
    await waitFor(()=>expect(submit).toBeEnabled());
    fireEvent.click(submit);
    expect((await screen.findAllByText(/mantenimiento/)).length).toBeGreaterThan(0);
    expect(screen.getByRole('button',{name:'En mantenimiento'})).toBeDisabled();
    expect(mocks.clearCart).not.toHaveBeenCalled();
    expect(mocks.cart.items).toHaveLength(1);
    expect(getPendingCheckout()).toBeNull();
    expect(screen.queryByRole('button',{name:'Verificar pedido anterior'})).toBeNull();
  });
});
