import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Instagram, Facebook } from 'lucide-react';
import { AnimatedElement } from '@/components/ui/AnimatedElement';
import {
  buildBusinessWhatsAppUrl,
  formatBusinessPhone,
  parseBusinessAddress,
} from '@/domain/businessSettings';
import { useBusinessSettings } from '@/hooks/use-catalog';

export default function Footer() {
  const { data: businessSettings } = useBusinessSettings();
  const whatsappLabel = formatBusinessPhone(businessSettings?.whatsappNumber);
  const whatsappHref = buildBusinessWhatsAppUrl(businessSettings?.whatsappNumber);
  const address = parseBusinessAddress(businessSettings?.contactAddress);

  return (
    <footer className="bg-zinc-900 dark:bg-zinc-950 text-zinc-400">
      {/* Brand gradient separator */}
      <div className="h-px bg-brand/40" />

      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <AnimatedElement animation="fade-up" delay={0}>
            <span className="font-display font-black text-2xl text-brand">
              Ohana Bowls
            </span>
            <p className="text-zinc-500 text-sm leading-relaxed mt-4">
              Bowls frescos y personalizables{address.addressLocality ? ` en ${address.addressLocality}` : ''}.
            </p>
          </AnimatedElement>

          {/* Quick Links */}
          <AnimatedElement animation="fade-up" delay={75}>
            <h4 className="text-zinc-200 text-xs font-semibold uppercase tracking-widest mb-4">Enlaces</h4>
            <nav className="flex flex-col gap-2">
              {[
                { to: '/', label: 'Menú' },
                { to: '/bebidas', label: 'Bebidas' },
                { to: '/nosotros', label: 'Nosotros' },
              ].map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="text-zinc-400 hover:text-white text-sm transition-colors hover:translate-x-0.5 inline-block"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </AnimatedElement>

          {/* Contact */}
          <AnimatedElement animation="fade-up" delay={150}>
            <h4 className="text-zinc-200 text-xs font-semibold uppercase tracking-widest mb-4">Contacto</h4>
            <div className="flex flex-col gap-3">
              {businessSettings?.contactAddress && businessSettings.contactMapsUrl ? (
                <a
                  href={businessSettings.contactMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-zinc-400 hover:text-white text-sm transition-colors hover:translate-x-0.5"
                >
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{businessSettings.contactAddress}</span>
                </a>
              ) : businessSettings?.contactAddress ? (
                <div className="flex items-start gap-2 text-zinc-400 text-sm">
                  <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{businessSettings.contactAddress}</span>
                </div>
              ) : null}
              {whatsappLabel && whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors hover:translate-x-0.5"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  <span>{whatsappLabel}</span>
                </a>
              ) : null}
            </div>
          </AnimatedElement>

          {/* Hours + Social */}
          <AnimatedElement animation="fade-up" delay={225}>
            <h4 className="text-zinc-200 text-xs font-semibold uppercase tracking-widest mb-4">Horario</h4>
            <div className="flex flex-col gap-2 text-sm text-zinc-500">
              {businessSettings?.hoursWeekday ? (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Lun - Vie: {businessSettings.hoursWeekday}</span>
                </div>
              ) : null}
              {businessSettings?.hoursWeekend ? (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  <span>Sáb - Dom: {businessSettings.hoursWeekend}</span>
                </div>
              ) : null}
            </div>

            <div className="flex gap-3 mt-6">
              {businessSettings?.instagramUrl ? (
                <a
                  href={businessSettings.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-zinc-800 hover:bg-zinc-700 p-2 text-zinc-400 hover:text-white transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="h-5 w-5" />
                </a>
              ) : null}
              {businessSettings?.facebookUrl ? (
                <a
                  href={businessSettings.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-zinc-800 hover:bg-zinc-700 p-2 text-zinc-400 hover:text-white transition-colors"
                  aria-label="Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              ) : null}
            </div>
          </AnimatedElement>
        </div>

        <AnimatedElement animation="fade-in" delay={300} className="border-t border-zinc-800 mt-8 pt-8 text-center">
          <p className="text-sm text-zinc-600">
            © {new Date().getFullYear()} Ohana Bowls. Todos los derechos reservados.
          </p>
          <p className="text-xs text-zinc-700 mt-1">
            Hecho con ♥{address.addressLocality ? ` en ${address.addressLocality}` : ''}
          </p>
          <div className="mt-6 text-center">
            <Link to="/admin" className="text-[10px] text-white/15 hover:text-white/30 transition-colors select-none">
              ·
            </Link>
          </div>
        </AnimatedElement>
      </div>
    </footer>
  );
}
