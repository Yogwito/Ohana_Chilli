import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-400">
      {/* Brand gradient separator */}
      <div className="h-px bg-gradient-to-r from-ohana/40 via-transparent to-chilli-dark/40" />

      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="bg-ohana/20 text-ohana text-sm font-semibold px-3 py-1 rounded-full">Ohana</span>
              <span className="w-px h-4 bg-zinc-700" />
              <span className="bg-chilli-dark/20 text-chilli text-sm font-semibold px-3 py-1 rounded-full">Chilli</span>
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Dos experiencias gastronómicas bajo un mismo techo.
              Bowls saludables y comida rápida deliciosa.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-zinc-200 text-xs font-semibold uppercase tracking-widest mb-4">Enlaces</h4>
            <nav className="flex flex-col gap-2">
              {[
                { to: '/ohana', label: 'Menú Ohana' },
                { to: '/chilli', label: 'Menú Chilli' },
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
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-zinc-200 text-xs font-semibold uppercase tracking-widest mb-4">Contacto</h4>
            <div className="flex flex-col gap-3">
              <a
                href="https://maps.app.goo.gl/9cjJJnHzF415GcWBA?g_st=ic"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-zinc-400 hover:text-white text-sm transition-colors hover:translate-x-0.5"
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>c.c Cable Plaza Piso 4 Terraza, Manizales, Caldas</span>
              </a>
              <a
                href="tel:+573215667170"
                className="flex items-center gap-2 text-zinc-400 hover:text-white text-sm transition-colors hover:translate-x-0.5"
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span>+57 321 5667170</span>
              </a>
            </div>
          </div>

          {/* Hours + Social */}
          <div>
            <h4 className="text-zinc-200 text-xs font-semibold uppercase tracking-widest mb-4">Horario</h4>
            <div className="flex flex-col gap-2 text-sm text-zinc-500">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Lun - Vie: 11:00 - 21:00</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Sáb - Dom: 11:00 - 21:00</span>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <a
                href="https://www.instagram.com/bowlsohana?igsh=a2lhejY1emxoN2Uy"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-zinc-800 hover:bg-zinc-700 p-2 text-zinc-400 hover:text-white transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.facebook.com/share/1FMJDYhpdD/?mibextid=wwXIfr"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg bg-zinc-800 hover:bg-zinc-700 p-2 text-zinc-400 hover:text-white transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 mt-8 pt-8 text-center">
          <p className="text-sm text-zinc-600">
            © {new Date().getFullYear()} Ohana & Chilli. Todos los derechos reservados.
          </p>
          <p className="text-xs text-zinc-700 mt-1">Hecho con ♥ en Manizales</p>
        </div>
      </div>
    </footer>
  );
}
