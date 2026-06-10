import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useActiveDeliveryZones, useBusinessSettings, useBusinessOpenStatus } from '@/hooks/use-catalog';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Banknote,
  CheckCircle,
  CreditCard,
  Leaf,
  MapPin,
  ShoppingCart,
  Store,
  MessageCircle,
  Minus,
  Plus,
  Trash2,
  Copy,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { formatBusinessPhone, parseBusinessAddress } from '@/domain/businessSettings';
import { formatPrice } from '@/domain/formatPrice';
import { formatBowlSummary } from '@/domain/bowlSummary';
import { formatProductCustomizationLines } from '@/domain/productCustomizations';
import { findDeliveryZoneByIdOrName } from '@/domain/deliveryZones';
import { buildPlatformWhatsAppUrl, generateWhatsAppMessage, openWhatsAppHandoff } from '@/domain/whatsapp';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { AnimatedElement } from '@/components/ui/AnimatedElement';

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
type CheckoutLocationState = { from?: string } | null;

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const { data: businessSettings } = useBusinessSettings();
  const { isClosed: isBusinessClosed, isOpen: isBusinessOpen, isEnforced: isHoursEnforced } = useBusinessOpenStatus();
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
  const [platform, setPlatform] = useState<'mobile' | 'desktop'>('mobile');

  // CHANGE 1 — delivery as default
  const [form, setForm] = useState<CheckoutForm>({
    name: '',
    phone: '',
    orderType: 'delivery',
    address: '',
    deliveryZone: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});

  // CHANGE 2 — payment method state
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');

  // CHANGE 5 — terms states
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const previousShoppingPath = typeof (location.state as CheckoutLocationState | undefined)?.from === 'string'
    ? (location.state as CheckoutLocationState).from
    : null;
  const continueShoppingPath = previousShoppingPath && !previousShoppingPath.startsWith('/checkout')
    ? previousShoppingPath
    : '/carta';

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
  const submitBlockedByClosed = isBusinessClosed;
  const whatsappNumber = businessSettings?.whatsappNumber ?? null;
  const businessPhoneLabel = formatBusinessPhone(whatsappNumber);
  const addressParts = parseBusinessAddress(businessSettings?.contactAddress);

  const formattedOrderRef = useMemo(() => {
    if (!orderId) return null;
    return orderId.slice(0, 8).toUpperCase();
  }, [orderId]);

  const messagePreview = useMemo(() => {
    if (cart.items.length === 0) return '';
    return generateWhatsAppMessage(cart.items, orderTotal, {
      name: form.name || 'Cliente',
      phone: form.phone || '',
      orderType: form.orderType,
      address: form.address,
      deliveryZone: selectedDeliveryZone?.name,
      deliveryFeeCents,
      notes: form.notes,
      orderId: 'PREVIEW000',
      paymentMethod,
    });
  }, [cart.items, orderTotal, form, selectedDeliveryZone, deliveryFeeCents, paymentMethod]);

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

  // CHANGE 2 — copy to clipboard helper
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Número copiado');
    } catch {
      toast.info('Copia manualmente: ' + text);
    }
  };

  const handleContinueShopping = () => {
    navigate(continueShoppingPath);
  };

  const handleGoHome = () => {
    navigate('/');
  };

  const handleStartAnotherOrder = () => {
    navigate(continueShoppingPath);
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

    if (!whatsappNumber) {
      const message = 'El número de WhatsApp no está configurado. Intenta nuevamente en unos minutos.';
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
            : {
                product_id: item.product?.id,
                notes: item.notes,
                customizations: item.customizations ?? null,
              },
      }));

      // Use SECURITY DEFINER RPC — bypasses RLS so anon users can insert orders.
      // Direct inserts into orders/order_items are blocked by RLS (no anon policies).
      const { data: createdOrderId, error: createOrderError } = await supabase.rpc(
        'create_order_with_items',
        {
          p_customer_name: form.name,
          p_phone: form.phone,
          p_order_type: form.orderType,
          p_address: form.address || null,
          p_delivery_zone: form.orderType === 'delivery' ? resolvedDeliveryZone || null : null,
          p_delivery_fee_cents: resolvedDeliveryFeeCents,
          p_notes: form.notes || null,
          p_total_cents: finalOrderTotal,
          p_items: orderItems,
        }
      );

      if (createOrderError || !createdOrderId) {
        console.error('Error creating order:', createOrderError);
        setSubmitError(
          createOrderError?.message
            ? `Error: ${createOrderError.message}`
            : 'No pudimos crear el pedido. Intenta nuevamente.'
        );
        toast.error('Error al crear el pedido. Intenta de nuevo.');
        setOrderStatus('idle');
        return;
      }

      const phone = whatsappNumber;
      // CHANGE 3 — pass paymentMethod to WhatsApp message generator
      const message = generateWhatsAppMessage(cart.items, finalOrderTotal, {
        name: form.name,
        phone: form.phone,
        orderType: form.orderType,
        address: form.address,
        deliveryZone: resolvedDeliveryZone,
        deliveryFeeCents: resolvedDeliveryFeeCents,
        notes: form.notes,
        orderId: createdOrderId,
        paymentMethod,
      });
      const { url, platform: detectedPlatform } = buildPlatformWhatsAppUrl(phone, message);
      setPlatform(detectedPlatform);

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

      if (detectedPlatform === 'desktop') {
        openWhatsAppHandoff(phone, message);
        toast.success('WhatsApp Web se abrió en una nueva pestaña.');
      } else {
        toast.success('Pedido creado. Toca "Abrir WhatsApp" para enviar.');
      }
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

  // CHANGE 4 — Empty cart state
  if (cart.items.length === 0 && orderStatus === 'idle') {
    return (
      <div className="min-h-screen flex items-center justify-center py-12">
        <div className="text-center max-w-sm px-4 animate-scale-in">
          <div className="flex items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-full border-4 border-ohana/30 flex items-center justify-center bg-ohana/5">
              <div className="w-8 h-8 rounded-full bg-ohana/25" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Tu carrito está vacío</h2>
          <p className="text-muted-foreground mb-8">Elige tus platos favoritos y empieza a armar tu orden.</p>
          <div className="flex flex-col gap-3 justify-center sm:flex-row">
            <Button onClick={handleContinueShopping} className="btn-ohana w-full sm:w-auto">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Seguir comprando
            </Button>
            <Button onClick={handleGoHome} variant="outline" className="w-full sm:w-auto">
              Volver al inicio
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (orderStatus === 'created') {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full space-y-6 text-center">

          {/* Animated checkmark */}
          <div className="w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-brand" />
          </div>

          {/* Order reference */}
          <div>
            <h2 className="text-2xl font-display font-bold">¡Pedido creado!</h2>
            {formattedOrderRef && (
              <p className="text-sm text-muted-foreground mt-1">
                Referencia:{' '}
                <span className="font-mono font-bold text-foreground">
                  {formattedOrderRef}
                </span>
              </p>
            )}
          </div>

          {/* Status message */}
          <p className="text-muted-foreground text-sm">
            {platform === 'desktop'
              ? 'WhatsApp Web se abrió en una nueva pestaña. Envía el mensaje para confirmar tu pedido.'
              : 'Toca el botón para enviar tu pedido por WhatsApp.'}
          </p>

          <div className="rounded-2xl border bg-card/60 px-4 py-3 text-left text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Siguiente paso</p>
            <p>
              Tu pedido ya fue creado. Solo falta enviar el mensaje en WhatsApp para confirmarlo con el equipo de Ohana.
            </p>
          </div>

          {/* Primary CTA */}
          {platform === 'mobile' ? (
            <a
              href={whatsappUrl}
              className={cn(
                'w-full h-12 rounded-full text-base font-semibold',
                'flex items-center justify-center gap-2',
                'text-white transition-colors',
              )}
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageCircle className="w-5 h-5" />
              Abrir WhatsApp
            </a>
          ) : (
            <Button
              onClick={() => openWhatsAppHandoff(whatsappNumber!, whatsappMessage)}
              className="w-full h-12 rounded-full text-base font-semibold"
              style={{ backgroundColor: '#25D366', color: 'white' }}
            >
              <MessageCircle className="w-5 h-5 mr-2" />
              Abrir WhatsApp Web
            </Button>
          )}

          {/* Fallback — always visible for edge cases */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleCopyMessage}
          >
            <Copy className="w-4 h-4 mr-2" />
            Copiar mensaje
          </Button>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Button
              variant="outline"
              onClick={handleGoHome}
              className="w-full"
            >
              Volver al inicio
            </Button>
            <Button
              variant="ghost"
              onClick={handleStartAnotherOrder}
              className="w-full"
            >
              Hacer otro pedido
            </Button>
          </div>

          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="w-full"
          >
            Seguir comprando →
          </Button>

        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen py-8 sm:py-12">
        {/* Branded top bar */}
        <div className="fixed top-14 left-0 right-0 h-0.5 bg-brand z-40 pointer-events-none" />

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
              <form onSubmit={handleSubmit} className="space-y-8 pb-32 lg:pb-0">
                {submitError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No pudimos enviar tu pedido</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                {/* Contact info */}
                <AnimatedElement as="div" animation="fade-up" delay={0} className="relative pl-4">
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
                </AnimatedElement>

                {/* Order type */}
                <AnimatedElement as="div" animation="fade-up" delay={75} className="relative pl-4">
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
                </AnimatedElement>

                {/* CHANGE 2 — Payment method */}
                <AnimatedElement as="div" animation="fade-up" delay={150} className="bg-card rounded-xl p-6 border">
                  <h3 className="font-semibold mb-4">Método de pago</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash')}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all duration-200',
                        paymentMethod === 'cash'
                          ? 'ring-2 ring-brand bg-brand/5 dark:bg-brand/10'
                          : 'border hover:border-brand/50',
                      )}
                    >
                      <Banknote className={cn('w-5 h-5', paymentMethod === 'cash' ? 'text-brand' : 'text-muted-foreground')} />
                      <span className="text-sm font-medium">Contra entrega</span>
                      <span className="text-xs text-muted-foreground">Paga al recibir</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('transfer')}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl text-center transition-all duration-200',
                        paymentMethod === 'transfer'
                          ? 'ring-2 ring-brand bg-brand/5 dark:bg-brand/10'
                          : 'border hover:border-brand/50',
                      )}
                    >
                      <CreditCard className={cn('w-5 h-5', paymentMethod === 'transfer' ? 'text-brand' : 'text-muted-foreground')} />
                      <span className="text-sm font-medium">Transferencia</span>
                      <span className="text-xs text-muted-foreground">Bancolombia, Nequi, Davivienda</span>
                    </button>
                  </div>

                  {paymentMethod === 'transfer' && (
                    <div className="mt-4 rounded-xl bg-brand/5 dark:bg-brand/10 border border-brand/20 dark:border-brand/30 p-4 space-y-3 animate-fade-in">
                      <p className="text-sm font-medium text-brand-dark">
                        Con el fin de verificar el pago inmediatamente, SOLO aceptamos
                        transferencias realizadas desde Davivienda, Bancolombia, Nequi
                        o llaves 🤗👍
                      </p>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border border-border/60">
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">AHORROS DAVIVIENDA</p>
                            <p className="text-sm font-mono font-semibold">084500056803</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('084500056803')}
                            className="text-brand hover:text-brand-dark transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between bg-background rounded-lg px-3 py-2 border border-border/60">
                          <div>
                            <p className="text-xs text-muted-foreground font-medium">LLAVE</p>
                            <p className="text-sm font-mono font-semibold">0089809765</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyToClipboard('0089809765')}
                            className="text-brand hover:text-brand-dark transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                        <span className="text-base">📲</span>
                        <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                          NO OLVIDES enviar el comprobante de la transacción a este chat
                          para poder iniciar con tu pedido.
                        </p>
                      </div>
                    </div>
                  )}
                </AnimatedElement>

                {/* Notes */}
                <AnimatedElement as="div" animation="fade-up" delay={225} className="relative pl-4">
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-muted" />
                  <h3 className="text-xs uppercase tracking-[.15em] text-muted-foreground mb-4">Notas adicionales (opcional)</h3>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => updateField('notes', e.target.value)}
                    placeholder="Instrucciones especiales, alergias, etc."
                    rows={3}
                    className="rounded-xl"
                  />
                </AnimatedElement>

                {/* CHANGE 5 — Terms checkbox */}
                <AnimatedElement as="div" animation="fade-up" delay={300} className="flex items-start gap-3 p-4 bg-muted/40 rounded-xl border border-border/60">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-border accent-brand cursor-pointer shrink-0"
                  />
                  <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                    Acepto los{' '}
                    <button
                      type="button"
                      onClick={() => setTermsModalOpen(true)}
                      className="text-brand underline underline-offset-2 hover:text-brand-dark font-medium"
                    >
                      Términos y Condiciones
                    </button>
                    {' '}y autorizo el{' '}
                    <button
                      type="button"
                      onClick={() => setTermsModalOpen(true)}
                      className="text-brand underline underline-offset-2 hover:text-brand-dark font-medium"
                    >
                      Tratamiento de mis Datos Personales
                    </button>
                  </label>
                </AnimatedElement>

                <div className="fixed bottom-16 left-0 right-0 lg:static lg:bottom-auto p-4 lg:p-0 bg-background/95 lg:bg-transparent backdrop-blur-sm lg:backdrop-blur-none border-t lg:border-0 border-border/40 z-40 lg:z-auto space-y-2">
                  {submitBlockedByClosed && (
                    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 px-4 py-3 text-sm">
                      <span className="text-lg leading-none mt-0.5">🔒</span>
                      <div>
                        <p className="font-semibold text-red-800 dark:text-red-300">Estamos cerrados</p>
                        <p className="text-red-700 dark:text-red-400 text-xs mt-0.5">
                          {businessSettings?.hoursWeekday
                            ? `Horario: Lun–Vie ${businessSettings.hoursWeekday}${businessSettings.hoursWeekend ? ` · Sáb–Dom ${businessSettings.hoursWeekend}` : ''}`
                            : 'Vuelve en nuestro próximo horario de atención.'}
                        </p>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={orderStatus === 'submitting' || submitBlockedByZone || submitBlockedByClosed || !termsAccepted}
                    className="w-full rounded-full h-12 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold transition-colors gap-2 disabled:bg-muted disabled:text-muted-foreground"
                    size="lg"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {orderStatus === 'submitting' ? 'Creando pedido...' : submitBlockedByClosed ? 'Cerrado — fuera de horario' : 'Enviar por WhatsApp'}
                  </Button>

                  {!termsAccepted && !submitBlockedByClosed && (
                    <p className="text-xs text-muted-foreground text-center">
                      Acepta los términos para continuar
                    </p>
                  )}

                  {submitBlockedByZone && !submitBlockedByClosed && (
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
              <AnimatedElement animation="scale-up" delay={75} className="bg-card rounded-xl border p-4 sm:p-6 sticky top-20">
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="font-semibold">Tu orden</h3>
                  <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-medium">
                    {cart.items.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>

                <div className="space-y-4 mb-6">
                  {cart.items.map((item) => {
                    const customizationLines = item.type === 'product'
                      ? formatProductCustomizationLines(item.customizations)
                      : [];

                    return (
                      <div key={item.id} className="group flex gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-ohana/10">
                          <Leaf className="h-4 w-4 text-ohana" />
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
                          {customizationLines.length > 0 && (
                            <div className="mt-1 space-y-0.5">
                              {customizationLines.map((line) => (
                                <p key={line} className="text-xs text-muted-foreground">{line}</p>
                              ))}
                            </div>
                          )}
                          {item.notes && customizationLines.length === 0 && (
                            <p className="mt-1 text-xs text-muted-foreground">Nota: {item.notes}</p>
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
                    );
                  })}
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

                {/* WhatsApp message preview */}
                {messagePreview && (
                  <div className="mt-4 pt-4 border-t border-border/40">
                    <details className="text-xs">
                      <summary className="cursor-pointer text-muted-foreground hover:text-brand transition-colors py-1 select-none list-none flex items-center gap-1">
                        <span className="text-base">▾</span>
                        Vista previa del mensaje WhatsApp
                      </summary>
                      <pre className="mt-2 p-3 bg-muted rounded-lg text-xs font-mono whitespace-pre-wrap text-muted-foreground overflow-auto max-h-48">
                        {messagePreview}
                      </pre>
                    </details>
                  </div>
                )}

                {/* CHANGE 4 — Seguir comprando */}
                <div className="mt-4 pt-4 border-t border-border/40">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleContinueShopping}
                      className="w-full"
                    >
                      Seguir comprando
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGoHome}
                      className="w-full text-muted-foreground hover:text-brand"
                    >
                      Volver al inicio
                    </Button>
                  </div>
                </div>
              </AnimatedElement>
            </div>
          </div>
        </div>
      </div>

      {/* CHANGE 5 — Terms modal */}
      <Dialog open={termsModalOpen} onOpenChange={setTermsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Términos, Condiciones y
              <span className="block text-base font-normal text-muted-foreground">
                Autorización Tratamiento de Datos Personales
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-6 leading-relaxed">
            <section className="space-y-2">
              <h3 className="font-semibold text-foreground text-base">
                1. Términos y Condiciones de Uso
              </h3>
              <p>
                Al realizar un pedido a través de esta plataforma, usted acepta
                los presentes términos y condiciones. Ohana Bowls se reserva el
                derecho de modificar estos términos en cualquier momento.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold text-foreground text-base">
                2. Pedidos y Pagos
              </h3>
              <p>
                Los pedidos se confirman únicamente a través de WhatsApp. El precio
                final incluye el costo de los productos más el valor del domicilio
                según la zona seleccionada. Aceptamos pagos contra entrega y
                transferencias bancarias desde Davivienda, Bancolombia, Nequi
                o llaves.
              </p>
              <p>
                Para pagos por transferencia, el pedido se inicia únicamente
                después de recibir el comprobante de pago en el chat de WhatsApp.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold text-foreground text-base">
                3. Domicilios y Tiempos de Entrega
              </h3>
              <p>
                Los tiempos de entrega son estimados ({businessSettings?.deliveryEta ?? 'según configuración vigente'}) y pueden
                variar según la demanda, condiciones de tráfico y zona de entrega.
                Ohana Bowls no se hace responsable por demoras ocasionadas por
                factores externos.
              </p>
              <p>
                El servicio de domicilio está disponible únicamente en las zonas
                habilitadas{addressParts.addressLocality ? ` de ${addressParts.addressLocality}` : ''}. El costo varía según el barrio
                seleccionado.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold text-foreground text-base">
                4. Política de Devoluciones
              </h3>
              <p>
                Por tratarse de productos alimenticios perecederos, no se aceptan
                devoluciones una vez despachado el pedido. En caso de error en el
                pedido imputable a Ohana Bowls, se gestionará un reembolso o
                reposición del producto.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold text-foreground text-base">
                5. Autorización para el Tratamiento de Datos Personales
              </h3>
              <p>
                En cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013
                sobre Protección de Datos Personales en Colombia, al aceptar estos
                términos usted autoriza a Ohana Bowls para:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Recolectar y almacenar su nombre y número de teléfono con el
                  fin exclusivo de gestionar su pedido.
                </li>
                <li>
                  Contactarle a través de WhatsApp para confirmar su pedido,
                  informar sobre el estado de la entrega o resolver inquietudes.
                </li>
                <li>
                  Conservar el historial de pedidos para mejorar nuestro servicio.
                </li>
              </ul>
              <p>
                Sus datos no serán compartidos con terceros sin su consentimiento
                expreso. Usted tiene derecho a conocer, actualizar, rectificar y
                suprimir sus datos personales en cualquier momento contactándonos
                a través de WhatsApp al número {businessPhoneLabel ?? 'configurado en el panel administrativo'}.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold text-foreground text-base">
                6. Contacto
              </h3>
              <p>
                Para cualquier inquietud sobre estos términos o el tratamiento
                de sus datos personales, comuníquese con nosotros:
              </p>
              <p className="font-medium text-foreground">
                {businessSettings?.contactAddress ? <>Ohana Bowls — {businessSettings.contactAddress}<br/></> : null}
                {businessPhoneLabel ? <>WhatsApp: {businessPhoneLabel}<br/></> : null}
                {businessSettings?.instagramHandle ? <>Instagram: {businessSettings.instagramHandle}</> : null}
              </p>
            </section>

            <p className="text-xs text-muted-foreground/70 pt-2 border-t border-border/40">
              Última actualización: marzo 2026{addressParts.addressLocality ? ` · ${addressParts.addressLocality}, Colombia` : ''}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
