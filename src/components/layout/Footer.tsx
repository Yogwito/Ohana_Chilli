import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Instagram, Facebook } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex mb-4">
              <span className="text-2xl font-bold text-ohana-light">Ohana</span>
              <span className="text-2xl font-bold text-muted mx-1">&</span>
              <span className="text-2xl font-bold text-chilli">Chilli</span>
            </div>
            <p className="text-muted-foreground text-sm">
              Dos experiencias gastronómicas bajo un mismo techo. 
              Bowls saludables y comida rápida deliciosa.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-background">Enlaces</h4>
            <nav className="flex flex-col gap-2">
              <Link to="/ohana" className="text-muted-foreground hover:text-background text-sm transition-colors">
                Menú Ohana
              </Link>
              <Link to="/chilli" className="text-muted-foreground hover:text-background text-sm transition-colors">
                Menú Chilli
              </Link>
              <Link to="/bebidas" className="text-muted-foreground hover:text-background text-sm transition-colors">
                Bebidas
              </Link>
              <Link to="/nosotros" className="text-muted-foreground hover:text-background text-sm transition-colors">
                Nosotros
              </Link>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-background">Contacto</h4>
            <div className="flex flex-col gap-3">
              <a 
                href="https://maps.app.goo.gl/9cjJJnHzF415GcWBA?g_st=ic" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-start gap-2 text-muted-foreground hover:text-background text-sm transition-colors"
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>c.c Cable Plaza Piso 4 Terraza, Manizales, Caldas </span>
              </a>
              <a 
                href="tel:+525512345678" 
                className="flex items-center gap-2 text-muted-foreground hover:text-background text-sm transition-colors"
              >
                <Phone className="h-4 w-4 shrink-0" />
                <span>+57 321 5667170</span>
              </a>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4 className="font-semibold mb-4 text-background">Horario</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Lun - Vie: 11:00 - 21:00</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 shrink-0" />
                <span>Sáb - Dom: 11:00 - 21:00</span>
              </div>
            </div>
            
            {/* Social */}
            <div className="flex gap-4 mt-6">
              <a 
                href="https://www.instagram.com/bowlsohana?igsh=a2lhejY1emxoN2Uy" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-background transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a 
                href="https://www.facebook.com/share/1FMJDYhpdD/?mibextid=wwXIfr" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-background transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-muted-foreground/20 mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Ohana & Chilli. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
