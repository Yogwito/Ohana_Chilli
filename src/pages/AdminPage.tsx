import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { useCatalogMutationSync } from '@/hooks/use-catalog-sync';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  BUSINESS_SETTING_DEFINITIONS,
  type BusinessSettingKey,
} from '@/domain/businessSettings';
import { formatDeliveryZoneName, normalizeDeliveryZoneName } from '@/domain/deliveryZones';
import { formatPrice } from '@/domain/formatPrice';
import {
  LogOut, Package, Salad, Ruler, Settings, Pencil, Save, ClipboardList,
  Search, Truck, Upload, BarChart3, Plus, Tag, Trash2,
} from 'lucide-react';
import AnalyticsAdmin from '@/components/admin/AnalyticsAdmin';
import PromotionsAdmin from '@/components/admin/PromotionsAdmin';
import ProductsAdmin from '@/components/admin/ProductsAdmin';

// ─── Types ───────────────────────────────────────────────
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
  delivery_zone: string | null; delivery_fee_cents: number;
}

interface DeliveryZoneRow {
  id: string;
  name: string;
  fee_cents: number;
  is_active: boolean;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name: string;
  slug: string | null;
  brand_id: string;
  sort_order: number | null;
}

// ─── Helpers ─────────────────────────────────────────────
function toSlug(name: string) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export default function AdminPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading: authLoading, signOut } = useAdminAuth();

  useEffect(() => {
    if (!authLoading && !user) navigate('/admin/login', { replace: true });
  }, [authLoading, user, navigate]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-12 w-48" /></div>;
  }

  if (user && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold">Acceso no autorizado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu sesión está activa, pero no tiene permisos de administrador.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button variant="outline" onClick={() => navigate('/')}>
              Volver al inicio
            </Button>
            <Button
              onClick={async () => {
                await signOut();
                navigate('/admin/login', { replace: true });
              }}
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center"><Skeleton className="h-12 w-48" /></div>;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container flex h-14 items-center justify-between">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span className="text-brand font-display font-black">Ohana Bowls</span>
            <span className="text-muted-foreground font-normal hidden sm:inline">—</span>
            <span className="text-sm text-muted-foreground font-normal hidden sm:inline">Panel de Administración</span>
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
            <TabsTrigger value="categories" className="flex items-center gap-1"><Tag className="w-4 h-4" />Categorías</TabsTrigger>
            <TabsTrigger value="ingredients" className="flex items-center gap-1"><Salad className="w-4 h-4" />Ingredientes</TabsTrigger>
            <TabsTrigger value="bowl_rules" className="flex items-center gap-1"><Ruler className="w-4 h-4" />Bowl Rules</TabsTrigger>
            <TabsTrigger value="delivery_zones" className="flex items-center gap-1"><Truck className="w-4 h-4" />Domicilios</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1"><Settings className="w-4 h-4" />Config</TabsTrigger>
            <TabsTrigger value="promotions" className="flex items-center gap-1">🏷️ Promociones</TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-1"><BarChart3 className="w-4 h-4" />Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="orders"><OrdersAdmin /></TabsContent>
          <TabsContent value="products"><ProductsAdmin /></TabsContent>
          <TabsContent value="categories"><CategoriesAdmin /></TabsContent>
          <TabsContent value="ingredients"><IngredientsAdmin /></TabsContent>
          <TabsContent value="bowl_rules"><BowlRulesAdmin /></TabsContent>
          <TabsContent value="delivery_zones"><DeliveryZonesAdmin /></TabsContent>
          <TabsContent value="settings"><SettingsAdmin /></TabsContent>
          <TabsContent value="promotions"><PromotionsAdmin /></TabsContent>
          <TabsContent value="analytics"><AnalyticsAdmin /></TabsContent>
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

  // Real-time: refetch when orders are inserted or updated
  useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
        toast.success('Nuevo pedido recibido');
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, () => {
        fetchOrders();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

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
          {order.order_type === 'delivery' && (
            <div className="text-xs text-muted-foreground space-x-2">
              {order.address && <span>📍 {order.address}</span>}
              {order.delivery_zone && <span>• 🏘️ {order.delivery_zone}</span>}
              {order.delivery_fee_cents > 0 && <span>• 🚚 {formatPrice(order.delivery_fee_cents)}</span>}
            </div>
          )}
          {order.order_type === 'pickup' && <p className="text-xs text-muted-foreground">🏪 Recoger en sucursal</p>}
          {order.notes && <p className="text-xs text-muted-foreground">📝 {order.notes}</p>}
          <p className="text-xs font-mono text-muted-foreground">ID: {order.id.slice(0, 8)}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Categories Admin ─────────────────────────────────────
function CategoriesAdmin() {
  const syncCatalog = useCatalogMutationSync();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ name: string; sort_order: string }>({ name: '', sort_order: '' });
  const [newOpen, setNewOpen] = useState(false);
  const [newForm, setNewForm] = useState({ name: '', sort_order: '' });

  const load = async () => {
    setLoading(true);
    const [catRes, prodRes] = await Promise.all([
      supabase.from('categories').select('*').order('sort_order').order('name'),
      supabase.from('products').select('category_id'),
    ]);
    setCategories((catRes.data ?? []) as CategoryRow[]);
    const counts: Record<string, number> = {};
    (prodRes.data ?? []).forEach((p: { category_id: string }) => {
      counts[p.category_id] = (counts[p.category_id] ?? 0) + 1;
    });
    setProductCounts(counts);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const startEdit = (cat: CategoryRow) => {
    setEditing(cat.id);
    setEditForm({ name: cat.name, sort_order: cat.sort_order != null ? String(cat.sort_order) : '' });
  };

  const saveEdit = async (id: string) => {
    if (!editForm.name) { toast.error('Nombre requerido'); return; }
    const { error } = await supabase.from('categories').update({
      name: editForm.name,
      slug: toSlug(editForm.name),
      sort_order: editForm.sort_order !== '' ? Number(editForm.sort_order) : null,
    }).eq('id', id);
    if (error) { toast.error('Error al actualizar categoría'); return; }
    await syncCatalog(['categories']);
    toast.success('Categoría actualizada');
    setEditing(null);
    load();
  };

  const createCategory = async () => {
    if (!newForm.name) { toast.error('Nombre requerido'); return; }
    const { error } = await supabase.from('categories').insert({
      name: newForm.name,
      slug: toSlug(newForm.name),
      brand_id: 'ohana',
      sort_order: newForm.sort_order !== '' ? Number(newForm.sort_order) : null,
    });
    if (error) { toast.error('Error al crear categoría'); return; }
    await syncCatalog(['categories']);
    toast.success('Categoría creada');
    setNewOpen(false);
    setNewForm({ name: '', sort_order: '' });
    load();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { toast.error('Error al eliminar categoría'); return; }
    await syncCatalog(['categories']);
    toast.success('Categoría eliminada');
    load();
  };

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Categorías ({categories.length})</h2>
        <Button size="sm" onClick={() => setNewOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Nueva Categoría
        </Button>
      </div>

      <div className="border rounded-xl overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3 font-semibold">Nombre</th>
              <th className="p-3 font-semibold">Slug</th>
              <th className="p-3 font-semibold">Orden</th>
              <th className="p-3 font-semibold text-center">Productos</th>
              <th className="p-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr><td className="p-6 text-center text-muted-foreground" colSpan={5}>Sin categorías</td></tr>
            )}
            {categories.map(cat => (
              <tr key={cat.id} className="border-b last:border-b-0">
                {editing === cat.id ? (
                  <>
                    <td className="p-2">
                      <Input
                        value={editForm.name}
                        onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(cat.id)}
                      />
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">{toSlug(editForm.name || cat.name)}</td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={editForm.sort_order}
                        onChange={e => setEditForm(p => ({ ...p, sort_order: e.target.value }))}
                        className="w-20"
                        onKeyDown={e => e.key === 'Enter' && saveEdit(cat.id)}
                      />
                    </td>
                    <td className="p-2 text-center">{productCounts[cat.id] ?? 0}</td>
                    <td className="p-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" onClick={() => saveEdit(cat.id)}><Save className="w-3 h-3 mr-1" />Guardar</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="p-3 font-medium">{cat.name}</td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">{cat.slug ?? '—'}</td>
                    <td className="p-3 text-muted-foreground">{cat.sort_order ?? '—'}</td>
                    <td className="p-3 text-center">{productCounts[cat.id] ?? 0}</td>
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(cat)} aria-label="Editar">
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          disabled={!!(productCounts[cat.id] ?? 0)}
                          onClick={() => deleteCategory(cat.id)}
                          aria-label="Eliminar"
                          className="text-destructive hover:text-destructive disabled:opacity-30"
                          title={(productCounts[cat.id] ?? 0) > 0 ? `${productCounts[cat.id]} productos en esta categoría` : 'Eliminar categoría'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Categoría</DialogTitle>
            <DialogDescription>Crea una nueva categoría para Ohana Bowls</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input value={newForm.name} onChange={e => setNewForm(p => ({ ...p, name: e.target.value }))} placeholder="ej: Bowls Especiales" />
              {newForm.name && <p className="text-xs text-muted-foreground mt-1">Slug: {toSlug(newForm.name)}</p>}
            </div>
            <div>
              <Label>Orden</Label>
              <Input type="number" value={newForm.sort_order} onChange={e => setNewForm(p => ({ ...p, sort_order: e.target.value }))} placeholder="ej: 1" className="w-32" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOpen(false)}>Cancelar</Button>
            <Button onClick={createCategory} className="btn-ohana">Crear</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Ingredients Admin ───────────────────────────────────
function IngredientsAdmin() {
  const syncCatalog = useCatalogMutationSync();
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
    const { error } = await supabase.from('ingredients').update({ is_active: active }).eq('id', id);
    if (error) { toast.error('Error al actualizar ingrediente'); return; }
    await syncCatalog(['ingredients']);
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
  const syncCatalog = useCatalogMutationSync();
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
    const { error } = await supabase.from('bowl_rules').update(editForm).eq('size', size);
    if (error) { toast.error('Error al actualizar regla'); return; }
    await syncCatalog(['bowl_rules']);
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
function normalizeZoneName(value: string) {
  return formatDeliveryZoneName(value);
}

function normalizeZoneKey(value: string) {
  return normalizeDeliveryZoneName(value);
}

function parseFeeToCents(raw: string) {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  return Number(digits);
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function DeliveryZonesAdmin() {
  const syncCatalog = useCatalogMutationSync();
  const [zones, setZones] = useState<DeliveryZoneRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { name: string; feeInput: string; is_active: boolean }>>({});
  const [zoneOpen, setZoneOpen] = useState(false);
  const [newZoneForm, setNewZoneForm] = useState({ name: '', fee_cents: '', is_active: true });

  const loadZones = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('delivery_zones').select('*').order('name');
    if (error) {
      toast.error('No se pudieron cargar los domicilios');
      setLoading(false);
      return;
    }

    const list = (data ?? []) as DeliveryZoneRow[];
    setZones(list);
    setDrafts(
      list.reduce<Record<string, { name: string; feeInput: string; is_active: boolean }>>((acc, zone) => {
        acc[zone.id] = { name: zone.name, feeInput: String(zone.fee_cents), is_active: zone.is_active };
        return acc;
      }, {}),
    );
    setLoading(false);
  };

  useEffect(() => { loadZones(); }, []);

  const saveZone = async (zoneId: string) => {
    const draft = drafts[zoneId];
    if (!draft) return;

    const name = normalizeZoneName(draft.name);
    const feeCents = parseFeeToCents(draft.feeInput);

    if (!name) {
      toast.error('El nombre no puede estar vacio');
      return;
    }

    if (feeCents === null) {
      toast.error('La tarifa debe ser un numero valido');
      return;
    }

    setSavingId(zoneId);
    const { error } = await supabase
      .from('delivery_zones')
      .update({
        name,
        fee_cents: feeCents,
        is_active: draft.is_active,
      })
      .eq('id', zoneId);
    setSavingId(null);

    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Ya existe un domicilio con ese nombre' : 'Error al guardar domicilio');
      return;
    }

    await syncCatalog(['delivery_zones']);
    toast.success('Domicilio actualizado');
    loadZones();
  };

  const addZone = async () => {
    const name = normalizeZoneName(newZoneForm.name);
    const feeCents = parseFeeToCents(newZoneForm.fee_cents);
    if (!name) { toast.error('Nombre requerido'); return; }
    if (feeCents === null) { toast.error('Tarifa inválida'); return; }
    const { error } = await supabase.from('delivery_zones').insert({ name, fee_cents: feeCents, is_active: newZoneForm.is_active });
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Ya existe una zona con ese nombre' : 'Error al crear zona');
      return;
    }
    await syncCatalog(['delivery_zones']);
    toast.success('Zona creada');
    setZoneOpen(false);
    setNewZoneForm({ name: '', fee_cents: '', is_active: true });
    loadZones();
  };

  const importCsv = async () => {
    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast.error('El CSV debe incluir al menos una fila');
      return;
    }

    const firstRow = parseCsvLine(lines[0]).map((value) => value.toLowerCase());
    const hasHeader = firstRow.includes('name') || firstRow.includes('fee');
    const nameIndex = hasHeader ? firstRow.indexOf('name') : 0;
    const feeIndex = hasHeader ? firstRow.indexOf('fee') : 1;
    const startIndex = hasHeader ? 1 : 0;

    if (nameIndex === -1 || feeIndex === -1) {
      toast.error('Formato invalido. Usa columnas name,fee o dos columnas sin encabezado.');
      return;
    }

    setImporting(true);
    const { data: existingRows, error: existingError } = await supabase.from('delivery_zones').select('name');
    if (existingError) {
      setImporting(false);
      toast.error('No se pudo validar domicilios existentes');
      return;
    }

    const existingByKey = new Map(
      (existingRows ?? []).map((row) => [normalizeZoneKey(row.name), row.name]),
    );
    const upsertByKey = new Map<string, { name: string; fee_cents: number; existed: boolean }>();
    const errors: string[] = [];

    lines.slice(startIndex).forEach((line, index) => {
      const lineNumber = index + startIndex + 1;
      const columns = parseCsvLine(line);
      const rawName = columns[nameIndex] ?? '';
      const rawFee = columns[feeIndex] ?? '';
      const displayName = normalizeZoneName(rawName);

      if (!displayName) {
        errors.push(`Fila ${lineNumber}: name vacio`);
        return;
      }

      const feeCents = parseFeeToCents(rawFee);
      if (feeCents === null) {
        errors.push(`Fila ${lineNumber}: fee invalido (${rawFee || 'vacio'})`);
        return;
      }

      const key = normalizeZoneKey(displayName);
      upsertByKey.set(key, {
        name: existingByKey.get(key) ?? displayName,
        fee_cents: feeCents,
        existed: existingByKey.has(key),
      });
    });

    const payload = Array.from(upsertByKey.values()).map((item) => ({
      name: item.name,
      fee_cents: item.fee_cents,
      is_active: true,
    }));
    let writeSucceeded = false;

    if (payload.length > 0) {
      const { error } = await supabase.from('delivery_zones').upsert(payload, { onConflict: 'name' });
      if (error) errors.push(`Error Supabase: ${error.message}`);
      else writeSucceeded = true;
    }

    const created = Array.from(upsertByKey.values()).filter((item) => !item.existed).length;
    const updated = Array.from(upsertByKey.values()).filter((item) => item.existed).length;
    const result = { created, updated, errors };
    setSummary(result);
    setImporting(false);

    if (errors.length > 0) {
      toast.warning('Importacion finalizada con errores');
    } else {
      toast.success(`Importacion lista: ${created} creados, ${updated} actualizados`);
    }

    if (writeSucceeded) {
      await syncCatalog(['delivery_zones']);
    }
    loadZones();
  };

  const filtered = zones.filter((zone) => normalizeZoneKey(zone.name).includes(normalizeZoneKey(search)));

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">Domicilios ({zones.length})</h2>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => setZoneOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nueva Zona
          </Button>
          <Button variant="outline" onClick={() => setCsvOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Importar CSV
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          className="pl-9"
        />
      </div>

      <div className="border rounded-xl overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3 font-semibold min-w-48">Nombre</th>
              <th className="p-3 font-semibold min-w-36">Tarifa (COP)</th>
              <th className="p-3 font-semibold">Activo</th>
              <th className="p-3 font-semibold text-right">Accion</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={4}>
                  No hay domicilios para mostrar
                </td>
              </tr>
            )}
            {filtered.map((zone) => (
              <tr key={zone.id} className="border-b last:border-b-0">
                <td className="p-3">
                  <Input
                    value={drafts[zone.id]?.name ?? zone.name}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [zone.id]: { ...prev[zone.id], name: e.target.value } }))}
                  />
                </td>
                <td className="p-3">
                  <Input
                    value={drafts[zone.id]?.feeInput ?? String(zone.fee_cents)}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [zone.id]: { ...prev[zone.id], feeInput: e.target.value } }))}
                  />
                </td>
                <td className="p-3">
                  <Switch
                    checked={drafts[zone.id]?.is_active ?? zone.is_active}
                    onCheckedChange={(checked) => setDrafts((prev) => ({ ...prev, [zone.id]: { ...prev[zone.id], is_active: checked } }))}
                  />
                </td>
                <td className="p-3 text-right">
                  <Button size="sm" onClick={() => saveZone(zone.id)} disabled={savingId === zone.id}>
                    <Save className="w-3.5 h-3.5 mr-1" />
                    Guardar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Nueva Zona Dialog */}
      <Dialog open={zoneOpen} onOpenChange={setZoneOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Zona de Domicilio</DialogTitle>
            <DialogDescription>Agrega una zona individual con su tarifa</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input value={newZoneForm.name} onChange={e => setNewZoneForm(p => ({ ...p, name: e.target.value }))} placeholder="ej: Chapinero" />
            </div>
            <div>
              <Label>Tarifa (COP) *</Label>
              <Input value={newZoneForm.fee_cents} onChange={e => setNewZoneForm(p => ({ ...p, fee_cents: e.target.value }))} placeholder="ej: 5000" />
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={newZoneForm.is_active} onCheckedChange={v => setNewZoneForm(p => ({ ...p, is_active: !!v }))} />
              Activa
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setZoneOpen(false)}>Cancelar</Button>
            <Button onClick={addZone} className="btn-ohana">Crear Zona</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={csvOpen} onOpenChange={setCsvOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Importar domicilios desde CSV</DialogTitle>
            <DialogDescription>
              Pega el CSV manualmente con encabezados <code>name,fee</code> o en dos columnas sin encabezado.
            </DialogDescription>
          </DialogHeader>

          <Textarea
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'name,fee\nChapinero,5000\nUsaquen,6.500'}
            rows={12}
          />

          {summary && (
            <div className="rounded-lg border p-3 text-sm space-y-1">
              <p><span className="font-semibold">Creados:</span> {summary.created}</p>
              <p><span className="font-semibold">Actualizados:</span> {summary.updated}</p>
              <p><span className="font-semibold">Errores:</span> {summary.errors.length}</p>
              {summary.errors.length > 0 && (
                <div className="max-h-28 overflow-auto text-xs text-muted-foreground border-t pt-2">
                  {summary.errors.map((error) => <p key={error}>{error}</p>)}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCsvOpen(false)}>Cerrar</Button>
            <Button onClick={importCsv} disabled={importing}>
              {importing ? 'Importando...' : 'Importar CSV'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsAdmin() {
  const syncCatalog = useCatalogMutationSync();
  const [settingsForm, setSettingsForm] = useState<Record<BusinessSettingKey, string>>(
    () => Object.fromEntries(
      BUSINESS_SETTING_DEFINITIONS.map((setting) => [setting.key, '']),
    ) as Record<BusinessSettingKey, string>,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const keys = BUSINESS_SETTING_DEFINITIONS.map((setting) => setting.key);

    supabase
      .from('settings')
      .select('key,value')
      .in('key', keys)
      .then(({ data, error }) => {
        if (error) {
          toast.error('Error al cargar configuración');
          setLoading(false);
          return;
        }

        const nextSettings = Object.fromEntries(
          BUSINESS_SETTING_DEFINITIONS.map((setting) => [setting.key, '']),
        ) as Record<BusinessSettingKey, string>;

        (data ?? []).forEach((row) => {
          if (row.key in nextSettings) {
            nextSettings[row.key as BusinessSettingKey] = row.value ?? '';
          }
        });

        setSettingsForm(nextSettings);
        setLoading(false);
      });
  }, []);

  const save = async () => {
    const { error } = await supabase
      .from('settings')
      .upsert(
        BUSINESS_SETTING_DEFINITIONS.map((setting) => ({
          key: setting.key,
          value: settingsForm[setting.key].trim(),
        })),
        { onConflict: 'key' },
      );
    if (error) { toast.error('Error al actualizar configuración'); return; }
    await syncCatalog(['settings']);
    toast.success('Configuración actualizada');
  };

  if (loading) return <Skeleton className="h-24" />;

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-xl font-bold">Configuración</h2>
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {BUSINESS_SETTING_DEFINITIONS.map((setting) => (
            <div key={setting.key} className={setting.key === 'contact_address' ? 'md:col-span-2' : ''}>
              <Label>{setting.label}</Label>
              <Input
                value={settingsForm[setting.key]}
                onChange={(event) => setSettingsForm((prev) => ({ ...prev, [setting.key]: event.target.value }))}
                placeholder={setting.placeholder}
              />
              <p className="text-xs text-muted-foreground mt-1">{setting.description}</p>
            </div>
          ))}
        </div>
        <Button onClick={save} className="btn-ohana"><Save className="w-4 h-4 mr-2" />Guardar</Button>
      </div>
    </div>
  );
}
