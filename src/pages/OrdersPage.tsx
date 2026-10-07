import { Link } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import AdminShell from '@/components/admin/AdminShell';
import { useNavigate } from 'react-router-dom';
import OrdersDashboard from '@/components/admin/OrdersDashboard';
export default function OrdersPage() {
  const {isAdmin,loading,user,signOut}=useAdminAuth();
  const navigate=useNavigate();
  if(loading)return <div className="admin-auth-state min-h-screen grid place-items-center"><p role="status">Verificando permisos…</p></div>;
  if(!isAdmin)return <div className="admin-auth-state min-h-screen grid place-items-center p-6"><div className="rounded-2xl border bg-card p-8 space-y-4"><h1 className="text-2xl">Acceso al equipo</h1><p>Inicia sesión como administrador para consultar los pedidos.</p><Link className="underline" to="/admin/login">Iniciar sesión</Link></div></div>;
  return <AdminShell section="orders" email={user?.email} onSectionChange={section => navigate(`/admin?section=${section}`)} onSignOut={async () => { await signOut(); navigate('/admin/login'); }}><OrdersDashboard /></AdminShell>;
}
