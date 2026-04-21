import { MapPin, Phone, Instagram, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  buildBusinessWhatsAppUrl,
  formatBusinessPhone,
} from '@/domain/businessSettings';
import {
  useWhatsAppNumber,
  useAddress,
  useBusinessHours,
  useInstagramUrl,
  useFacebookUrl,
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
    <div className="min-h-screen py-12 sm:py-16">
      <SEOHead title="Contacto" description="Contáctanos por WhatsApp, teléfono o visítanos en Manizales. Horarios, ubicación y redes sociales de Ohana Bowls." path="/contacto" />
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="mb-4">Contáctanos</h1>
            <p className="text-xl text-muted-foreground">
              ¿Tienes preguntas? Estamos aquí para ayudarte
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">

              {/* Información */}
              <div className="bg-card rounded-2xl p-6 border">
                <h3 className="font-semibold mb-4">Información</h3>

                <div className="space-y-4">
                  {phoneLabel && whatsappHref ? (
                    <a
                      href={whatsappHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-3 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Phone className="w-5 h-5 mt-0.5 shrink-0 text-ohana" />
                      <div>
                        <p className="font-medium text-foreground">WhatsApp</p>
                        <p>{phoneLabel}</p>
                      </div>
                    </a>
                  ) : null}

                  {address ? (
                    <div className="flex items-start gap-3 text-muted-foreground">
                      <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-ohana" />
                      <div>
                        <p className="font-medium text-foreground">Ubicación</p>
                        <p>{address}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Horario — only rendered while loading or when a value exists */}
              {(hoursLoading || businessHours) ? (
                <div className="bg-card rounded-2xl p-6 border">
                  <h3 className="font-semibold mb-4">Horario</h3>
                  {hoursLoading ? (
                    <Skeleton className="h-5 w-48 rounded" />
                  ) : (
                    <p className="text-muted-foreground">{businessHours}</p>
                  )}
                </div>
              ) : null}

              {/* Síguenos — only rendered when at least one URL exists */}
              {(instagramUrl || facebookUrl) ? (
                <div className="bg-card rounded-2xl p-6 border">
                  <h3 className="font-semibold mb-4">Síguenos</h3>

                  <div className="space-y-3">
                    {instagramUrl ? (
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Instagram className="w-5 h-5 text-ohana shrink-0" />
                        <span>Instagram</span>
                      </a>
                    ) : null}

                    {facebookUrl ? (
                      <a
                        href={facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Facebook className="w-5 h-5 text-ohana shrink-0" />
                        <span>Facebook</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>

            {/* CTA card */}
            <div className="flex flex-col">
              <div className="bg-ohana-gradient rounded-2xl p-8 flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-ohana/10 flex items-center justify-center mb-6">
                  <span className="text-4xl">💬</span>
                </div>
                <h3 className="text-2xl font-bold mb-3">¿Necesitas ayuda?</h3>
                <p className="text-muted-foreground mb-6">
                  Haz tu pedido o resuelve tus dudas directamente por WhatsApp — respondemos en minutos.
                </p>

                {whatsappHref ? (
                  <Button asChild size="lg" className="bg-green-500 hover:bg-green-600 text-white">
                    <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                      <Phone className="w-5 h-5 mr-2" />
                      Enviar WhatsApp
                    </a>
                  </Button>
                ) : (
                  <Button size="lg" disabled className="bg-green-500 text-white">
                    <Phone className="w-5 h-5 mr-2" />
                    WhatsApp no configurado
                  </Button>
                )}

                <p className="mt-4 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                  Respondemos en minutos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
