import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, Clock3, MessageCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { useBusinessSettings } from '@/hooks/use-catalog';
import { buildPlatformWhatsAppUrl } from '@/domain/whatsapp';

type PaymentStatus = 'pending' | 'approved' | 'declined' | 'voided' | 'error';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order');
  const { clearCart } = useCart();
  const { data: businessSettings } = useBusinessSettings();
  const [status, setStatus] = useState<PaymentStatus>('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      setStatus('error');
      setLoading(false);
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const checkStatus = async () => {
      attempts += 1;
      const { data, error } = await supabase.functions.invoke('wompi-payment-status', {
        body: { orderId },
      });
      if (cancelled) return;
      setLoading(false);
      if (!error && data?.status) {
        setStatus(data.status);
        if (data.status === 'approved') {
          const pendingOrderId = sessionStorage.getItem('ohana-wompi-pending-order');
          if (pendingOrderId === orderId) {
            clearCart();
            sessionStorage.removeItem('ohana-wompi-pending-order');
          }
        }
      }
      if (!cancelled && (!data?.status || data.status === 'pending') && attempts < 40) {
        window.setTimeout(checkStatus, 3000);
      }
    };

    checkStatus();
    return () => { cancelled = true; };
  }, [clearCart, orderId]);

  const whatsappUrl = useMemo(() => {
    if (status !== 'approved' || !orderId || !businessSettings?.whatsappNumber) return null;
    const message = `Hola, mi pago en línea fue aprobado. Pedido ${orderId.slice(0, 8).toUpperCase()}.`;
    return buildPlatformWhatsAppUrl(businessSettings.whatsappNumber, message).url;
  }, [businessSettings?.whatsappNumber, orderId, status]);

  const content = useMemo(() => {
    if (loading || status === 'pending') return {
      icon: <Clock3 className="h-10 w-10 text-amber-600" />,
      title: 'Estamos confirmando tu pago',
      description: 'Esto normalmente toma unos segundos. Puedes dejar esta página abierta mientras recibimos la confirmación de Wompi.',
    };
    if (status === 'approved') return {
      icon: <CheckCircle className="h-10 w-10 text-green-600" />,
      title: '¡Pago aprobado!',
      description: 'Tu pedido quedó pagado y confirmado. El equipo de Ohana ya puede comenzar a gestionarlo.',
    };
    return {
      icon: <XCircle className="h-10 w-10 text-destructive" />,
      title: 'El pago no fue aprobado',
      description: 'No se realizó ningún cobro confirmado. Conservamos tu carrito para que puedas intentarlo de nuevo o elegir otro método.',
    };
  }, [loading, status]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          {content.icon}
        </div>
        <h1 className="text-2xl font-bold">{content.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{content.description}</p>
        {orderId && (
          <p className="mt-4 text-xs text-muted-foreground">
            Pedido <span className="font-mono font-semibold text-foreground">{orderId.slice(0, 8).toUpperCase()}</span>
          </p>
        )}
        <div className="mt-7 space-y-3">
          {whatsappUrl && (
            <Button asChild className="w-full rounded-full bg-[#25D366] text-white hover:bg-[#128C7E]">
              <a href={whatsappUrl}><MessageCircle className="mr-2 h-4 w-4" />Avisar por WhatsApp</a>
            </Button>
          )}
          {status === 'approved' ? (
            <Button asChild className="w-full rounded-full">
              <Link to="/">Volver al menú</Link>
            </Button>
          ) : (
            <Button asChild className="w-full rounded-full">
              <Link to="/checkout">Volver al checkout</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full rounded-full">
            <Link to="/contacto"><MessageCircle className="mr-2 h-4 w-4" />Necesito ayuda</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
