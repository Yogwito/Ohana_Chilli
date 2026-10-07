import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { orderDb } from '@/lib/orderDb';
import { orderApi } from '@/lib/orderApi';
import { actionsFor, needsFinancialResolution, orderStatuses, paymentStates, type OrderAction, type StaffOrder } from '@/domain/orderWorkflow';
import { formatPrice } from '@/domain/formatPrice';
import { buildPlatformWhatsAppUrl } from '@/domain/whatsapp';
import { useOrderAlerts } from '@/hooks/use-order-alerts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
const eventLabels:Record<string,string>={financial_attention_required:'Revisión financiera requerida',acknowledge_financial:'Incidencia financiera reconocida',resolve_financial:'Acuerdo financiero manual registrado',financial_resolution_verified:'Resolución financiera verificada',created:'Pedido creado',acknowledge:'Reconocido',accept_legacy:'Pedido histórico aceptado',accept:'Aceptado',prepare:'Preparación iniciada',ready:'Listo',complete:'Completado',resolve:'Solución registrada',cancel:'Cancelado',record_payment:'Pago manual verificado',payment_started:'Pago iniciado',payment_paid:'Pago verificado',payment_rejected:'Pago rechazado',refund_requested:'Reembolso solicitado',refund_processing:'Reembolso en proceso',refund_completed:'Reembolso completado',refund_failed:'Reembolso fallido',refund_review_required:'Reembolso requiere revisión'};
const actionLabels:Record<OrderAction,string>={acknowledge_financial:'Reconocer incidencia financiera',resolve_financial:'Registrar resolución financiera manual',acknowledge:'Reconocer',accept_legacy:'Aceptar pedido histórico',accept:'Aceptar pedido',prepare:'Iniciar preparación',ready:'Marcar listo',complete:'Completar',resolve:'Registrar solución',cancel:'Cancelar pedido',record_payment:'Confirmar pago manual'};
interface Item {id:string;name:string;quantity:number;unit_price_cents:number;details:Record<string,unknown>;}
interface Event {id:string;actor_id:string|null;kind:string;created_at:string;data:Record<string,unknown>;}
function Recipe({details}:{details:Record<string,unknown>}) {
  const sections=['size','recipe','bases','proteins','acompanantes','sauces','complementos','removed'];
  const labels={size:'Tamaño',recipe:'Receta',bases:'Bases',proteins:'Proteínas',acompanantes:'Acompañantes',sauces:'Salsas',complementos:'Complementos',removed:'Sin'};
  return <div className="space-y-1 text-sm">
    {sections.map(key=>{const value=details[key];return value && (Array.isArray(value)?value.length:true)?<p key={key}><strong>{labels[key]}:</strong> {Array.isArray(value)?value.join(', '):String(value)}</p>:null;})}
    {Array.isArray(details.extras)&&details.extras.map((extra,index)=><p key={index}>Extra: {extra.quantity} × {extra.name} · {formatPrice(extra.unit_price_cents||0)}</p>)}
    {details.notes && <p>Nota: {String(details.notes)}</p>}
    {details.customizations && <pre className="whitespace-pre-wrap text-xs">Personalización histórica: {JSON.stringify(details.customizations,null,2)}</pre>}
  </div>;
}
export default function OrdersDashboard() {
  const {refresh}=useOrderAlerts();
  const [queue,setQueue]=useState('pending');const [payment,setPayment]=useState('all');const [search,setSearch]=useState('');const [page,setPage]=useState(0);
  const [selected,setSelected]=useState<StaffOrder|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [note,setNote]=useState('');const [message,setMessage]=useState('');const [refundConfirm,setRefundConfirm]=useState(false);
  const list=useQuery({queryKey:['staff-orders',queue,payment,search,page],queryFn:async()=>{
    let query=orderDb.from('orders').select('*',{count:'exact'}).order('created_at',{ascending:false}).range(page*25,page*25+24);
    if(queue==='financial')query=query.not('financial_attention_at','is',null).is('financial_resolved_at',null);
    else if(queue!=='all')query=query.eq('status',queue);
    if(payment!=='all')query=query.eq('payment_state',payment);
    const term=search.replace(/[^\p{L}\p{N} +@.-]/gu,'').trim();
    if(term){if(/^[a-f0-9-]{36}$/i.test(term))query=query.eq('id',term);else query=query.or(`customer_name.ilike.%${term}%,phone.ilike.%${term}%`);}
    const {data,error,count}=await query;if(error)throw error;return{orders:(data||[]) as StaffOrder[],count:count||0};
  },refetchInterval:15000,staleTime:0});
  const detail=useQuery({queryKey:['order-detail',selected?.id],enabled:!!selected,queryFn:async()=>{
    const [order,items,events,refunds]=await Promise.all([
      orderDb.from('orders').select('*').eq('id',selected!.id).single(),
      orderDb.from('order_items').select('*').eq('order_id',selected!.id),
      orderDb.from('order_events').select('*').eq('order_id',selected!.id).order('created_at'),
      orderDb.from('order_refunds').select('id,state,reason,amount_cop,error_code').eq('order_id',selected!.id),
    ]);
    for(const result of [order,items,events,refunds])if(result.error)throw result.error;
    return {order:order.data as StaffOrder,items:(items.data||[]) as Item[],events:(events.data||[]) as Event[],refunds:refunds.data||[]};
  },refetchInterval:15000,staleTime:0});
  const current=detail.data?.order||selected;
  const action=async(action:OrderAction)=>{
    if(!current)return;
    setBusy(true);setError('');
    try {await orderApi('action',{id:current.id,version:current.version,action,note});setNote('');refresh();await detail.refetch();}
    catch(error){setError(error instanceof Error?error.message:'No se guardó el cambio.');await detail.refetch();}
    finally{setBusy(false);}
  };
  const refund=async()=>{
    if(!current)return;setBusy(true);setError('');
    try{await orderApi('refund',{id:current.id,version:current.version,reason:note});setRefundConfirm(false);refresh();await detail.refetch();}
    catch(error){setError(error instanceof Error?error.message:'No se confirmó el reembolso.');await detail.refetch();}
    finally{setBusy(false);}
  };
  return <section className="space-y-4">
    <h2 className="sr-only">Colas de pedidos</h2>
    <div className="admin-order-queues" aria-label="Colas de pedidos">
      {[...Object.entries(orderStatuses),['financial','Revisión financiera'],['all','Todos']].map(([value,label])=><Button key={value} aria-pressed={queue===value} variant={queue===value?'default':'outline'} onClick={()=>{setQueue(value);setPage(0);}}>{label}</Button>)}
    </div>
    <div className="flex flex-wrap gap-3">
      <Input aria-label="Buscar por nombre, teléfono o ID completo" placeholder="Nombre, teléfono o ID completo" value={search} onChange={e=>{setSearch(e.target.value);setPage(0);}} className="max-w-sm" />
      <select aria-label="Filtrar pago" value={payment} onChange={e=>{setPayment(e.target.value);setPage(0);}} className="rounded-md border bg-background p-2"><option value="all">Todos los pagos</option>{Object.entries(paymentStates).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select>
      <Button variant="outline" onClick={()=>{refresh();list.refetch();}}>Actualizar</Button>
    </div>
    {list.isError&&<p role="alert" className="text-destructive">No se pudieron consultar los pedidos. Verifica la conexión y vuelve a intentar.</p>}
    {list.isLoading&&<p role="status">Cargando pedidos…</p>}
    {list.data?.orders.length===0&&<p>No hay pedidos en esta cola.</p>}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {list.data?.orders.map(order=><button key={order.id} onClick={()=>{setSelected(order);setError('');setNote('');setMessage(`Hola ${order.customer_name}, te contactamos por tu pedido #${order.id.slice(0,8).toUpperCase()}.`);setRefundConfirm(false);}} data-status={order.status} className="admin-order-card rounded-xl border bg-card p-5 text-left space-y-3 focus-visible:ring-2 focus-visible:ring-primary">
        <div className="flex justify-between gap-2"><strong>#{order.id.slice(0,8).toUpperCase()}</strong><span>{formatPrice(order.total_cents)}</span></div>
        <p>{order.customer_name}</p><p className="admin-order-status">{orderStatuses[order.status]} · {order.order_type==='delivery'?'Domicilio':'Recoger'}</p>
        <p className="text-sm font-medium">{paymentStates[order.payment_state]||'Pago histórico desconocido'}</p>
        {needsFinancialResolution(order)&&<p className="admin-order-attention font-bold">Pedido cancelado con pago recibido · resolución financiera pendiente{!order.financial_acknowledged_at?' · Sin reconocer':''}</p>}
        <p className="text-xs text-muted-foreground">{Math.max(0,Math.floor((Date.now()-new Date(order.created_at).getTime())/60000))} min · {new Date(order.created_at).toLocaleString('es-CO')}</p>
        {order.status==='pending'&&order.actionable_at&&!order.acknowledged_at&&<p className="admin-order-attention font-bold">Sin reconocer</p>}
      </button>)}
    </div>
    <div className="flex items-center gap-3"><Button variant="outline" disabled={page===0} onClick={()=>setPage(p=>p-1)}>Anterior</Button><span>Página {page+1} · {list.data?.count||0} pedidos</span><Button variant="outline" disabled={(page+1)*25>=(list.data?.count||0)} onClick={()=>setPage(p=>p+1)}>Siguiente</Button></div>
    <Dialog open={!!selected} onOpenChange={open=>{if(!open&&!busy)setSelected(null);}}>
      <DialogContent className="admin-order-detail max-w-3xl max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Pedido #{current?.id.slice(0,8).toUpperCase()}</DialogTitle><DialogDescription>Receta original, estado y registro de acciones</DialogDescription></DialogHeader>
        {current&&<>
          <div className="admin-detail-section"><p className="admin-detail-label">Cliente y entrega</p><p>{current.customer_name} · {current.phone}</p><p>{current.address} {current.delivery_zone}</p>
          <p>{current.notes}</p><strong>{orderStatuses[current.status]} · {paymentStates[current.payment_state]}</strong></div><p className="admin-detail-label">Receta original</p>
          {detail.isLoading&&<p>Cargando receta…</p>}{detail.isError&&<p role="alert" className="text-destructive">No se pudieron cargar los detalles. Las acciones están deshabilitadas.</p>}
          {detail.data?.items.map(item=><article key={item.id} className="rounded-lg border p-3"><h3 className="font-bold">{item.quantity} × {item.name} · {formatPrice(item.quantity*item.unit_price_cents)}</h3><Recipe details={item.details||{}} /></article>)}
          <p>Domicilio: {formatPrice(current.delivery_fee_cents)} · Total: <strong>{formatPrice(current.total_cents)}</strong></p>
          {needsFinancialResolution(current)&&<p role="alert" className="font-bold">El pedido sigue cancelado. Reconocer detiene la alerta, pero no resuelve el dinero. {current.payment_method==='online'?'La incidencia se cerrará cuando el proveedor confirme el reembolso.':'Registra el acuerdo financiero manual con su evidencia; el estado de pago se conserva.'}</p>}<div className="admin-detail-actions space-y-3"><p className="admin-detail-label">Gestionar pedido</p><label className="block space-y-2">Solución acordada o motivo (obligatorio al cancelar o reembolsar)<Textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={500} placeholder="Describe el acuerdo. La receta y el monto original se conservan." /></label>
          {error&&<p role="alert" className="text-destructive">{error}</p>}
          <div className="flex flex-wrap gap-2">{actionsFor(current).map(value=><Button key={value} variant={value==='cancel'?'destructive':['accept','accept_legacy','prepare','ready','complete'].includes(value)?'default':'outline'} disabled={busy||!detail.data||detail.isError||(['cancel','resolve','record_payment','resolve_financial','accept_legacy'].includes(value)&&note.trim().length<3)} onClick={()=>action(value)}>{actionLabels[value]}</Button>)}</div>
          </div>
          {current.payment_method==='online'&&current.payment_state==='paid'&&!detail.data?.refunds.length&&<Button variant="destructive" disabled={busy||!detail.data||detail.isError||note.trim().length<3} onClick={()=>setRefundConfirm(true)}>Reembolsar pago completo</Button>}
          {refundConfirm&&<div className="rounded-lg border border-destructive p-4 space-y-3"><strong>Confirmar reembolso del pedido #{current.id.slice(0,8).toUpperCase()} por {formatPrice(current.total_cents)}</strong><p>Motivo: {note}</p><p>Cancelar el pedido no devuelve el dinero. Esta acción solicita el reembolso completo al proveedor.</p><Button variant="destructive" disabled={busy} onClick={refund}>Confirmar reembolso</Button><Button variant="outline" disabled={busy} onClick={()=>setRefundConfirm(false)}>Volver</Button></div>}
          {detail.data?.refunds.map(r=><p key={r.id}>Reembolso: {({requested:'Solicitado',processing:'En proceso',completed:'Completado',failed:'Fallido'})[r.state]} · {formatPrice(r.amount_cop)}{r.error_code ? ' · Revisión requerida' : ''}</p>)}
          <div className="admin-detail-section"><p className="admin-detail-label">Contactar al cliente</p><label className="block space-y-2">Mensaje para el cliente<Textarea value={message} onChange={e=>setMessage(e.target.value)} /></label>
          <Button asChild variant="outline"><a href={buildPlatformWhatsAppUrl(current.phone.replace(/[^\d]/g,'').replace(/^(\d{10})$/,'57$1'),message).url} target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a></Button></div>
          <h3 className="admin-detail-section font-bold">Historial</h3>
          {detail.data?.events.map(event=><div key={event.id} className="border-t py-2 text-sm"><p>{eventLabels[event.kind] || 'Actualización del pedido'} · {new Date(event.created_at).toLocaleString('es-CO')}</p><p>{String(event.data.note||event.data.reason||'')}</p>{event.actor_id&&<p className="text-xs text-muted-foreground">Administrador: {event.actor_id}</p>}</div>)}
        </>}
      </DialogContent>
    </Dialog>
  </section>;
}
