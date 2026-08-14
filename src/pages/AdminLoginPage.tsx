import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!active) return;

      if (!session?.user) {
        setCheckingSession(false);
        return;
      }

      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      if (!active) return;

      const isAdmin = !error && roles?.some(r => r.role === 'admin');
      if (isAdmin) {
        navigate('/admin', { replace: true });
        return;
      }

      await supabase.auth.signOut();
      setErrorMessage('Tu usuario no tiene permisos de administrador.');
      setCheckingSession(false);
    });

    return () => { active = false; };
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErrorMessage('Credenciales incorrectas');
      toast.error('Credenciales incorrectas');
      setLoading(false);
      return;
    }

    // Check admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setErrorMessage('Error de autenticación. Intenta nuevamente.');
      toast.error('Error de autenticación');
      setLoading(false);
      return;
    }

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    const isAdmin = roles?.some(r => r.role === 'admin');

    if (!isAdmin) {
      await supabase.auth.signOut();
      setErrorMessage('No tienes permisos de administrador.');
      toast.error('No tienes permisos de administrador');
      setLoading(false);
      return;
    }

    toast.success('Bienvenido, admin');
    navigate('/admin');
    setLoading(false);
  };

  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[hsl(var(--mesa))]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/25 border-t-[hsl(var(--maiz))]" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[hsl(var(--mesa))] p-4 sm:justify-end sm:p-8 lg:p-12">
      <img src="/images/bowl-hero-poster-v2.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,28,20,0.9),rgba(10,28,20,0.55))]" />

      <a href="/" className="absolute left-6 top-6 z-10 font-display text-3xl font-black text-white sm:left-8 sm:top-8">
        OHANA
      </a>

      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-md border border-white/15 bg-background p-6 shadow-2xl sm:p-8">
          <div className="mb-8">
            <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-md bg-brand-muted">
              <Lock className="h-5 w-5 text-brand-dark" />
            </div>
            <p className="section-kicker">Acceso interno</p>
            <h1 className="mt-2 text-4xl leading-none text-foreground">Panel administrativo</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Ingresa con la cuenta autorizada para gestionar menú, pedidos y configuración.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@ohanachilli.com" className="h-12 rounded-md pl-10" autoComplete="email" required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="h-12 rounded-md pl-10" autoComplete="current-password" required />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="btn-ohana !mt-6 w-full">
              {loading ? 'Verificando...' : 'Ingresar al panel'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
