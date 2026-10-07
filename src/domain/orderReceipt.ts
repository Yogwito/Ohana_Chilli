import { formatPrice } from './formatPrice';
export interface OrderReceipt {
  total:number;delivery_fee:number;delivery_zone:string|null;
  items:{name:string;quantity:number;unit_price_cents:number;details:Record<string,unknown>}[];
}
export function formatOrderReceiptMessage(receipt:OrderReceipt,customer:{id:string;name:string;phone:string;orderType:string;address?:string;notes?:string;paymentMethod:string}) {
  const lines=[`🥣 Pedido Ohana #${customer.id.slice(0,8).toUpperCase()}`,`Cliente: ${customer.name}`,`Teléfono: ${customer.phone}`,''];
  for(const item of receipt.items){
    lines.push(`${item.quantity} × ${item.name} — ${formatPrice(item.quantity*item.unit_price_cents)}`);
    for(const [key,label] of Object.entries({size:'Tamaño',recipe:'Receta',bases:'Bases',proteins:'Proteínas',acompanantes:'Acompañantes',sauces:'Salsas',complementos:'Complementos',removed:'Sin'})){
      const value=item.details[key];if(Array.isArray(value)&&value.length)lines.push(`${label}: ${value.join(', ')}`);else if(typeof value==='string'&&value)lines.push(`${label}: ${value}`);
    }
    if(Array.isArray(item.details.extras))for(const extra of item.details.extras)lines.push(`Extra: ${extra.quantity} × ${extra.name} (+${formatPrice(extra.unit_price_cents)} c/u)`);
    if(item.details.notes)lines.push(`Nota: ${String(item.details.notes)}`);
    lines.push('');
  }
  lines.push(customer.orderType==='pickup'?'Para recoger':`Domicilio: ${customer.address || ''} · ${receipt.delivery_zone || ''}`,
    `Domicilio: ${formatPrice(receipt.delivery_fee)}`,`Total: ${formatPrice(receipt.total)}`,
    `Pago: ${({cash:'Contra entrega',transfer:'Transferencia por verificar',online:'En línea · consulta el estado en el seguimiento'})[customer.paymentMethod]||'Por confirmar'}`);
  if(customer.notes)lines.push(`Notas: ${customer.notes}`);
  return lines.join('\n');
}
