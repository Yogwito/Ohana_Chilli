import { Clock3, Facebook, Instagram, MapPin, MessageCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  buildBusinessWhatsAppUrl,
  formatBusinessPhone,
} from '@/domain/businessSettings';
import {
  useAddress,
  useBusinessHours,
  useFacebookUrl,
  useInstagramUrl,
  useWhatsAppNumber,
} from '@/hooks/use-catalog';
import SEOHead from '@/components/SEOHead';

export default function ContactPage() {
  const { data: whatsappNumber } = useWhatsAppNumber();
  const { data: address } = useAddress();
  const { data: businessHours, isLoading: hoursLoading } = useBusinessHours();
  const { data: instagramUrl } = useInstagramUrl();
  const { data: facebookUrl } = useFacebookUrl();

  const whatsappHref = buildBusinessWhatsAppUrl(
    whatsappNumber ?? undefined,
    'Hola! Tengo una pregunta sobre Ohana Bowls.',
  );
  const phoneLabel = formatBusinessPhone(whatsappNumber ?? undefined);

  return (
    <div className="min-h-screen">
      <SEOHead title="Contacto" description="Contáctanos por WhatsApp, teléfono o visítanos en Manizales. Horarios, ubicación y redes sociales de Ohana Bowls." path="/contacto" />

      <section className="bg-[hsl(var(--maiz))] text-[hsl(var(--maiz-foreground))]">
        <div className="container py-12 sm:py-16">
          <p className="section-kicker !text-foreground/55">Contacto directo</p>
          <h1 className="mt-3 max-w-3xl">Hablemos de tu próximo pedido.</h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-foreground/68 sm:text-base">
            Escríbenos para pedir, confirmar disponibilidad o resolver cualquier duda sobre el menú.
          </p>
        </div>
      </section>

      <section className="container py-12 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="section-kicker">Canales de atención</p>
            <div className="mt-5 divide-y border-y">
              {whatsappHref && phoneLabel ? (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between gap-4 py-5">
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand-muted text-brand-dark">
                      <MessageCircle className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold">WhatsApp</p>
                      <p className="mt-1 text-sm text-muted-foreground">{phoneLabel}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-brand-dark transition-transform group-hover:translate-x-1 dark:text-brand">Escribir</span>
                </a>
              ) : null}

              {address ? (
                <div className="flex items-center gap-4 py-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-brand-dark dark:text-brand">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold">Encuéntranos</p>
                    <p className="mt-1 text-sm text-muted-foreground">{address}</p>
                  </div>
                </div>
              ) : null}

              {(hoursLoading || businessHours) ? (
                <div className="flex items-center gap-4 py-5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-muted text-brand-dark dark:text-brand">
                    <Clock3 className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold">Horario</p>
                    {hoursLoading ? <Skeleton className="mt-2 h-4 w-48 rounded-sm" /> : <p className="mt-1 text-sm text-muted-foreground">{businessHours}</p>}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="bg-[hsl(var(--mesa))] p-6 text-white sm:p-8">
            <p className="font-utility text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Respuesta rápida</p>
            <h2 className="mt-3 text-4xl text-white">Tu pedido empieza con un mensaje.</h2>
            <p className="mt-4 text-sm leading-relaxed text-white/65">
              Cuéntanos qué quieres pedir y si lo necesitas para recoger o a domicilio.
            </p>
            {whatsappHref ? (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[hsl(var(--maiz))] px-5 text-sm font-extrabold text-[hsl(var(--maiz-foreground))] transition-colors hover:bg-white">
                <MessageCircle className="h-4 w-4" />
                Abrir WhatsApp
              </a>
            ) : null}

            {(instagramUrl || facebookUrl) ? (
              <div className="mt-8 border-t border-white/15 pt-6">
                <p className="text-xs font-semibold text-white/50">También estamos en</p>
                <div className="mt-3 flex gap-2">
                  {instagramUrl ? (
                    <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-md border border-white/20 text-white/70 hover:text-white" aria-label="Instagram">
                      <Instagram className="h-4 w-4" />
                    </a>
                  ) : null}
                  {facebookUrl ? (
                    <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="flex h-11 w-11 items-center justify-center rounded-md border border-white/20 text-white/70 hover:text-white" aria-label="Facebook">
                      <Facebook className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
    </div>
  );
}
