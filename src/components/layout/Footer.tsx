import { Link } from 'react-router-dom';
import { Clock, Facebook, Instagram, MapPin, MessageCircle } from 'lucide-react';
import {
  buildBusinessWhatsAppUrl,
  formatBusinessPhone,
  parseBusinessAddress,
} from '@/domain/businessSettings';
import { useBusinessSettings } from '@/hooks/use-catalog';

export default function Footer() {
  const { data: settings } = useBusinessSettings();
  const whatsappLabel = formatBusinessPhone(settings?.whatsappNumber);
  const whatsappHref = buildBusinessWhatsAppUrl(settings?.whatsappNumber);
  const address = parseBusinessAddress(settings?.contactAddress);

  return (
    <footer className="bg-[hsl(var(--mesa))] text-white">
      <div className="h-2 bg-[hsl(var(--maiz))]" />
      <div className="container py-12 sm:py-16">
        <div className="grid gap-10 border-b border-white/15 pb-10 md:grid-cols-[1.2fr_0.8fr_1fr]">
          <div>
            <p className="font-display text-5xl font-black leading-none">OHANA</p>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
              Bowls frescos, platos con carácter y combinaciones hechas a tu manera
              {address.addressLocality ? ` en ${address.addressLocality}` : ''}.
            </p>
          </div>

          <nav aria-label="Enlaces del sitio">
            <p className="font-utility text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Explora</p>
            <div className="mt-4 grid gap-2">
              <Link to="/#arma-tu-bowl" className="w-fit text-sm font-semibold text-white/75 transition-colors hover:text-white">Arma tu bowl</Link>
              <Link to="/#menu" className="w-fit text-sm font-semibold text-white/75 transition-colors hover:text-white">Menú</Link>
              <Link to="/nosotros" className="w-fit text-sm font-semibold text-white/75 transition-colors hover:text-white">Nosotros</Link>
              <Link to="/contacto" className="w-fit text-sm font-semibold text-white/75 transition-colors hover:text-white">Contacto</Link>
            </div>
          </nav>

          <div>
            <p className="font-utility text-[10px] font-semibold uppercase tracking-[0.12em] text-white/45">Visítanos</p>
            <div className="mt-4 grid gap-3 text-sm text-white/70">
              {settings?.contactAddress ? (
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--maiz))]" />
                  <span>{settings.contactAddress}</span>
                </div>
              ) : null}
              {settings?.hoursWeekday ? (
                <div className="flex items-start gap-2.5">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--maiz))]" />
                  <span>{settings.hoursWeekday}</span>
                </div>
              ) : null}
              {whatsappHref && whatsappLabel ? (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 transition-colors hover:text-white">
                  <MessageCircle className="h-4 w-4 text-[hsl(var(--maiz))]" />
                  {whatsappLabel}
                </a>
              ) : null}
            </div>

            <div className="mt-5 flex gap-2">
              {settings?.instagramUrl ? (
                <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-md border border-white/20 text-white/70 transition-colors hover:border-white/50 hover:text-white" aria-label="Instagram">
                  <Instagram className="h-4 w-4" />
                </a>
              ) : null}
              {settings?.facebookUrl ? (
                <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex h-10 w-10 items-center justify-center rounded-md border border-white/20 text-white/70 transition-colors hover:border-white/50 hover:text-white" aria-label="Facebook">
                  <Facebook className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 pt-6 text-xs text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Ohana Bowls. Todos los derechos reservados.</p>
          <Link to="/admin" className="w-fit transition-colors hover:text-white/70">Acceso administrativo</Link>
        </div>
      </div>
    </footer>
  );
}
