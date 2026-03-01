import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useWhatsAppNumber } from '@/hooks/use-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  ArrowLeft, CheckCircle, Leaf, Flame, MapPin, Store, MessageCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';

const checkoutSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Ingresa un número de teléfono válido'),
  orderType: z.enum(['pickup', 'delivery']),
  address: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, clearCart } = useCart();
  const { data: whatsappNumber } = useWhatsAppNumber();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  
  const [form, setForm] = useState<CheckoutForm>({
    name: '', phone: '', orderType: 'pickup', address: '', notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});

  const updateField = <K extends keyof CheckoutForm>(field: K, value: CheckoutForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(price);

  const formatBowlSummary = (item: typeof cart.items[0]) => {
    if (!item.customBowl) return '';
    const bowl = item.customBowl;
    return `${bowl.size.name}: ${bowl.bases.map(b => b.name).join(', ')} + ${bowl.proteins.map(p => p.name).join(', ')} + ${bowl.acompanantes.map(a => a.name).join(', ')}`;
  };

  const generateWhatsAppMessage = () => {
    const lines = [
      `🛒 *Nueva Orden - Ohana & Chilli*`, '',
      `👤 *Cliente:* ${form.name}`,
      `📞 *Teléfono:* ${form.phone}`,
      `📍 *Tipo:* ${form.orderType === 'pickup' ? 'Recoger en sucursal' : 'Entrega a domicilio'}`,
    ];
    if (form.orderType === 'delivery' && form.address) {
      lines.push(`🏠 *Dirección:* ${form.address}`);
    }
    lines.push('', '*Productos:*');
    cart.items.forEach(item => {
      const brand = item.brand === 'ohana' ? '🥗' : '🍔';
      if (item.type === 'product' && item.product) {
        lines.push(`${brand} ${item.quantity}x ${item.product.name} - ${formatPrice(item.totalPrice)}`);
      } else if (item.type === 'custom-bowl' && item.customBowl) {
        lines.push(`${brand} 1x Bowl Personalizado - ${formatPrice(item.totalPrice)}`);
        lines.push(`   └ ${formatBowlSummary(item)}`);
      }
      if (item.notes) lines.push(`   └ Nota: ${item.notes}`);
    });
    lines.push('', `💰 *Total: ${formatPrice(cart.total)}*`);
    if (form.notes) lines.push('', `📝 *Notas:* ${form.notes}`);
    return encodeURIComponent(lines.join('\n'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CheckoutForm, string>> = {};
      result.error.errors.forEach(err => {
        fieldErrors[err.path[0] as keyof CheckoutForm] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    if (form.orderType === 'delivery' && !form.address) {
      setErrors({ address: 'La dirección es requerida para entregas a domicilio' });
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: form.name,
          phone: form.phone,
          order_type: form.orderType,
          address: form.address || null,
          notes: form.notes || null,
          total_cents: cart.total,
          status: 'pending',
        })
        .select('id')
        .single();

      if (orderError || !orderData) {
        console.error('Error saving order:', orderError);
        toast.error('Error al crear el pedido. Intenta de nuevo.');
        setIsSubmitting(false);
        return;
      }

      // 2. Create order items
      const orderItems = cart.items.map(item => ({
        order_id: orderData.id,
        brand_id: item.brand,
        name: item.type === 'product' ? (item.product?.name ?? 'Producto') : 'Bowl Personalizado',
        quantity: item.quantity,
        unit_price_cents: item.unitPrice,
        details: item.type === 'custom-bowl' && item.customBowl ? {
          size: item.customBowl.size.name,
          bases: item.customBowl.bases.map(b => b.name),
          proteins: item.customBowl.proteins.map(p => p.name),
          acompanantes: item.customBowl.acompanantes.map(a => a.name),
          notes: item.notes,
        } : { product_id: item.product?.id, notes: item.notes },
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) console.error('Error saving order items:', itemsError);

      // 3. Open WhatsApp
      const phone = whatsappNumber || '573215667170';
      const message = generateWhatsAppMessage();
      const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
      window.open(whatsappUrl, '_blank');

      setOrderComplete(true);
      clearCart();
      toast.success('¡Orden enviada!', { description: 'Te contactaremos pronto por WhatsApp' });
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Error inesperado. Intenta de nuevo.');
    }

    setIsSubmitting(false);
  };

  if (cart.items.length === 0 && !orderComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Tu carrito está vacío</h2>
          <Button onClick={() => navigate('/')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver al menú
          </Button>
        </div>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="text-center max-w-md mx-auto px-4 animate-scale-in">
          <div className="w-20 h-20 rounded-full bg-ohana/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-ohana" />
          </div>
          <h2 className="text-2xl font-bold mb-4">¡Gracias por tu orden!</h2>
          <p className="text-muted-foreground mb-8">
            Hemos recibido tu pedido. Te contactaremos por WhatsApp para confirmar los detalles.
          </p>
          <Button onClick={() => navigate('/')} className="btn-ohana">Volver al inicio</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="container max-w-4xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-card rounded-xl p-6 border">
                <h3 className="font-semibold mb-4">Información de contacto</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input id="name" value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Tu nombre" className={errors.name ? 'border-destructive' : ''} />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input id="phone" type="tel" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} placeholder="+57 300 123 4567" className={errors.phone ? 'border-destructive' : ''} />
                    {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-xl p-6 border">
                <h3 className="font-semibold mb-4">Tipo de orden</h3>
                <RadioGroup value={form.orderType} onValueChange={(v) => updateField('orderType', v as 'pickup' | 'delivery')} className="grid grid-cols-2 gap-4">
                  <Label htmlFor="pickup" className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.orderType === 'pickup' ? 'border-ohana bg-ohana/5' : 'border-border hover:border-ohana/50'}`}>
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Store className="w-5 h-5" /> <span>Recoger</span>
                  </Label>
                  <Label htmlFor="delivery" className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${form.orderType === 'delivery' ? 'border-ohana bg-ohana/5' : 'border-border hover:border-ohana/50'}`}>
                    <RadioGroupItem value="delivery" id="delivery" />
                    <MapPin className="w-5 h-5" /> <span>Entrega</span>
                  </Label>
                </RadioGroup>
                {form.orderType === 'delivery' && (
                  <div className="mt-4 animate-fade-in">
                    <Label htmlFor="address">Dirección de entrega</Label>
                    <Textarea id="address" value={form.address} onChange={(e) => updateField('address', e.target.value)} placeholder="Calle, número, colonia, ciudad..." rows={3} className={errors.address ? 'border-destructive' : ''} />
                    {errors.address && <p className="text-sm text-destructive mt-1">{errors.address}</p>}
                  </div>
                )}
              </div>

              <div className="bg-card rounded-xl p-6 border">
                <h3 className="font-semibold mb-4">Notas adicionales (opcional)</h3>
                <Textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} placeholder="Instrucciones especiales, alergias, etc." rows={3} />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full btn-ohana" size="lg">
                <MessageCircle className="w-5 h-5 mr-2" />
                {isSubmitting ? 'Enviando...' : 'Enviar Orden por WhatsApp'}
              </Button>
            </form>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl border p-6 sticky top-24">
              <h3 className="font-semibold mb-4">Resumen de tu orden</h3>
              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.brand === 'ohana' ? 'bg-ohana/10' : 'bg-chilli/10'}`}>
                      {item.brand === 'ohana' ? <Leaf className="h-5 w-5 text-ohana" /> : <Flame className="h-5 w-5 text-chilli-dark" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.type === 'product' ? item.product?.name : 'Bowl Personalizado'}</p>
                      <p className="text-xs text-muted-foreground">{item.quantity}x {formatPrice(item.unitPrice)}</p>
                    </div>
                    <span className="font-medium">{formatPrice(item.totalPrice)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(cart.subtotal)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-ohana">{formatPrice(cart.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
