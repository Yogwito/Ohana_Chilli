import { Link } from "react-router-dom";
import { ArrowUpRight, Instagram, Facebook } from "lucide-react";
import {
  buildBusinessWhatsAppUrl,
  formatBusinessPhone,
} from "@/domain/businessSettings";
import { useBusinessSettings } from "@/hooks/use-catalog";
export default function Footer() {
  const { data: settings } = useBusinessSettings();
  const whatsapp = buildBusinessWhatsAppUrl(settings?.whatsappNumber);
  return (
    <footer className="experience-footer">
      <div className="experience-footer-top">
        <p>
          BUENA COMIDA.
          <br />
          MEJOR COMPAÑÍA.
        </p>
        <Link to="/#menu">
          ¿Repetimos? <ArrowUpRight size={27} />
        </Link>
      </div>
      <div className="experience-footer-grid">
        <div>
          <h3>
            Ven por el sabor.
            <br />
            Quédate por la energía.
          </h3>
          <p>{settings?.contactAddress}</p>
        </div>
        <nav aria-label="Enlaces del sitio">
          <span>EXPLORA</span>
          <Link to="/#menu">El menú</Link>
          <Link to="/#arma-tu-bowl">Crea tu bowl</Link>
          <Link to="/nosotros">Somos Ohana</Link>
          <Link to="/contacto">Encuéntranos</Link>
        </nav>
        <div>
          <span>NOS VEMOS</span>
          {settings?.hoursWeekday && <p>Lun – Vie: {settings.hoursWeekday}</p>}
          {settings?.hoursWeekend && <p>Sáb – Dom: {settings.hoursWeekend}</p>}
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer">
              {formatBusinessPhone(settings?.whatsappNumber)} ↗
            </a>
          )}
        </div>
        <div>
          <span>SIGAMOS CERCA</span>
          {settings?.instagramUrl && (
            <a
              href={settings.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram size={16} /> Instagram ↗
            </a>
          )}
          {settings?.facebookUrl && (
            <a
              href={settings.facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Facebook size={16} /> Facebook ↗
            </a>
          )}
        </div>
      </div>
      <div className="experience-footer-wordmark" aria-hidden="true">
        ohana<span>✳</span>
      </div>
      <div className="experience-footer-legal">
        <p>© {new Date().getFullYear()} Ohana Bowls · Manizales, Colombia</p>
        <Link to="/admin">Acceso administrativo</Link>
      </div>
    </footer>
  );
}
