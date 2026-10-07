import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { orderApi } from '@/lib/orderApi';
import { orderStatuses, paymentStates } from '@/domain/orderWorkflow';
import { formatPrice } from '@/domain/formatPrice';
import { useBusinessSettings } from '@/hooks/use-catalog';
import { buildPlatformWhatsAppUrl } from '@/domain/whatsapp';
import { Button } from '@/components/ui/button';
interface Tracking {
  reference:string; status:string; payment_state:string; payment_method:string; total:number; delivery_fee:number;
  created_at:string; refund_state:string|null; items:{name:string;quantity:number;unit_price_cents:number}[];
}
export default function OrderTrackingPage() {
  const { token = '' } = useParams();
  const { data: settings } = useBusinessSettings();
  const [paymentError,setPaymentError] = useState('');
  const [paying,setPaying] = useState(false);
  const query = useQuery({ queryKey:['private-order',token],queryFn:()=>orderApi<Tracking>('track',{token}),
    enabled:/^[a-f0-9]{64}$/.test(token),refetchInterval:15000,refetchIntervalInBackground:false,staleTime:0,retry:1 });
  const pay = async () => {
    setPaying(true);setPaymentError('');
    try {const payment=await orderApi<{url:string}>('payment',{token});window.location.assign(payment.url);}
    catch(error) {setPaymentError(error instanceof Error ? error.message : 'No pudimos iniciar el pago.');setPaying(false);}
  };
  const order=query.data;
  return <main className="mx-auto min-h-screen max-w-xl px-4 py-10 space-y-6">
    <Helmet><title>Seguimiento privado · Ohana</title><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>
    <h1 className="text-3xl font-bold">Tu pedido</h1>
    <p className="text-sm text-muted-foreground">Este enlace es privado y vence a los 30 días. Guarda el enlace para volver.</p>
    {query.isLoading && <p role="status">Consultando el estado…</p>}
    {(query.error || !/^[a-f0-9]{64}$/.test(token)) && <p role="alert">{query.error instanceof Error ? query.error.message : 'El enlace no es válido.'}</p>}
    {order && <>
      <div className="rounded-xl border p-5 space-y-3" aria-live="polite">
        <p className="font-mono">#{order.reference.toUpperCase()}</p>
        <h2 className="text-xl font-semibold">{orderStatuses[order.status] || order.status}</h2>
        {order.status==='pending' && <p>El equipo debe aceptar tu pedido antes de empezar a prepararlo.</p>}
        <p>{paymentStates[order.payment_state] || order.payment_state}</p>
        {order.refund_state && <p>Reembolso: {({requested:'Solicitado',processing:'En proceso',completed:'Completado',failed:'Fallido'})[order.refund_state]}</p>}
        {query.isError && <p className="text-destructive">No pudimos actualizar el estado. Reintentando…</p>}
      </div>
      <section className="rounded-xl border p-5 space-y-3"><h2 className="font-semibold">Recibo del pedido</h2>
        {order.items?.map((item,index)=><div key={index} className="flex justify-between gap-3"><span>{item.quantity} × {item.name}</span><span>{formatPrice(item.quantity*item.unit_price_cents)}</span></div>)}
        <p>Domicilio: {formatPrice(order.delivery_fee)}</p><p className="font-bold">Total: {formatPrice(order.total)}</p>
      </section>
      {import.meta.env.VITE_ONLINE_PAYMENTS_ENABLED==='true' && order.payment_method==='online' && ['pending','rejected'].includes(order.payment_state) && order.status==='pending' && <Button className="w-full" disabled={paying} onClick={pay}>{paying?'Abriendo pago…':'Continuar pago en Wompi (sandbox)'}</Button>}
      {paymentError && <p role="alert" className="text-destructive">{paymentError}</p>}
      {settings?.whatsappNumber && <Button asChild variant="outline" className="w-full"><a href={buildPlatformWhatsAppUrl(settings.whatsappNumber,`Hola, quiero consultar mi pedido #${order.reference.toUpperCase()}`).url} target="_blank" rel="noopener noreferrer">Contactar por WhatsApp</a></Button>}
    </>}
  </main>;
}
