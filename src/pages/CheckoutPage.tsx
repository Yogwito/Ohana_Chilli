import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useActiveDeliveryZones, useWhatsAppNumber } from '@/hooks/use-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  CheckCircle,
  Leaf,
  Flame,
  MapPin,
  Store,
  MessageCircle,
  Minus,
  Plus,
  Trash2,
  Copy,
  Phone,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { formatPrice } from '@/domain/formatPrice';
import { formatBowlSummary } from '@/domain/bowlSummary';
import { findDeliveryZoneByIdOrName } from '@/domain/deliveryZones';
import { buildWhatsAppUrl, generateWhatsAppMessage, openWhatsAppHandoff } from '@/domain/whatsapp';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';

const checkoutSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(100),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Ingresa un número de teléfono válido'),
  orderType: z.enum(['pickup', 'delivery']),
  address: z.string().optional(),
  deliveryZone: z.string().optional(),
  notes: z.string().max(500).optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;
type OrderStatus = 'idle' | 'submitting' | 'created';
type WhatsAppOpenStatus = 'idle' | 'opening' | 'opened' | 'failed';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const { data: whatsappNumber } = useWhatsAppNumber();
  const {
    data: deliveryZones = [],
    isLoading: loadingDeliveryZones,
    error: deliveryZonesError,
  } = useActiveDeliveryZones();

  const [orderStatus, setOrderStatus] = useState<OrderStatus>('idle');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState<string>('');
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  const [whatsAppOpenStatus, setWhatsAppOpenStatus] = useState<WhatsAppOpenStatus>('idle');
  const [whatsAppOpenMethod, setWhatsAppOpenMethod] = useState<string>('');
  const [wasEmbeddedContext, setWasEmbeddedContext] = useState<boolean>(false);

  const [form, setForm] = useState<CheckoutForm>({
    name: '',
    phone: '',
    orderType: 'pickup',
    address: '',
    deliveryZone: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});

  const isDeliveryZoneQueryError = Boolean(deliveryZonesError);
  const selectedDeliveryZone = useMemo(
    () => findDeliveryZoneByIdOrName(deliveryZones, selectedZoneId),
    [deliveryZones, selectedZoneId],
  );
  const hasSelectedDeliveryZone = Boolean(selectedDeliveryZone);
  const deliveryFeeCents = form.orderType === 'delivery' ? selectedDeliveryZone?.feeCents ?? 0 : 0;
  const orderSubtotal = cart.subtotal;
  const orderTotal = orderSubtotal + deliveryFeeCents;
  const submitBlockedByZone = form.orderType === 'delivery'
    && (loadingDeliveryZones || isDeliveryZoneQueryError || !hasSelectedDeliveryZone);

  const formattedOrderRef = useMemo(() => {
    if (!orderId) return null;
    return orderId.slice(0, 8).toUpperCase();
  }, [orderId]);

  const updateField = <K extends keyof CheckoutForm>(field: K, value: CheckoutForm[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (submitError) setSubmitError('');
  };

  useEffect(() => {
    const canonicalZoneName = selectedDeliveryZone?.name ?? '';
    setForm((prev) => (
      prev.deliveryZone === canonicalZoneName
        ? prev
        : { ...prev, deliveryZone: canonicalZoneName }
    ));
  }, [selectedDeliveryZone]);

  const handleOrderTypeChange = (nextType: 'pickup' | 'delivery') => {
    setForm((prev) => ({
      ...prev,
      orderType: nextType,
      deliveryZone: nextType === 'delivery' ? prev.deliveryZone : '',
    }));
    if (nextType === 'pickup') setSelectedZoneId('');
    setSubmitError('');
    setErrors((prev) => ({
      ...prev,
      orderType: undefined,
      deliveryZone: undefined,
      address: nextType === 'delivery' ? prev.address : undefined,
    }));
  };

  const handleDeliveryZoneChange = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    const zone = deliveryZones.find((item) => item.id === zoneId);
    updateField('deliveryZone', zone?.name ?? '');
  };

  const attemptOpenWhatsApp = () => {
    if (!whatsappUrl) return;
    setWhatsAppOpenStatus('opening');
    const result = openWhatsAppHandoff(whatsappUrl, { debugLabel: 'checkout_manual' });
    setWasEmbeddedContext(result.embedded);
    setWhatsAppOpenMethod(result.method);
    if (result.ok) {
      setWhatsAppOpenStatus('opened');
      toast.success('Abriendo WhatsApp...');
    } else {
      setWhatsAppOpenStatus('failed');
      toast.error('Pedido creado, pero no se pudo abrir WhatsApp automáticamente');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    const result = checkoutSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: Partial<Record<keyof CheckoutForm, string>> = {};
      result.error.errors.forEach((err) => {
        fieldErrors[err.path[0] as keyof CheckoutForm] = err.message;
      });
      setErrors(fieldErrors);
      setSubmitError('Revisa los campos marcados antes de enviar tu pedido.');
      return;
    }

    if (form.orderType === 'delivery' && !form.address) {
      setErrors((prev) => ({ ...prev, address: 'La dirección es requerida para entregas a domicilio' }));
      setSubmitError('Completa la dirección de entrega para continuar.');
      return;
    }

    if (form.orderType === 'delivery' && !hasSelectedDeliveryZone) {
      setErrors((prev) => ({ ...prev, deliveryZone: 'Selecciona un barrio/zona válido para calcular el domicilio' }));
      setSubmitError('Selecciona un barrio o zona válida para calcular el domicilio.');
      return;
    }

    if (form.orderType === 'delivery' && loadingDeliveryZones) {
      const message = 'Estamos cargando las zonas activas. Espera un momento e intenta de nuevo.';
      setSubmitError(message);
      toast.error(message);
      return;
    }

    if (form.orderType === 'delivery' && isDeliveryZoneQueryError) {
      const message = 'No se pudieron cargar las zonas activas. Intenta nuevamente.';
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setOrderStatus('submitting');
    trackEvent({ type: 'checkout_start', itemCount: cart.items.length, subtotalCents: orderSubtotal });

    try {
      let resolvedDeliveryZone = form.orderType === 'delivery' ? form.deliveryZone ?? '' : '';
      let resolvedDeliveryFeeCents = deliveryFeeCents;

      if (form.orderType === 'delivery') {
        if (!selectedZoneId) {
          setSubmitError('Selecciona un barrio o zona activa para calcular el domicilio.');
          toast.error('Selecciona un barrio o zona activa.');
          setOrderStatus('idle');
          return;
        }

        const { data: canonicalZone, error: canonicalZoneError } = await supabase
          .from('delivery_zones')
          .select('id,name,fee_cents')
          .eq('id', selectedZoneId)
          .eq('is_active', true)
          .maybeSingle();

        if (canonicalZoneError || !canonicalZone) {
          console.error('Error validating delivery zone:', canonicalZoneError);
          setSubmitError('La zona seleccionada ya no está activa o cambió de tarifa. Selecciónala de nuevo.');
          toast.error('Actualiza la zona de domicilio antes de continuar.');
          setSelectedZoneId('');
          updateField('deliveryZone', '');
          setOrderStatus('idle');
          return;
        }

        resolvedDeliveryZone = canonicalZone.name;
        resolvedDeliveryFeeCents = canonicalZone.fee_cents;
      }

      const finalOrderTotal = orderSubtotal + resolvedDeliveryFeeCents;
      const orderItems = cart.items.map((item) => ({
        brand_id: item.brand,
        name: item.type === 'product' ? (item.product?.name ?? 'Producto') : 'Bowl Personalizado',
        quantity: item.quantity,
        unit_price_cents: item.unitPrice,
        details:
          item.type === 'custom-bowl' && item.customBowl
            ? {
                size: item.customBowl.size.name,
                bases: item.customBowl.bases.map((b) => b.name),
                proteins: item.customBowl.proteins.map((p) => p.name),
                acompanantes: item.customBowl.acompanantes.map((a) => a.name),
                sauces: item.customBowl.sauces?.map((s) => s.name),
                complementos: item.customBowl.complementos?.map((c) => c.name),
                notes: item.notes,
              }
            : { product_id: item.product?.id, notes: item.notes },
      }));

      const { data: createdOrderId, error: createOrderError } = await supabase.rpc('create_order_with_items', {
        p_customer_name: form.name,
        p_phone: form.phone,
        p_order_type: form.orderType,
        p_address: form.address || null,
        p_delivery_zone: form.orderType === 'delivery' ? resolvedDeliveryZone || null : null,
        p_delivery_fee_cents: resolvedDeliveryFeeCents,
        p_notes: form.notes || null,
        p_total_cents: finalOrderTotal,
        p_items: orderItems,
      });

      if (createOrderError || !createdOrderId) {
        console.error('Error creating order transaction:', createOrderError);
        setSubmitError('No pudimos crear el pedido. Intenta nuevamente.');
        toast.error('Error al crear el pedido. Intenta de nuevo.');
        setOrderStatus('idle');
        return;
      }

      const phone = whatsappNumber || '573215667170';
      const message = generateWhatsAppMessage(cart.items, finalOrderTotal, {
        name: form.name,
        phone: form.phone,
        orderType: form.orderType,
        address: form.address,
        deliveryZone: resolvedDeliveryZone,
        deliveryFeeCents: resolvedDeliveryFeeCents,
        notes: form.notes,
        orderId: createdOrderId,
      });
      const url = buildWhatsAppUrl(phone, message);

      setOrderId(createdOrderId);
      setWhatsappMessage(message);
      setWhatsappUrl(url);
      clearCart();

      trackEvent({
        type: 'checkout_complete',
        orderId: createdOrderId,
        totalCents: finalOrderTotal,
        orderType: form.orderType,
        itemCount: cart.items.length,
      });

      setOrderStatus('created');
      setWhatsAppOpenStatus('idle');
      toast.success('Pedido creado. Toca "Abrir WhatsApp" para enviar.');
    } catch (err) {
      console.error('Unexpected error:', err);
      setSubmitError('Ocurrió un error inesperado al crear tu pedido.');
      toast.error('Error inesperado. Intenta de nuevo.');
      setOrderStatus('idle');
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(whatsappMessage);
      toast.success('Mensaje copiado al portapapeles');
    } catch {
      toast.info('Selecciona y copia el mensaje manualmente');
    }
  };

  // Empty cart state
  if (cart.items.length === 0 && orderStatus === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="text-center max-w-sm px-4 animate-scale-in">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-full border-4 border-ohana/30 flex items-center justify-center bg-ohana/5">
              <div className="w-8 h-8 rounded-full bg-ohana/25" />
            </div>
            <span className="text-2xl font-black text-muted-foreground/30">+?</span>
            <div className="w-16 h-16 rounded-full border-4 border-chilli-dark/30 flex items-center justify-center bg-chilli-dark/5">
              <div className="w-8 h-8 rounded-full bg-chilli-dark/20" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Tu carrito está vacío</h2>
          <p className="text-muted-foreground mb-8">Elige tus platos favoritos y empieza a armar tu orden.</p>
          <div className="flex gap-3">
            <Button onClick={() => navigate('/ohana')} className="flex-1 btn-ohana">
              Ver Ohana
            </Button>
            <Button
              onClick={() => navigate('/chilli')}
              className="flex-1 bg-gradient-to-r from-chilli to-chilli-dark text-chilli-foreground hover:opacity-90 rounded-full px-6 py-3 font-medium"
            >
              Ver Chilli
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (orderStatus === 'created') {
    const phone = whatsappNumber || '573215667170';
    const showFallback = whatsAppOpenStatus === 'failed';

    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="max-w-lg mx-auto px-4 w-full animate-scale-in">
          <div className="text-center mb-8">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-green-100">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Pedido creado</h2>
            {formattedOrderRef && (
              <p className="text-sm text-muted-foreground mb-2">
                Referencia:{' '}
                <span className="font-mono font-bold text-foreground">{formattedOrderRef}</span>
              </p>
            )}
            {whatsAppOpenStatus === 'idle' && (
              <p className="text-muted-foreground">Toca el botón para enviar tu pedido por WhatsApp.</p>
            )}
            {whatsAppOpenStatus === 'opening' && (
              <p className="text-muted-foreground">Abriendo WhatsApp...</p>
            )}
            {whatsAppOpenStatus === 'opened' && (
              <p className="text-muted-foreground">WhatsApp se abrió en otra pestaña.</p>
            )}
            {whatsAppOpenStatus === 'failed' && (
              <p className="text-destructive text-sm">No se pudo abrir WhatsApp. Usa el enlace directo o copia el mensaje.</p>
            )}
          </div>

          {showFallback && (
            <Alert className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>No se pudo abrir WhatsApp automáticamente</AlertTitle>
              <AlertDescription>
                {wasEmbeddedContext
                  ? 'Estás en un contexto embebido (preview/iframe). Usa "Enlace directo" o copia el mensaje.'
                  : 'Tu navegador bloqueó la apertura. Usa "Enlace directo" o copia el mensaje manualmente.'}
              </AlertDescription>
            </Alert>
          )}

          <div className="bg-card border rounded-xl p-6 space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>Número: <strong className="text-foreground">{phone}</strong></span>
            </div>

            <Button
              type="button"
              onClick={attemptOpenWhatsApp}
              className="w-full rounded-full h-12 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold transition-colors gap-2"
            >
              <MessageCircle className="w-5 h-5" /> Abrir WhatsApp
            </Button>

            <Button variant="outline" className="w-full" asChild>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" /> Enlace directo
              </a>
            </Button>

            <Button type="button" onClick={handleCopyMessage} variant="outline" className="w-full">
              <Copy className="w-4 h-4 mr-2" /> Copiar mensaje
            </Button>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowMessage((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showMessage ? 'Ocultar mensaje' : 'Ver mensaje completo'}
              </button>
              {showMessage && (
                <div className="animate-fade-in space-y-1">
                  <Textarea
                    id="whatsapp-message"
                    readOnly
                    value={whatsappMessage}
                    rows={10}
                    className="text-xs font-mono"
                    onFocus={(e) => e.currentTarget.select()}
                  />
                  {formattedOrderRef && (
                    <p className="text-xs text-muted-foreground">
                      Referencia: <span className="font-mono font-semibold">{formattedOrderRef}</span>
                      {whatsAppOpenMethod ? <span> · Método: {whatsAppOpenMethod}</span> : null}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button type="button" onClick={() => navigate('/')} className="w-full btn-ohana">
            Volver al inicio
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 sm:py-12">
      {/* Branded top bar */}
      <div className="fixed top-14 left-0 right-0 h-0.5 bg-gradient-to-r from-ohana via-ohana/40 to-chilli-dark z-40 pointer-events-none" />

      <div className="container max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
          {/* Form */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <form onSubmit={handleSubmit} className="space-y-8">
              {submitError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No pudimos enviar tu pedido</AlertTitle>
                  <AlertDescription>{submitError}</AlertDescription>
                </Alert>
              )}

              {/* Contact info */}
              <div className="relative pl-4">
                <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-ohana" />
                <h3 className="text-xs uppercase tracking-[.15em] text-muted-foreground mb-4">Información de contacto</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre completo</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="Tu nombre"
                      className={cn('rounded-xl h-11 mt-1', errors.name ? 'border-destructive' : '')}
                    />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => updateField('phone', e.target.value)}
                      placeholder="+57 300 123 4567"
                      className={cn('rounded-xl h-11 mt-1', errors.phone ? 'border-destructive' : '')}
                    />
                    {errors.phone && <p className="text-sm text-destructive mt-1">{errors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Order type */}
              <div className="relative pl-4">
                <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-ohana" />
                <h3 className="text-xs uppercase tracking-[.15em] text-muted-foreground mb-4">Tipo de orden</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      value: 'pickup' as const,
                      icon: Store,
                      title: 'Recoger en tienda',
                      subtitle: 'Sin costo adicional',
                      subtitleClass: 'text-green-600',
                    },
                    {
                      value: 'delivery' as const,
                      icon: MapPin,
                      title: 'Envío a domicilio',
                      subtitle: hasSelectedDeliveryZone ? formatPrice(deliveryFeeCents) : 'Tarifa según zona',
                      subtitleClass: hasSelectedDeliveryZone ? 'text-ohana-dark' : 'text-muted-foreground',
                    },
                  ].map(({ value, icon: Icon, title, subtitle, subtitleClass }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleOrderTypeChange(value)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all duration-200',
                        form.orderType === value
                          ? 'ring-2 ring-ohana border-ohana bg-ohana/5'
                          : 'border-border hover:border-ohana/40',
                      )}
                    >
                      <Icon className={cn('w-5 h-5', form.orderType === value ? 'text-ohana' : 'text-muted-foreground')} />
                      <span className="text-sm font-medium leading-tight">{title}</span>
                      <span className={cn('text-xs', subtitleClass)}>{subtitle}</span>
                    </button>
                  ))}
                </div>

                {form.orderType === 'delivery' && (
                  <div className="mt-4 space-y-4 animate-fade-in">
                    <div>
                      <Label htmlFor="address">Dirección de entrega</Label>
                      <Textarea
                        id="address"
                        value={form.address}
                        onChange={(e) => updateField('address', e.target.value)}
                        placeholder="Calle, número, complemento, ciudad..."
                        rows={3}
                        className={cn('rounded-xl mt-1', errors.address ? 'border-destructive' : '')}
                      />
                      {errors.address && <p className="text-sm text-destructive mt-1">{errors.address}</p>}
                    </div>

                    <div>
                      <Label htmlFor="delivery-zone">Barrio/Zona *</Label>
                      {isDeliveryZoneQueryError ? (
                        <p className="text-sm text-destructive mt-2">
                          No se pudieron cargar las zonas activas de domicilio. No es posible continuar hasta recargar los precios reales.
                        </p>
                      ) : (
                        <>
                          <Select
                            value={selectedZoneId}
                            onValueChange={handleDeliveryZoneChange}
                            disabled={loadingDeliveryZones}
                          >
                            <SelectTrigger
                              id="delivery-zone"
                              className={cn('rounded-xl h-11 mt-1', errors.deliveryZone ? 'border-destructive' : '')}
                            >
                              <SelectValue
                                placeholder={loadingDeliveryZones ? 'Cargando zonas...' : 'Selecciona tu barrio/zona'}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {deliveryZones.map((zone) => (
                                <SelectItem key={zone.id} value={zone.id}>
                                  {zone.name} — {formatPrice(zone.feeCents)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {selectedDeliveryZone && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-ohana-dark bg-ohana/10 border border-ohana/20 rounded-full px-3 py-1.5 w-fit animate-fade-in">
                              <MapPin className="w-3 h-3 shrink-0" />
                              <span>{selectedDeliveryZone.name} · Domicilio: {formatPrice(deliveryFeeCents)}</span>
                            </div>
                          )}
                        </>
                      )}
                      {errors.deliveryZone && <p className="text-sm text-destructive mt-1">{errors.deliveryZone}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="relative pl-4">
                <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-muted" />
                <h3 className="text-xs uppercase tracking-[.15em] text-muted-foreground mb-4">Notas adicionales (opcional)</h3>
                <Textarea
                  value={form.notes}
                  onChange={(e) => updateField('notes', e.target.value)}
                  placeholder="Instrucciones especiales, alergias, etc."
                  rows={3}
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Button
                  type="submit"
                  disabled={orderStatus === 'submitting' || submitBlockedByZone}
                  className="w-full rounded-full h-12 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold transition-colors gap-2"
                  size="lg"
                >
                  <MessageCircle className="w-5 h-5" />
                  {orderStatus === 'submitting' ? 'Creando pedido...' : 'Enviar por WhatsApp'}
                </Button>

                {submitBlockedByZone && (
                  <p className="text-sm text-foreground bg-muted border border-border rounded-xl px-3 py-2">
                    {loadingDeliveryZones
                      ? 'Estamos cargando las zonas activas.'
                      : isDeliveryZoneQueryError
                        ? 'No se pudieron cargar las tarifas reales de domicilio.'
                        : 'Debes seleccionar un barrio o zona activa para calcular el domicilio.'}
                  </p>
                )}
              </div>
            </form>
          </div>

          {/* Order summary sidebar */}
          <div className="lg:col-span-2 order-1 lg:order-2">
            <div className="bg-card rounded-xl border p-4 sm:p-6 sticky top-20">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold">Tu orden</h3>
                <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">
                  {cart.items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>

              <div className="space-y-4 mb-6">
                {cart.items.map((item) => (
                  <div key={item.id} className="group flex gap-3">
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                        item.brand === 'ohana' ? 'bg-ohana/10' : 'bg-chilli/10',
                      )}
                    >
                      {item.brand === 'ohana'
                        ? <Leaf className="h-4 w-4 text-ohana" />
                        : <Flame className="h-4 w-4 text-chilli-dark" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="font-medium text-sm leading-tight">
                          {item.type === 'product' ? item.product?.name : 'Bowl Personalizado'}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-muted-foreground hover:text-destructive transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                          aria-label="Eliminar producto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {item.type === 'custom-bowl' && item.customBowl && (
                        <p className="mt-1 whitespace-pre-line text-xs leading-relaxed text-muted-foreground">
                          {formatBowlSummary(item.customBowl)}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1 border rounded-full px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-5 h-5 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
                            aria-label="Reducir cantidad"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-5 h-5 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
                            aria-label="Aumentar cantidad"
                          >
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
                  <span>{formatPrice(orderSubtotal)}</span>
                </div>
                {form.orderType === 'delivery' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Domicilio</span>
                    <span className={hasSelectedDeliveryZone ? '' : 'text-amber-700'}>
                      {hasSelectedDeliveryZone ? formatPrice(deliveryFeeCents) : 'Selecciona zona'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-base pt-1">
                  <span>Total</span>
                  <span className="text-ohana-dark">{formatPrice(orderTotal)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
