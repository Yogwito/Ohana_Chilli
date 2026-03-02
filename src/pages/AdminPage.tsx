import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { formatPrice } from '@/domain/formatPrice';
import {
  LogOut, Package, Salad, Ruler, Settings, Plus, Pencil, Trash2, Save, ClipboardList,
  Leaf, Flame,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────
interface ProductRow {
  id: string; name: string; description: string | null; price_cents: number; brand_id: string;
  category_id: string; is_active: boolean; is_vegan: boolean | null; is_gluten_free: boolean | null;
  is_popular: boolean | null; is_new: boolean | null; image_url: string | null;
  calories: number | null; ingredients_list: string[] | null;
}

interface IngredientRow {
  id: string; name: string; type: string; price_cents: number; is_active: boolean;
  calories: number | null; is_vegan: boolean | null; is_gluten_free: boolean | null;
}

interface BowlRuleRow {
  size: string; name: string; price_cents: number; bases: number; proteins: number; accompaniments: number;
}

interface OrderRow {
  id: string; customer_name: string; phone: string; order_type: string;
  total_cents: number; status: string; created_at: string; notes: string | null; address: string | null;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, signOut } = useAdminAuth();

  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) navigate('/admin/login');
  }, [authLoading, user, isAdmin, navigate]);

  if (authLoading || !isAdmin) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-12 w-48" /></div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span className="text-ohana">Ohana</span>&<span className="text-chilli-dark">Chilli</span>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Admin</span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:block">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/'); }}>
              <LogOut className="w-4 h-4 mr-1" /> Salir
            </Button>
          </div>
        </div>
      </header>

      <div className="container py-6">
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="mb-6 flex flex-wrap">
            <TabsTrigger value="orders" className="flex items-center gap-1"><ClipboardList className="w-4 h-4" />Pedidos</TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-1"><Package className="w-4 h-4" />Productos</TabsTrigger>
            <TabsTrigger value="ingredients" className="flex items-center gap-1"><Salad className="w-4 h-4" />Ingredientes</TabsTrigger>
            <TabsTrigger value="bowl_rules" className="flex items-center gap-1"><Ruler className="w-4 h-4" />Bowl Rules</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1"><Settings className="w-4 h-4" />Config</TabsTrigger>
          </TabsList>

          <TabsContent value="orders"><OrdersAdmin /></TabsContent>
          <TabsContent value="products"><ProductsAdmin /></TabsContent>
          <TabsContent value="ingredients"><IngredientsAdmin /></TabsContent>
          <TabsContent value="bowl_rules"><BowlRulesAdmin /></TabsContent>
          <TabsContent value="settings"><SettingsAdmin /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Orders Admin ────────────────────────────────────────
