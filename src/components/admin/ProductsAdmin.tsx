import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCategories } from '@/hooks/use-catalog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Pencil } from 'lucide-react';
import { formatPrice } from '@/domain/formatPrice';
import { cn } from '@/lib/utils';

interface UnsplashPhoto {
  id: string;
  urls: { small: string; regular: string };
  alt_description: string | null;
}

interface ProductRow {
  id: string;
  name: string;
  price_cents: number;
  category_id: string;
  brand_id: string;
  image_url: string | null;
  is_active: boolean;
}

type StatusFilter = 'all' | 'active' | 'inactive';

function ProductThumbnail({ url, name }: { url: string | null; name: string }) {
  const [err, setErr] = useState(false);
  if (!url || err) return <div className="w-10 h-10 bg-brand/20 rounded shrink-0" />;
  return (
    <img
      src={url}
      alt={name}
      className="w-10 h-10 object-cover rounded shrink-0"
      onError={() => setErr(true)}
    />
  );
}

export default function ProductsAdmin() {
  const queryClient = useQueryClient();
  const { data: categories = [] } = useCategories('ohana');

  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [form, setForm] = useState({
    name: '',
    price_cents: 0,
    image_url: '',
    is_active: true,
    category_id: '',
  });
  const [imgPreviewError, setImgPreviewError] = useState(false);
  const [saving, setSaving] = useState(false);

  const [imageTab, setImageTab] = useState<'url' | 'upload' | 'unsplash'>('url');
  const [uploading, setUploading] = useState(false);
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState<UnsplashPhoto[]>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('id,name,price_cents,category_id,brand_id,image_url,is_active')
      .order('name');
    if (error) toast.error('Error al cargar productos');
    setProducts((data ?? []) as ProductRow[]);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, []);

  const resetImageState = () => {
    setImageTab('url');
    setUnsplashQuery('');
    setUnsplashResults([]);
    setUnsplashLoading(false);
  };

  const openNew = () => {
    setEditingProduct(null);
    setForm({ name: '', price_cents: 0, image_url: '', is_active: true, category_id: '' });
    setImgPreviewError(false);
    resetImageState();
    setSheetOpen(true);
  };

  const openEdit = (p: ProductRow) => {
    setEditingProduct(p);
    setForm({
      name: p.name,
      price_cents: p.price_cents,
      image_url: p.image_url ?? '',
      is_active: p.is_active,
      category_id: p.category_id,
    });
    setImgPreviewError(false);
    resetImageState();
    setSheetOpen(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const prefix = editingProduct?.id ?? `new-${Date.now()}`;
    const path = `${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true });
    if (error) { toast.error('Error al subir imagen'); setUploading(false); return; }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    setForm(f => ({ ...f, image_url: data.publicUrl }));
    setImgPreviewError(false);
    setUploading(false);
  };

  const searchUnsplash = async () => {
    if (!unsplashQuery.trim()) return;
    setUnsplashLoading(true);
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(unsplashQuery)}&per_page=6&client_id=${import.meta.env.VITE_UNSPLASH_API_KEY ?? ''}`,
      );
      const json = await res.json();
      setUnsplashResults(json.results ?? []);
    } catch {
      toast.error('Error al buscar en Unsplash');
    }
    setUnsplashLoading(false);
  };

  const save = async () => {
    if (!form.name.trim() || !form.price_cents || !form.category_id) {
      toast.error('Nombre, precio y categoría son requeridos');
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      price_cents: form.price_cents,
      image_url: form.image_url.trim() || null,
      is_active: form.is_active,
      category_id: form.category_id,
    };
    let error;
    if (editingProduct) {
      ({ error } = await supabase.from('products').update(payload).eq('id', editingProduct.id));
    } else {
      ({ error } = await supabase.from('products').insert({ ...payload, brand_id: 'ohana' }));
    }
    if (error) {
      toast.error('Error al guardar producto');
      setSaving(false);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    toast.success(editingProduct ? 'Producto actualizado' : 'Producto creado');
    setSheetOpen(false);
    fetchProducts();
    setSaving(false);
  };

  const saveCategory = async () => {
    if (!newCatName.trim()) { toast.error('Nombre requerido'); return; }
    setSavingCat(true);
    const slug = newCatName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { data: maxOrder } = await supabase
      .from('categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .single();
    const { error } = await supabase.from('categories').insert({
      id: slug,
      brand_id: 'ohana',
      name: newCatName.trim(),
      sort_order: (maxOrder?.sort_order ?? 0) + 1,
    });
    if (error) { toast.error('Error al crear categoría'); setSavingCat(false); return; }
    await queryClient.invalidateQueries({ queryKey: ['categories'] });
    toast.success('Categoría creada');
    setCatDialogOpen(false);
    setNewCatName('');
    setSavingCat(false);
  };

  const getCategoryName = (id: string) => categories.find(c => c.id === id)?.name ?? id;

  const filtered = products.filter(p => {
    if (categoryFilter !== 'all' && p.category_id !== categoryFilter) return false;
    if (statusFilter === 'active' && !p.is_active) return false;
    if (statusFilter === 'inactive' && p.is_active) return false;
    return true;
  });

  if (loading) {
    return <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-14" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Productos ({filtered.length}/{products.length})</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setCatDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Nueva Categoría
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Nuevo Producto
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas las categorías" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="flex items-center rounded-lg border bg-card overflow-hidden text-sm">
          {(['all', 'active', 'inactive'] as StatusFilter[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={cn(
                'px-3 py-2 transition-colors',
                statusFilter === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {s === 'all' ? 'Todos' : s === 'active' ? 'Activos' : 'Inactivos'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-xl overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3 font-semibold w-16">Img</th>
              <th className="p-3 font-semibold">Nombre</th>
              <th className="p-3 font-semibold hidden md:table-cell">Categoría</th>
              <th className="p-3 font-semibold">Precio</th>
              <th className="p-3 font-semibold text-center">Estado</th>
              <th className="p-3 font-semibold text-right">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td className="p-6 text-center text-muted-foreground" colSpan={6}>Sin productos</td></tr>
            )}
            {filtered.map(p => (
              <tr key={p.id} className={cn('border-b last:border-b-0', !p.is_active && 'opacity-60')}>
                <td className="p-3">
                  <ProductThumbnail url={p.image_url} name={p.name} />
                </td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-muted-foreground hidden md:table-cell">{getCategoryName(p.category_id)}</td>
                <td className="p-3 font-semibold">{formatPrice(p.price_cents)}</td>
                <td className="p-3 text-center">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                    p.is_active ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground',
                  )}>
                    {p.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(p)} aria-label="Editar">
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit / New Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Nombre del producto"
              />
            </div>
            <div>
              <Label>Precio (COP)</Label>
              <Input
                type="number"
                value={form.price_cents || ''}
                onChange={e => setForm(f => ({ ...f, price_cents: Number(e.target.value) }))}
                placeholder="ej: 27900"
              />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecciona categoría" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Imagen</Label>
              <Tabs value={imageTab} onValueChange={(v) => setImageTab(v as typeof imageTab)} className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="url" className="flex-1">URL</TabsTrigger>
                  <TabsTrigger value="upload" className="flex-1">Subir archivo</TabsTrigger>
                  <TabsTrigger value="unsplash" className="flex-1">Unsplash</TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="mt-2">
                  <Input
                    value={form.image_url}
                    onChange={e => { setForm(f => ({ ...f, image_url: e.target.value })); setImgPreviewError(false); }}
                    placeholder="https://..."
                  />
                </TabsContent>

                <TabsContent value="upload" className="mt-2 space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer disabled:opacity-50"
                  />
                  {uploading && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Subiendo imagen...</p>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary animate-pulse rounded-full w-2/3" />
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="unsplash" className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={unsplashQuery}
                      onChange={e => setUnsplashQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchUnsplash()}
                      placeholder="ej: healthy bowl"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={searchUnsplash} disabled={unsplashLoading}>
                      {unsplashLoading ? '...' : 'Buscar'}
                    </Button>
                  </div>
                  {unsplashResults.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {unsplashResults.map(photo => (
                        <button
                          key={photo.id}
                          type="button"
                          onClick={() => { setForm(f => ({ ...f, image_url: photo.urls.regular })); setImgPreviewError(false); }}
                          className={cn(
                            'relative overflow-hidden rounded-md aspect-square ring-2 transition-all',
                            form.image_url === photo.urls.regular ? 'ring-primary' : 'ring-transparent hover:ring-primary/50',
                          )}
                        >
                          <img src={photo.urls.small} alt={photo.alt_description ?? ''} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {form.image_url && !imgPreviewError && (
                <img
                  src={form.image_url}
                  alt="Preview"
                  className="w-full h-40 object-cover rounded-xl mt-3"
                  onError={() => setImgPreviewError(true)}
                />
              )}
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="is_active_switch"
                checked={form.is_active}
                onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))}
              />
              <Label htmlFor="is_active_switch">Producto activo</Label>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="btn-ohana">
              {saving ? 'Guardando...' : editingProduct ? 'Guardar cambios' : 'Crear Producto'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Nueva Categoría Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Categoría</DialogTitle>
            <DialogDescription>La categoría se creará con slug auto-generado a partir del nombre.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nombre</Label>
              <Input
                value={newCatName}
                onChange={e => setNewCatName(e.target.value)}
                placeholder="ej: Bowls Especiales"
                onKeyDown={e => e.key === 'Enter' && saveCategory()}
              />
              {newCatName && (
                <p className="text-xs text-muted-foreground mt-1">
                  ID: {newCatName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatDialogOpen(false)}>Cancelar</Button>
            <Button onClick={saveCategory} disabled={savingCat} className="btn-ohana">
              {savingCat ? 'Creando...' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
