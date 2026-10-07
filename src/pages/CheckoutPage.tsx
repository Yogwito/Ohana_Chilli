import { reconcileCartWithCatalog } from '@/domain/cartCatalogSync';
import { useEffect, useMemo, useState, useRef, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '@/context/CartContext';
import { useActiveDeliveryZones, useBusinessSettings, useBusinessOpenStatus, useBowlRules, useIngredients, useProducts, usePromotions } from '@/hooks/use-catalog';
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
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Banknote,
  CheckCircle,
  CreditCard,
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
import { formatOrderReceiptMessage, type OrderReceipt } from '@/domain/orderReceipt';
import { formatPrice } from '@/domain/formatPrice';
import { formatBowlSummary } from '@/domain/bowlSummary';
import { formatProductCustomizationLines } from '@/domain/productCustomizations';
import { findDeliveryZoneByIdOrName } from '@/domain/deliveryZones';
import { buildPlatformWhatsAppUrl, generateWhatsAppMessage, openWhatsAppHandoff } from '@/domain/whatsapp';
import { trackEvent } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import { AnimatedElement } from '@/components/ui/AnimatedElement';
import CartItemVisual from '@/components/cart/CartItemVisual';
import BrandIllustration from '@/components/ohana/BrandIllustration';
import { useIsMobile } from '@/hooks/use-mobile';
import RecentOrders from '@/components/checkout/RecentOrders';
import BotProtection from '@/components/checkout/BotProtection';
import { checkoutAttempt, getPendingCheckout, pendingCheckoutStorageKey, orderApi, orderItemRequest, OrderApiError, isMaintenanceError, type CanonicalQuote, type PendingCheckoutAttempt } from '@/lib/orderApi';

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
  const isMobile = useIsMobile();
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const location = useLocation();
  const { cart, updateQuantity, removeItem, clearCart } = useCart();
  const catalogProducts = useProducts();
  const catalogPromotions = usePromotions();
  const [pendingAttempt, setPendingAttempt] = useState(getPendingCheckout);
  const [recovering, setRecovering] = useState(false);
  const recoveryInFlight = useRef(false);
  const [pendingReviewQuote, setPendingReviewQuote] = useState<CanonicalQuote | null>(null);
  const catalogIngredients = useIngredients();
  const catalogRules = useBowlRules();
  const { data: businessSettings } = useBusinessSettings();
  const { isClosed: isBusinessClosed, isOpen: isBusinessOpen, isEnforced: isHoursEnforced } = useBusinessOpenStatus();
  const {
    data: deliveryZones = [],
    isLoading: loadingDeliveryZones,
    error: deliveryZonesError,
  } = useActiveDeliveryZones();

  const [orderStatus, setOrderStatus] = useState<OrderStatus>('idle');
  useEffect(() => {
    if (orderStatus === 'created') window.scrollTo({ top: 0, behavior: 'instant' });
  }, [orderStatus]);
  const [botToken, setBotToken] = useState('');
  const [botReset, setBotReset] = useState(0);
  const [trackingUrl, setTrackingUrl] = useState('');
  const [reviewQuote, setReviewQuote] = useState<CanonicalQuote | null>(null);
  const [acceptedQuote, setAcceptedQuote] = useState('');
  const [reviewKey, setReviewKey] = useState('');
  const [acceptedPreview, setAcceptedPreview] = useState<{key:string;quote:CanonicalQuote} | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [whatsappMessage, setWhatsappMessage] = useState<string>('');
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');
  const [submitError, setSubmitError] = useState<string>('');
  const [selectedZoneId, setSelectedZoneId] = useState(pendingAttempt?.request?.delivery_zone_id || '');
  const [platform, setPlatform] = useState<'mobile' | 'desktop'>('mobile');

  // CHANGE 1 — delivery as default
  const [form, setForm] = useState<CheckoutForm>({
    name: pendingAttempt?.request?.customer_name || '',
    phone: pendingAttempt?.request?.phone || '',
    orderType: pendingAttempt?.request?.order_type || 'delivery',
    address: pendingAttempt?.request?.address || '',
    deliveryZone: '',
    notes: pendingAttempt?.request?.notes || '',
  });
  const [maintenance, setMaintenance] = useState(false);
  const priorAttemptRef = useRef(false);
  const [errors, setErrors] = useState<Partial<Record<keyof CheckoutForm, string>>>({});

  // CHANGE 2 — payment method state
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'online'>(pendingAttempt?.request?.payment_method || 'cash');

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
  const requestReviewKey = JSON.stringify({items:cart.items,zone:selectedZoneId,type:form.orderType});
  const quotedPrices = acceptedPreview?.key === requestReviewKey ? acceptedPreview.quote : null;
  const deliveryFeeCents = quotedPrices ? quotedPrices.delivery_fee : form.orderType === 'delivery' ? selectedDeliveryZone?.feeCents ?? 0 : 0;
  const orderSubtotal = quotedPrices ? quotedPrices.subtotal : cart.subtotal;
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
    if (quotedPrices) return formatOrderReceiptMessage(quotedPrices,{id:'PREVIEW000',name:form.name||'Cliente',phone:form.phone,orderType:form.orderType,address:form.address,notes:form.notes,paymentMethod});
    return generateWhatsAppMessage(cart.items, orderTotal, {
      name: form.name || 'Cliente',
      phone: form.phone || '',
      orderType: form.orderType,
      address: form.address,
      deliveryZone: selectedDeliveryZone?.name,
      deliveryFeeCents,
      notes: form.notes,
      orderId: 'PREVIEW000',
      paymentMethod: paymentMethod === 'online' ? undefined : paymentMethod,
    });
  }, [cart.items, orderTotal, form, selectedDeliveryZone, deliveryFeeCents, paymentMethod, quotedPrices]);

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
    if (getPendingCheckout()) { setSubmitError('Verifica o reenvía la solicitud original antes de crear otro pedido.'); return; }
    setSubmitError('');
    if (cart.items.some(item => item.reviewIssues?.length)) { setSubmitError('Revisa los bowls marcados en tu pedido antes de confirmar.'); return; }

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
      const [productsResult, ingredientsResult, rulesResult, promotionsResult] = await Promise.all([catalogProducts.refetch(), catalogIngredients.refetch(), catalogRules.refetch(), catalogPromotions.refetch()]);
      if (productsResult.isError || ingredientsResult.isError || rulesResult.isError || promotionsResult.isError) {setSubmitError('No pudimos verificar el menú. Intenta nuevamente.'); setOrderStatus('idle'); return;}
      const canonicalCart = reconcileCartWithCatalog(cart, {products:productsResult.data || [], ingredients:ingredientsResult.data || [], bowlRules:rulesResult.data || [], promotions:promotionsResult.data || []});
      if (canonicalCart.items.some(item => item.reviewIssues?.length) || canonicalCart.items.length !== cart.items.length || canonicalCart.items.some((item,index) => item.unitPrice !== cart.items[index]?.unitPrice)) {setSubmitError('El menú cambió. Revisa las opciones y el total actualizado antes de confirmar.'); setOrderStatus('idle'); return;}
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

      const request = {
        customer_name: form.name, phone: form.phone, order_type: form.orderType,
        address: form.address || undefined, notes: form.notes || undefined,
        delivery_zone_id: form.orderType === 'delivery' ? selectedZoneId : undefined,
        payment_method: paymentMethod, items: canonicalCart.items.map(orderItemRequest),
      };
      const quote = await orderApi<CanonicalQuote>('quote', {request});
      if ((quote.total !== orderTotal || quote.items.some((item,index) => item.unit_price_cents !== canonicalCart.items[index]?.unitPrice || item.name !== (canonicalCart.items[index]?.type === 'product' ? canonicalCart.items[index]?.product?.name : 'Bowl Personalizado'))) && acceptedQuote !== quote.fingerprint) {
        setReviewQuote(quote);
        setReviewKey(requestReviewKey);
        setOrderStatus('idle');
        return;
      }
      if (!botToken) { setSubmitError('Completa la verificación antes de enviar el pedido.'); setOrderStatus('idle'); return; }
      priorAttemptRef.current = !!getPendingCheckout();
      const attempt = await checkoutAttempt(request, quote.fingerprint);
      setPendingAttempt(attempt);
      const created = await orderApi<{id:string;total:number;receipt:OrderReceipt}>('create', {
        request, quote:quote.fingerprint, idempotency_key:attempt.key,tracking_token:attempt.token,bot_token:botToken,
      });
      const createdOrderId = created.id;
      const finalOrderTotal = created.total;
      const privateLink = `${window.location.origin}/pedido/${attempt.token}`;
      setTrackingUrl(privateLink);
      try { localStorage.setItem('ohana-tracking-links:v1',JSON.stringify([privateLink,...JSON.parse(localStorage.getItem('ohana-tracking-links:v1') || '[]')].slice(0,10))); } catch { /* Order is already persisted. */ }
      sessionStorage.removeItem(pendingCheckoutStorageKey);
      setPendingAttempt(null);

      const phone = whatsappNumber;
      const message = formatOrderReceiptMessage(created.receipt, {
        id:createdOrderId,name:form.name,phone:form.phone,orderType:form.orderType,address:form.address,notes:form.notes,paymentMethod,
      }) + `\n\nSigue tu pedido: ${privateLink}`;
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

      if (paymentMethod === 'online') {
        try { const payment = await orderApi<{url:string}>('payment',{token:attempt.token}); window.location.assign(payment.url); }
        catch { toast.error('Pedido guardado. Abre el seguimiento para continuar el pago.'); }
      } else if (detectedPlatform === 'desktop') {
        openWhatsAppHandoff(phone, message);
        toast.success('WhatsApp Web se abrió en una nueva pestaña.');
      } else {
        toast.success('Pedido creado. Toca "Abrir WhatsApp" para enviar.');
      }
    } catch (err) {
      if (isMaintenanceError(err)) {
        // orders_disabled rejects before any order is written, so a FRESH attempt is dropped; an attempt that
        // already existed (earlier uncertain submit) keeps its idempotency key so re-enabling cannot duplicate it.
        if (err.code === 'orders_disabled' && !priorAttemptRef.current) { sessionStorage.removeItem(pendingCheckoutStorageKey); setPendingAttempt(null); }
        else setPendingAttempt(getPendingCheckout());
        setMaintenance(true);setBotReset(value => value+1);setSubmitError(err.message);setOrderStatus('idle');
        return;
      }
      // Keep the original identity after any uncertain submission, including a refresh.
      setPendingAttempt(getPendingCheckout());
      setBotReset(value => value+1);
      setSubmitError(err instanceof OrderApiError ? err.message : 'No pudimos verificar si el pedido se guardó. Reintenta sin cambiar los datos para evitar duplicados.');
      toast.error('Error inesperado. Intenta de nuevo.');
      setOrderStatus('idle');
    }
  };

  const finishRecovery = (pending: PendingCheckoutAttempt) => {
    const link = `${window.location.origin}/pedido/${pending.token}`;
    try { localStorage.setItem('ohana-tracking-links:v1',JSON.stringify([link,...JSON.parse(localStorage.getItem('ohana-tracking-links:v1') || '[]').filter((saved: string) => saved !== link)].slice(0,10))); } catch { /* Order is persisted. */ }
    // Recovery belongs to the original request, which can differ from later cart edits.
    try {
      if (pending.request && JSON.stringify(cart.items.map(orderItemRequest)) === JSON.stringify(pending.request.items)) clearCart();
    } catch { /* Preserve an incomplete or subsequently edited cart. */ }
    sessionStorage.removeItem(pendingCheckoutStorageKey);
    setPendingAttempt(null);
    navigate(`/pedido/${pending.token}`);
  };

  const recoverPendingOrder = async () => {
    const pending = getPendingCheckout();
    if (!pending || recoveryInFlight.current) return;
    recoveryInFlight.current = true;
    setRecovering(true);
    try {
      await orderApi('track',{token:pending.token});
      finishRecovery(pending);
    } catch(error) {
      setSubmitError(error instanceof OrderApiError && error.code === 'tracking_not_found'
        ? 'El pedido aún no aparece. Puedes reenviar exactamente la solicitud original con el mismo identificador.'
        : 'No pudimos verificar el pedido anterior. Conservamos la solicitud para evitar duplicados.');
    } finally { recoveryInFlight.current = false; setRecovering(false); }
  };

  const retryPendingOrder = async () => {
    const pending = getPendingCheckout();
    if (!pending?.request || !pending.quote || !botToken || recoveryInFlight.current) return;
    recoveryInFlight.current = true;
    setRecovering(true);
    setSubmitError('');
    try {
      const attempt = await checkoutAttempt(pending.request, pending.quote);
      await orderApi('create', {request:pending.request, quote:pending.quote,
        idempotency_key:attempt.key, tracking_token:attempt.token, bot_token:botToken});
      finishRecovery(attempt);
    } catch(error) {
      if (isMaintenanceError(error)) { setMaintenance(true); setSubmitError(error.message); }
      else if (error instanceof OrderApiError && error.code === 'quote_changed') {
        // A quote rejection is pre-commit, but retain the key while requesting explicit review.
        try {
          const quote = await orderApi<CanonicalQuote>('quote',{request:pending.request});
          setPendingReviewQuote(quote);
        } catch { setSubmitError('La solicitud original no está disponible. Conservamos su identificador; verifica el pedido o contacta al negocio.'); }
      } else setSubmitError(error instanceof OrderApiError ? error.message : 'No pudimos confirmar el resultado. Vuelve a verificar; el identificador original sigue guardado.');
      setBotReset(value => value + 1);
    } finally { recoveryInFlight.current = false; setRecovering(false); }
  };

  const pendingRecovery = pendingAttempt && <section role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 space-y-3">
    <p className="font-semibold">Hay un pedido pendiente de confirmar</p>
    <p className="text-sm">Conservamos los datos originales solo en esta pestaña. Verifica el resultado antes de cambiar el pedido. Reenviar conserva el mismo identificador y los mismos datos.</p>
    <Button type="button" variant="outline" disabled={recovering} onClick={recoverPendingOrder}>Verificar pedido anterior</Button>
    {pendingAttempt.request && pendingAttempt.quote && <Button type="button" variant="outline" disabled={recovering || !botToken} onClick={retryPendingOrder}>Reenviar solicitud original</Button>}
    {pendingReviewQuote && <div className="space-y-2">
      <p>El presupuesto original cambió. Revisa los importes antes de reenviar:</p>
      {pendingReviewQuote.items.map((item,index) => <p key={index}>{item.quantity} × {item.name}: {formatPrice(item.unit_price_cents * item.quantity)}</p>)}
      <p>Domicilio: {formatPrice(pendingReviewQuote.delivery_fee)}</p><strong>Total: {formatPrice(pendingReviewQuote.total)}</strong>
      <Button type="button" onClick={async () => { try { setPendingAttempt(await checkoutAttempt(pendingAttempt.request, pendingReviewQuote.fingerprint)); setPendingReviewQuote(null); } catch { setSubmitError('No se pudo recuperar la solicitud original. Verifica el pedido anterior.'); } }}>Aceptar presupuesto para la solicitud original</Button>
    </div>}
    {submitError && <p role="alert">{submitError}</p>}
  </section>;

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
      <div className="experience-order-state min-h-screen flex items-center justify-center py-12">
        <div className="text-center max-w-sm px-4 animate-scale-in">
          <div className="flex items-center justify-center mb-8">
            <div className="w-28 h-28 flex items-center justify-center">
              <BrandIllustration kind="bowl" />
            </div>
          </div>
          <RecentOrders />
          {pendingRecovery}
          {pendingAttempt && <BotProtection onToken={setBotToken} resetKey={botReset} />}
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
      <div className="experience-order-state min-h-screen flex items-center justify-center py-12 px-4">
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
              Tu pedido está guardado. El equipo debe aceptarlo antes de prepararlo. Puedes consultar su estado en el enlace privado y comunicarte por WhatsApp.
            </p>
          </div>

          {trackingUrl && <Button asChild className="w-full"><a href={trackingUrl}>Seguir mi pedido</a></Button>}
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
      <div className="experience-checkout min-h-screen py-8 sm:py-12">
        <div className="container max-w-5xl">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
          <div className="experience-checkout-heading">
            <p className="experience-eyebrow">YA CASI ES TUYO</p>
            <h1>Tu próximo buen momento.</h1>
            <p>Cuéntanos dónde lo vas a disfrutar.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
            {/* Form */}
            <div className="lg:col-span-3 order-2 lg:order-1">
              {cart.items.filter(item => item.reviewIssues?.length).map(item => <Alert key={item.id} variant="destructive" className="mb-4"><AlertTitle>Revisa tu bowl</AlertTitle><AlertDescription>{item.reviewIssues.join(' ')}<Button variant="outline" className="mt-2" onClick={() => navigate(`/?editar-bowl=${encodeURIComponent(item.id)}#arma-tu-bowl`)}>Editar bowl</Button></AlertDescription></Alert>)}
              <form onSubmit={handleSubmit} className="space-y-8">
                {pendingRecovery}
                {submitError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No pudimos enviar tu pedido</AlertTitle>
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                {/* Contact info */}
                <AnimatedElement as="div" animation="fade-up" delay={0} className="checkout-form-section relative pl-4">
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-ohana" />
                  <h3 className="text-xs uppercase tracking-[.15em] text-muted-foreground mb-4">Tus datos</h3>
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

                {/* Recent orders */}
                {form.phone.replace(/\D/g, '').length >= 10 && (
                  <AnimatedElement as="div" animation="fade-up" delay={75}>
                    <RecentOrders />
                  </AnimatedElement>
                )}

                {/* Order type */}
                <AnimatedElement as="div" animation="fade-up" delay={75} className="checkout-form-section relative pl-4">
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-ohana" />
                  <h3 className="text-xs uppercase tracking-[.15em] text-muted-foreground mb-4">¿Dónde lo disfrutas?</h3>
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
                <AnimatedElement as="div" animation="fade-up" delay={150} className="checkout-form-section checkout-payment bg-card rounded-xl p-6 border">
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

                  {import.meta.env.VITE_ONLINE_PAYMENTS_ENABLED === 'true' && <Button type="button" variant={paymentMethod==='online'?'default':'outline'} onClick={()=>setPaymentMethod('online')}>Pagar en línea · Wompi sandbox</Button>}
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
                <AnimatedElement as="div" animation="fade-up" delay={225} className="checkout-form-section relative pl-4">
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

                <div className="space-y-3 border-t border-border pt-6">
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


                  {maintenance && <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">Estamos en mantenimiento y no podemos recibir pedidos en línea por ahora. Tu carrito se conserva. <button type="button" className="underline font-medium" onClick={() => setMaintenance(false)}>Intentar de nuevo</button></div>}
                  <BotProtection onToken={setBotToken} resetKey={botReset} />
                  <Button
                    type="submit"
                    disabled={maintenance || !!pendingAttempt || cart.items.some(item => item.reviewIssues?.length) || orderStatus === 'submitting' || submitBlockedByZone || submitBlockedByClosed || !termsAccepted || !botToken}
                    className="w-full rounded-full h-12 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold transition-colors gap-2 disabled:bg-muted disabled:text-muted-foreground"
                    size="lg"
                  >
                    <MessageCircle className="w-5 h-5" />
                    {orderStatus === 'submitting' ? 'Creando pedido...' : maintenance ? 'En mantenimiento' : submitBlockedByClosed ? 'Cerrado — fuera de horario' : paymentMethod === 'online' ? 'Crear pedido y pagar' : 'Crear pedido y abrir WhatsApp'}
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
              <AnimatedElement animation="scale-up" delay={75} className="checkout-order-summary bg-card rounded-xl border p-4 sm:p-6 lg:sticky lg:top-28">
                <details open={!isMobile || summaryExpanded}>
                  <summary className="checkout-summary-toggle" onClick={event => {
                    event.preventDefault();
                    if (isMobile) setSummaryExpanded(value => !value);
                  }} aria-expanded={!isMobile || summaryExpanded}>
                    <span><strong>Tu pedido</strong><small>{cart.items.reduce((sum, item) => sum + item.quantity, 0)} productos · <span className="lg:hidden">{summaryExpanded ? 'Ocultar detalles' : 'Ver detalles'}</span></small></span>
                    <span className="checkout-summary-price">{formatPrice(orderTotal)}{form.orderType === 'delivery' && !hasSelectedDeliveryZone && <small>+ domicilio por calcular</small>}</span>
                  </summary>
                  <div className="checkout-summary-content">
                <div className="space-y-4 mb-6">
                  {cart.items.map((item, index) => {
                    const customizationLines = item.type === 'product'
                      ? formatProductCustomizationLines(item.customizations)
                      : [];

                    return (
                      <div key={item.id} className="group flex gap-3">
                        <CartItemVisual item={item} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="font-medium text-sm leading-tight">
                              {quotedPrices?.items[index]?.name || (item.type === 'product' ? item.product?.name : 'Bowl Personalizado')}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="flex h-11 w-11 items-center justify-center text-muted-foreground hover:text-destructive transition-colors shrink-0"
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
                          <div className="flex flex-wrap gap-2 items-center justify-between mt-2">
                            <div className="flex items-center gap-1 border rounded-full px-1 py-0.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="w-11 h-11 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
                                aria-label="Reducir cantidad"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-5 text-center text-xs font-medium">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="w-11 h-11 flex items-center justify-center hover:bg-muted rounded-full transition-colors"
                                aria-label="Aumentar cantidad"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            <span className="font-semibold text-sm">{formatPrice(quotedPrices ? quotedPrices.items[index].unit_price_cents * item.quantity : item.totalPrice)}</span>
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
                  </div>
                </details>
              </AnimatedElement>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!reviewQuote} onOpenChange={open => {if (!open) setReviewQuote(null);}}>
        <DialogContent><DialogHeader><DialogTitle>Revisa el precio actualizado</DialogTitle><DialogDescription>El presupuesto vigente requiere tu revisión antes de crear el pedido.</DialogDescription></DialogHeader>
          <p>El menú cambió. Este es el presupuesto vigente del negocio:</p>
          {reviewQuote?.items.map((item,index) => <p key={index}>{item.quantity} × {item.name}: {formatPrice(item.unit_price_cents * item.quantity)}</p>)}
          <p>Domicilio: {formatPrice(reviewQuote?.delivery_fee || 0)}</p>
          <strong>Total: {formatPrice(reviewQuote?.total || 0)}</strong>
          <Button onClick={() => {setAcceptedQuote(reviewQuote!.fingerprint);setAcceptedPreview({key:reviewKey,quote:reviewQuote!});setReviewQuote(null);}}>Acepto el presupuesto; volver a confirmar</Button>
        </DialogContent>
      </Dialog>
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