function OrdersAdmin() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    setLoading(true);
    const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50);
    setOrders((data ?? []) as OrderRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', id);
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    toast.success(`Pedido actualizado a ${status}`);
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Pedidos recientes</h2>
        <Button variant="outline" size="sm" onClick={fetchOrders}>Refrescar</Button>
      </div>
      {orders.length === 0 ? (
        <p className="text-center py-12 text-muted-foreground">No hay pedidos</p>
      ) : orders.map(order => (
        <div key={order.id} className="bg-card border rounded-xl p-4 space-y-3">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="font-semibold">{order.customer_name}</p>
              <p className="text-xs text-muted-foreground">{order.phone} • {new Date(order.created_at).toLocaleString('es-CO')}</p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={order.status}
                onChange={(e) => updateStatus(order.id, e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background"
              >
                {['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="font-bold text-primary">{formatPrice(order.total_cents)}</span>
            </div>
          </div>
          {order.address && <p className="text-xs text-muted-foreground">📍 {order.address}</p>}
          {order.notes && <p className="text-xs text-muted-foreground">📝 {order.notes}</p>}
          <p className="text-xs font-mono text-muted-foreground">ID: {order.id.slice(0, 8)}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Products Admin ──────────────────────────────────────
function ProductsAdmin() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ProductRow>>({});

  const fetchProducts = async () => {
    setLoading(true);
    // Admin can see all products (active and inactive) via RLS
    const { data } = await supabase.from('products').select('*').order('brand_id').order('name');
    setProducts((data ?? []) as ProductRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const startEdit = (p: ProductRow) => {
    setEditing(p.id);
    setEditForm({ name: p.name, price_cents: p.price_cents, is_active: p.is_active, description: p.description });
  };

  const saveEdit = async (id: string) => {
    const { error } = await supabase.from('products').update(editForm).eq('id', id);
    if (error) { toast.error('Error al guardar'); return; }
    toast.success('Producto actualizado');
    setEditing(null);
    fetchProducts();
  };

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('products').update({ is_active: active }).eq('id', id);
    setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: active } : p));
    toast.success(active ? 'Producto activado' : 'Producto desactivado');
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>;

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold mb-4">Productos ({products.length})</h2>
      {products.map(p => (
        <div key={p.id} className={`bg-card border rounded-xl p-4 ${!p.is_active ? 'opacity-60' : ''}`}>
          {editing === p.id ? (
            <div className="space-y-3">
              <Input value={editForm.name ?? ''} onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))} placeholder="Nombre" />
              <Input type="number" value={editForm.price_cents ?? 0} onChange={e => setEditForm(prev => ({ ...prev, price_cents: Number(e.target.value) }))} placeholder="Precio (centavos)" />
              <Input value={editForm.description ?? ''} onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))} placeholder="Descripción" />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveEdit(p.id)}><Save className="w-3 h-3 mr-1" />Guardar</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${p.brand_id === 'ohana' ? 'bg-ohana/10' : 'bg-chilli/10'}`}>
                  {p.brand_id === 'ohana' ? <Leaf className="w-4 h-4 text-ohana" /> : <Flame className="w-4 h-4 text-chilli-dark" />}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{formatPrice(p.price_cents)} • {p.category_id}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={p.is_active} onCheckedChange={(v) => toggleActive(p.id, v)} aria-label="Activo" />
                <Button size="icon" variant="ghost" onClick={() => startEdit(p)} aria-label="Editar producto">
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Ingredients Admin ───────────────────────────────────
function IngredientsAdmin() {
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchIngredients = async () => {
    setLoading(true);
    const { data } = await supabase.from('ingredients').select('*').order('type').order('name');
    setIngredients((data ?? []) as IngredientRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchIngredients(); }, []);

  const toggleActive = async (id: string, active: boolean) => {
    await supabase.from('ingredients').update({ is_active: active }).eq('id', id);
    setIngredients(prev => prev.map(i => i.id === id ? { ...i, is_active: active } : i));
    toast.success(active ? 'Ingrediente activado' : 'Ingrediente desactivado');
  };

  if (loading) return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>;

  const grouped = ingredients.reduce<Record<string, IngredientRow[]>>((acc, i) => {
    (acc[i.type] = acc[i.type] || []).push(i);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Ingredientes ({ingredients.length})</h2>
      {Object.entries(grouped).map(([type, items]) => (
        <div key={type}>
          <h3 className="font-semibold text-sm uppercase text-muted-foreground mb-2">{type} ({items.length})</h3>
          <div className="space-y-2">
            {items.map(i => (
              <div key={i.id} className={`bg-card border rounded-lg p-3 flex items-center justify-between ${!i.is_active ? 'opacity-60' : ''}`}>
                <div>
                  <p className="font-medium text-sm">{i.name}</p>
                  <p className="text-xs text-muted-foreground">{i.price_cents > 0 ? formatPrice(i.price_cents) : 'Incluido'}</p>
                </div>
                <Switch checked={i.is_active} onCheckedChange={(v) => toggleActive(i.id, v)} aria-label="Activo" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Bowl Rules Admin ────────────────────────────────────
function BowlRulesAdmin() {
  const [rules, setRules] = useState<BowlRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<BowlRuleRow>>({});

  useEffect(() => {
    supabase.from('bowl_rules').select('*').then(({ data }) => {
      setRules((data ?? []) as BowlRuleRow[]);
      setLoading(false);
    });
  }, []);

  const startEdit = (r: BowlRuleRow) => {
    setEditing(r.size);
    setEditForm({ price_cents: r.price_cents, bases: r.bases, proteins: r.proteins, accompaniments: r.accompaniments });
  };

  const saveEdit = async (size: string) => {
    await supabase.from('bowl_rules').update(editForm).eq('size', size);
    toast.success('Regla actualizada');
    setEditing(null);
    const { data } = await supabase.from('bowl_rules').select('*');
    setRules((data ?? []) as BowlRuleRow[]);
  };

  if (loading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Reglas de Bowl</h2>
      {rules.map(r => (
        <div key={r.size} className="bg-card border rounded-xl p-4">
          {editing === r.size ? (
            <div className="space-y-3">
              <p className="font-bold">{r.name} ({r.size})</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Precio</Label><Input type="number" value={editForm.price_cents} onChange={e => setEditForm(p => ({ ...p, price_cents: Number(e.target.value) }))} /></div>
                <div><Label>Bases</Label><Input type="number" value={editForm.bases} onChange={e => setEditForm(p => ({ ...p, bases: Number(e.target.value) }))} /></div>
                <div><Label>Proteínas</Label><Input type="number" value={editForm.proteins} onChange={e => setEditForm(p => ({ ...p, proteins: Number(e.target.value) }))} /></div>
                <div><Label>Acomp.</Label><Input type="number" value={editForm.accompaniments} onChange={e => setEditForm(p => ({ ...p, accompaniments: Number(e.target.value) }))} /></div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => saveEdit(r.size)}><Save className="w-3 h-3 mr-1" />Guardar</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">{r.name}</p>
                <p className="text-xs text-muted-foreground">{formatPrice(r.price_cents)} • {r.bases}B / {r.proteins}P / {r.accompaniments}A</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => startEdit(r)} aria-label="Editar regla">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Settings Admin ──────────────────────────────────────
function SettingsAdmin() {
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'whatsapp_number').single().then(({ data }) => {
      setWhatsapp(data?.value ?? '');
      setLoading(false);
    });
  }, []);

  const save = async () => {
    await supabase.from('settings').update({ value: whatsapp }).eq('key', 'whatsapp_number');
    toast.success('Número de WhatsApp actualizado');
  };

  if (loading) return <Skeleton className="h-24" />;

  return (
    <div className="max-w-md space-y-6">
      <h2 className="text-xl font-bold">Configuración</h2>
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div>
          <Label>Número de WhatsApp</Label>
          <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="573215667170" />
          <p className="text-xs text-muted-foreground mt-1">Sin espacios ni guiones (ej: 573215667170)</p>
        </div>
        <Button onClick={save} className="btn-ohana"><Save className="w-4 h-4 mr-2" />Guardar</Button>
      </div>
    </div>
  );
}
