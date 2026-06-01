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
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-card rounded-2xl border shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="font-display font-black text-3xl text-brand mb-4">Ohana Bowls</div>
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Panel de Administración</h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errorMessage}
              </p>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@ohanachilli.com" className="pl-10" required />
              </div>
            </div>
            <div>
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-10" required />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full btn-ohana">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
