import {expect,it} from 'vitest';
import {formatOrderReceiptMessage} from '@/domain/orderReceipt';
it('formats the persisted receipt after canonical repricing, including extras and independent payment state',()=>{
 const message=formatOrderReceiptMessage({total:31900,delivery_fee:3000,delivery_zone:'Zona',items:[{name:'Bowl canónico',quantity:1,unit_price_cents:28900,details:{bases:['Arroz'],extras:[{name:'Pollo',quantity:1,unit_price_cents:5000}]}}]}, {id:'abcdefgh-test',name:'Cliente',phone:'3001234567',orderType:'delivery',address:'Dirección',paymentMethod:'online'});
 expect(message).toContain('Bowl canónico');expect(message).toContain('28.900');expect(message).toContain('31.900');expect(message).toContain('5.000');expect(message).toContain('En línea · consulta el estado');expect(message).not.toContain('Pagado');
});
