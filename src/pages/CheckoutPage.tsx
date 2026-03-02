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
  ArrowLeft, CheckCircle, Leaf, Flame, MapPin, Store, MessageCircle,
  Minus, Plus, Trash2, Copy, RotateCcw, Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/domain/formatPrice';
import { formatBowlSummary } from '@/domain/bowlSummary';
import { generateWhatsAppMessage, buildWhatsAppUrl, tryOpenWhatsApp } from '@/domain/whatsapp';

const checkoutSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Ingresa un número de teléfono válido'),
  orderType: z.enum(['pickup', 'delivery']),
  address: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

type OrderStatus = 'idle' | 'submitting' | 'created' | 'whatsapp_sent' | 'whatsapp_blocked';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const { data: whatsappNumber } = useWhatsAppNumber();
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('idle');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState<string>('');
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');

  const [form, setForm] = useState<CheckoutForm>({
    name: '', phone: '', orderType: 'pickup', address: '', notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});

  const updateField = <K extends keyof CheckoutForm>(field: K, value: CheckoutForm[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
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

    setOrderStatus('submitting');

    try {
      // 1. Create order in DB
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
        setOrderStatus('idle');
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

      setOrderId(orderData.id);
      setOrderStatus('created');

      // 3. Try WhatsApp
      const phone = whatsappNumber || '573215667170';
      const message = generateWhatsAppMessage(cart.items, cart.total, {
        name: form.name, phone: form.phone, orderType: form.orderType,
        address: form.address, notes: form.notes, orderId: orderData.id,
      });
      const url = buildWhatsAppUrl(phone, message);
      setWhatsappMessage(message);
      setWhatsappUrl(url);

      const waResult = tryOpenWhatsApp(url);
      if (waResult.ok) {
        setOrderStatus('whatsapp_sent');
        clearCart();
        toast.success('¡Orden enviada!', { description: 'Te contactaremos pronto por WhatsApp' });
      } else {
        setOrderStatus('whatsapp_blocked');
        clearCart();
        toast.warning('No se pudo abrir WhatsApp automáticamente');
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      toast.error('Error inesperado. Intenta de nuevo.');
      setOrderStatus('idle');
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      toast.success('Mensaje copiado al portapapeles');
    } catch {
      // fallback: select textarea
      toast.info('Selecciona y copia el mensaje manualmente');
    }
  };

  const handleRetryWhatsApp = () => {
    const result = tryOpenWhatsApp(whatsappUrl);
    if (result.ok) {
      setOrderStatus('whatsapp_sent');
      toast.success('WhatsApp abierto correctamente');
    } else {
      toast.error('Sigue sin poder abrir WhatsApp. Usa el botón de copiar.');
    }
  };

  // ─── Empty cart ────────────────────────────────────────
  if (cart.items.length === 0 && orderStatus === 'idle') {
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

  // ─── Order completion states ───────────────────────────
  if (orderStatus === 'whatsapp_sent' || orderStatus === 'whatsapp_blocked' || (orderStatus === 'created' && cart.items.length === 0)) {
    const phone = whatsappNumber || '573215667170';
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="max-w-lg mx-auto px-4 animate-scale-in">
          <div className="text-center mb-8">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              orderStatus === 'whatsapp_sent' ? 'bg-ohana/10' : 'bg-accent/20'
            }`}>
              <CheckCircle className={`w-10 h-10 ${orderStatus === 'whatsapp_sent' ? 'text-ohana' : 'text-accent'}`} />
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {orderStatus === 'whatsapp_sent' ? '¡Orden enviada por WhatsApp!' : '¡Pedido creado!'}
            </h2>
            {orderId && (
              <p className="text-sm text-muted-foreground mb-2">
                Referencia: <span className="font-mono font-bold text-foreground">{orderId.slice(0, 8).toUpperCase()}</span>
              </p>
            )}
            <p className="text-muted-foreground">
              {orderStatus === 'whatsapp_sent'
                ? 'Te contactaremos por WhatsApp para confirmar los detalles.'
                : 'No se pudo abrir WhatsApp automáticamente. Usa las opciones abajo para enviarnos tu pedido.'}
            </p>
          </div>

          {orderStatus === 'whatsapp_blocked' && (
            <div className="bg-card border rounded-xl p-6 space-y-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" />
                <span>Número: <strong className="text-foreground">{phone}</strong></span>
              </div>

              <div className="flex gap-2">
              <Button onClick={handleRetryWhatsApp} className="flex-1 btn-ohana">
                  <RotateCcw className="w-4 h-4 mr-2" /> Reintentar WhatsApp
                </Button>
                <Button onClick={handleCopyMessage} variant="outline" className="flex-1">
                  <Copy className="w-4 h-4 mr-2" /> Copiar mensaje
                </Button>
              </div>

              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Ver mensaje completo
                </summary>
                <textarea
                  readOnly
                  value={whatsappMessage}
                  rows={10}
                  className="w-full mt-2 p-3 bg-muted rounded-lg text-xs font-mono resize-none border-0 focus:ring-0"
                  onFocus={(e) => e.target.select()}
                />
              </details>
            </div>
          )}

          <Button onClick={() => navigate('/')} className="w-full btn-ohana">Volver al inicio</Button>
        </div>
      </div>
    );
  }

  // ─── Checkout form ─────────────────────────────────────
  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="container max-w-4xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Form */}
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

              <Button type="submit" disabled={orderStatus === 'submitting'} className="w-full btn-ohana" size="lg">
                <MessageCircle className="w-5 h-5 mr-2" />
                {orderStatus === 'submitting' ? 'Enviando...' : 'Enviar Orden por WhatsApp'}
              </Button>
            </form>
          </div>

          {/* Order summary with inline editing */}
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
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-medium text-sm">{item.type === 'product' ? item.product?.name : 'Bowl Personalizado'}</p>
                        <button onClick={() => removeItem(item.id)} className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0" aria-label="Eliminar producto">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {item.type === 'custom-bowl' && item.customBowl && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{formatBowlSummary(item.customBowl)}</p>
                      )}
                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-muted transition-colors" aria-label="Reducir cantidad">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-medium">{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-muted transition-colors" aria-label="Aumentar cantidad">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                        <span className="font-semibold text-sm">{formatPrice(item.totalPrice)}</span>
                      </div>
                    </div>
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
