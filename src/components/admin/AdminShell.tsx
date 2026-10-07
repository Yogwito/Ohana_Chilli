import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BarChart3, ClipboardList, LogOut, Menu, Package, Ruler, Salad, Settings, Tag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import OrderAlerts from './OrderAlerts';
import './admin.css';

const adminSections = [
  { id: 'orders', label: 'Pedidos', group: 'Operación', icon: ClipboardList, description: 'Cada pedido, a su tiempo. Organiza el trabajo de tu equipo.' },
  { id: 'delivery_zones', label: 'Domicilios', group: 'Operación', icon: Truck, description: 'Zonas de entrega y tarifas para llegar a tus clientes.' },
  { id: 'products', label: 'Productos', group: 'Catálogo', icon: Package, description: 'Todo lo que tus clientes encuentran en la carta.' },
  { id: 'categories', label: 'Categorías', group: 'Catálogo', icon: Tag, description: 'Una carta organizada para encontrar cada antojo.' },
  { id: 'ingredients', label: 'Ingredientes', group: 'Catálogo', icon: Salad, description: 'Disponibilidad, precios y opciones para cada bowl.' },
  { id: 'bowl_rules', label: 'Bowls', group: 'Catálogo', icon: Ruler, description: 'Tamaños, porciones incluidas y precios de tus bowls.' },
  { id: 'promotions', label: 'Promociones', group: 'Catálogo', icon: Tag, description: 'Dale un lugar especial a las novedades de tu carta.' },
  { id: 'analytics', label: 'Estadísticas', group: 'Gestión', icon: BarChart3, description: 'Una mirada a los pedidos y al movimiento de tu negocio.' },
  { id: 'settings', label: 'Configuración', group: 'Gestión', icon: Settings, description: 'Horarios, contacto y detalles de tu negocio.' },
] as const;
export type AdminSection = typeof adminSections[number]['id'];

export default function AdminShell({ section, onSectionChange, email, onSignOut, children }: {
  section: AdminSection; onSectionChange: (section: AdminSection) => void;
  email?: string; onSignOut: () => void; children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const active = adminSections.find(item => item.id === section)!;
  const navigation = <nav aria-label="Administración" className="admin-navigation">
    {['Operación', 'Catálogo', 'Gestión'].map(group => <div key={group} className="admin-nav-group">
      <p>{group}</p>
      {adminSections.filter(item => item.group === group).map(item => <button key={item.id}
        aria-current={section === item.id ? 'page' : undefined}
        onClick={() => { onSectionChange(item.id); setMenuOpen(false); }}>
        <item.icon size={18} aria-hidden="true" /><span>{item.label}</span>
        {section === item.id && <span className="admin-nav-dot" />}
      </button>)}
    </div>)}
  </nav>;
  return <div className="admin-app">
    <a href="#admin-content" className="admin-skip">Ir al contenido</a>
    <OrderAlerts header={<>
      <aside className="admin-sidebar">
        <Link to="/" className="admin-wordmark" aria-label="Ohana Bowls, ir al sitio">ohana<span>bowls · administración</span></Link>
        {navigation}
        <div className="admin-sidebar-foot"><span className="admin-brand-flower" aria-hidden="true">✳</span><p>Todo listo para<br /><strong>servir algo bueno.</strong></p></div>
      </aside>
      <header className="admin-topbar">
        <Button variant="ghost" className="admin-menu-button" aria-label="Abrir navegación" onClick={() => setMenuOpen(true)}><Menu size={22} /></Button>
        <div className="admin-breadcrumb">Ohana <span>/</span> <strong>{active.label}</strong></div>
        <div className="admin-account"><span title={email}>{email}</span><Link to="/" className="admin-site-link">Ver sitio <ArrowUpRight size={16} /></Link><Button variant="ghost" onClick={onSignOut}><LogOut size={17} /><span className="sr-only sm:not-sr-only">Salir</span></Button></div>
      </header>
    </>}>
      <main id="admin-content" tabIndex={-1} className="admin-main">
        <div className="admin-page-heading"><p className="admin-eyebrow">{active.group} / Ohana Bowls</p><h1>{active.label}</h1><p>{active.description}</p></div>
        <div className="admin-content">{children}</div>
      </main>
    </OrderAlerts>
    <Sheet open={menuOpen} onOpenChange={setMenuOpen}><SheetContent side="left" aria-describedby={undefined} className="admin-mobile-nav"><SheetTitle className="admin-wordmark">ohana<span>bowls · administración</span></SheetTitle>{navigation}</SheetContent></Sheet>
  </div>;
}
