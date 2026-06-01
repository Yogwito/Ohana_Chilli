import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCatalogMutationSync } from '@/hooks/use-catalog-sync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PromotionRow {
  id: string;
  title: string;
  description: string | null;
  type: 'informative' | 'combo';
  discount_type: 'percentage' | 'fixed' | 'label';
  discount_value: number;
  badge_text: string | null;
  image_url: string | null;
  price_cents: number | null;
  cta_text: string | null;
  cta_url: string | null;
  days_of_week: number[] | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  created_at: string;
}

type DiscountType = 'percentage' | 'fixed' | 'label';
type PromotionType = 'informative' | 'combo';
type StatusFilter = 'all' | 'active' | 'inactive';

interface FormState {
  title: string;
  description: string;
  type: PromotionType;
  discount_type: DiscountType;
  discount_value: string;
  badge_text: string;
  image_url: string;
  price_cents: string;
  cta_text: string;
  cta_url: string;
  days_of_week: number[];
  starts_at: string;
  ends_at: string;
  sort_order: string;
  is_active: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAYS = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 0, label: 'Dom' },
];

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  type: 'informative',
  discount_type: 'label',
  discount_value: '',
  badge_text: '',
  image_url: '',
  price_cents: '',
  cta_text: '',
  cta_url: '',
  days_of_week: [],
  starts_at: '',
  ends_at: '',
  sort_order: '0',
  is_active: true,
};

function formatDateRange(starts: string | null, ends: string | null): string {
  if (!starts && !ends) return 'Sin fecha';
  const fmt = (d: string) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
  if (starts && ends) return `${fmt(starts)} – ${fmt(ends)}`;
  if (starts) return `Desde ${fmt(starts)}`;
  return `Hasta ${fmt(ends!)}`;
}

function rowToForm(row: PromotionRow): FormState {
  const toDatetimeLocal = (iso: string | null) => iso ? iso.slice(0, 16) : '';
  return {
    title: row.title,
    description: row.description ?? '',
    type: row.type ?? 'informative',
    discount_type: row.discount_type,
    discount_value: row.discount_value > 0 ? String(row.discount_value) : '',
    badge_text: row.badge_text ?? '',
    image_url: row.image_url ?? '',
    price_cents: row.price_cents != null ? String(row.price_cents) : '',
    cta_text: row.cta_text ?? '',
    cta_url: row.cta_url ?? '',
    days_of_week: row.days_of_week ?? [],
    starts_at: toDatetimeLocal(row.starts_at),
    ends_at: toDatetimeLocal(row.ends_at),
    sort_order: String(row.sort_order),
    is_active: row.is_active,
  };
}

function formToPayload(form: FormState) {
  return {
    title: form.title.trim(),
    description: form.description.trim() || null,
    type: form.type,
    discount_type: form.discount_type,
    discount_value: form.discount_value !== '' ? Number(form.discount_value) : 0,
    badge_text: form.badge_text.trim() || null,
    image_url: form.image_url.trim() || null,
    price_cents: form.price_cents !== '' ? Number(form.price_cents) : null,
    cta_text: form.cta_text.trim() || null,
    cta_url: form.cta_url.trim() || null,
    days_of_week: form.days_of_week.length > 0 ? form.days_of_week : null,
    starts_at: form.starts_at || null,
    ends_at: form.ends_at || null,
    sort_order: form.sort_order !== '' ? Number(form.sort_order) : 0,
    is_active: form.is_active,
  };
}

function DayBadges({ days }: { days: number[] | null }) {
  if (!days || days.length === 0) return <span className="text-xs text-muted-foreground">Todos los días</span>;
  return (
    <div className="flex flex-wrap gap-0.5">
      {DAYS.filter(d => days.includes(d.value)).map(d => (
        <span key={d.value} className="text-xs bg-brand/15 text-brand-dark dark:text-brand px-1.5 py-0.5 rounded font-medium">
          {d.label}
        </span>
      ))}
    </div>
  );
}

function PromotionThumbnail({ url, title }: { url: string | null; title: string }) {
  const [err, setErr] = useState(false);
  if (!url || err) return <div className="w-10 h-10 bg-brand/20 rounded shrink-0 flex items-center justify-center text-lg">🏷️</div>;
  return <img src={url} alt={title} className="w-10 h-10 object-cover rounded shrink-0" onError={() => setErr(true)} />;
}

interface UnsplashPhoto {
  id: string;
  urls: { small: string; regular: string };
  alt_description: string | null;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PromotionsAdmin() {
  const syncCatalog = useCatalogMutationSync();
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [imageTab, setImageTab] = useState<'url' | 'upload' | 'unsplash'>('url');
  const [uploading, setUploading] = useState(false);
  const [imgPreviewError, setImgPreviewError] = useState(false);
  const [unsplashQuery, setUnsplashQuery] = useState('');
  const [unsplashResults, setUnsplashResults] = useState<UnsplashPhoto[]>([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('sort_order')
      .order('created_at');
    if (error) toast.error('Error al cargar promociones');
    setPromotions((data ?? []) as PromotionRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetImageState = () => {
    setImageTab('url');
    setImgPreviewError(false);
    setUnsplashQuery('');
    setUnsplashResults([]);
    setUnsplashLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    resetImageState();
    setSheetOpen(true);
  };

  const openEdit = (row: PromotionRow) => {
    setEditingId(row.id);
    setForm(rowToForm(row));
    resetImageState();
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setEditingId(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split('.').pop();
    const prefix = editingId ?? `promo-${Date.now()}`;
    const path = `${prefix}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, file, { upsert: true });
    if (error) { toast.error('Error al subir imagen'); setUploading(false); return; }
    const { data } = supabase.storage.from('product-images').getPublicUrl(path);
    setF('image_url', data.publicUrl);
    setImgPreviewError(false);
    setUploading(false);
  };

  const searchUnsplash = async () => {
    if (!unsplashQuery.trim()) return;
    setUnsplashLoading(true);
    try {
      const res = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(unsplashQuery)}&per_page=6&client_id=UNSPLASH_API_KEY`,
      );
      const json = await res.json();
      setUnsplashResults(json.results ?? []);
    } catch {
      toast.error('Error al buscar en Unsplash');
    }
    setUnsplashLoading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('El título es requerido'); return; }
    setSaving(true);
    const payload = formToPayload(form);
    let error;
    if (editingId) {
      ({ error } = await supabase.from('promotions').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('promotions').insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(editingId ? 'Error al actualizar' : 'Error al crear'); return; }
    await syncCatalog(['promotions']);
    toast.success(editingId ? 'Promoción actualizada' : 'Promoción creada');
    closeSheet();
    load();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from('promotions').update({ is_active: active }).eq('id', id);
    if (error) { toast.error('Error al actualizar'); return; }
    await syncCatalog(['promotions']);
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, is_active: active } : p));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from('promotions').delete().eq('id', deleteId);
    setDeleting(false);
    if (error) { toast.error('Error al eliminar'); return; }
    await syncCatalog(['promotions']);
    toast.success('Promoción eliminada');
    setDeleteId(null);
    load();
  };

  const setF = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const filtered = promotions.filter(p => {
    if (statusFilter === 'active') return p.is_active;
    if (statusFilter === 'inactive') return !p.is_active;
    return true;
  });

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-2">
        <h2 className="text-xl font-bold">Promociones ({promotions.length})</h2>
        <div className="flex items-center gap-2">
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={v => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 text-sm w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="active">Activas</SelectItem>
              <SelectItem value="inactive">Inactivas</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" /> Nueva
          </Button>
        </div>
      </div>

      {/* ── Sheet lateral ────────────────────────────────────────────────────── */}
      <Sheet open={sheetOpen} onOpenChange={v => { if (!v) closeSheet(); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? 'Editar promoción' : 'Nueva promoción'}</SheetTitle>
          </SheetHeader>

          <div className="space-y-4 py-4">
            {/* Título */}
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="ej: Bowl Mediano 2x1" />
            </div>

            {/* Descripción */}
            <div>
              <Label>Descripción</Label>
              <Textarea
                value={form.description}
                onChange={e => setF('description', e.target.value)}
                rows={2}
                placeholder="Descripción opcional"
              />
            </div>

            {/* Tipo */}
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={v => setF('type', v as PromotionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="informative">Informativa</SelectItem>
                  <SelectItem value="combo">Combo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Precio combo */}
            {form.type === 'combo' && (
              <div>
                <Label>Precio del combo (COP) *</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.price_cents}
                  onChange={e => setF('price_cents', e.target.value)}
                  placeholder="ej: 23900"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Si ingresas un precio, aparecerá el botón "Agregar al carrito" en la promoción.
                </p>
              </div>
            )}

            {/* Descuento */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de descuento</Label>
                <Select value={form.discount_type} onValueChange={v => setF('discount_type', v as DiscountType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="label">Sin descuento</SelectItem>
                    <SelectItem value="percentage">Porcentaje</SelectItem>
                    <SelectItem value="fixed">Monto fijo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.discount_type !== 'label' && (
                <div>
                  <Label>{form.discount_type === 'percentage' ? 'Porcentaje (%)' : 'Valor (COP)'}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.discount_value}
                    onChange={e => setF('discount_value', e.target.value)}
                    placeholder={form.discount_type === 'percentage' ? 'ej: 15' : 'ej: 5000'}
                  />
                </div>
              )}
            </div>

            {/* Badge */}
            <div>
              <Label>Badge text</Label>
              <Input
                value={form.badge_text}
                onChange={e => setF('badge_text', e.target.value)}
                placeholder="ej: 2x1, NUEVO, OFERTA"
              />
            </div>

            {/* Imagen */}
            <div>
              <Label>Imagen</Label>
              <Tabs value={imageTab} onValueChange={v => setImageTab(v as typeof imageTab)} className="mt-2">
                <TabsList className="w-full">
                  <TabsTrigger value="url" className="flex-1">URL</TabsTrigger>
                  <TabsTrigger value="upload" className="flex-1">Subir archivo</TabsTrigger>
                  <TabsTrigger value="unsplash" className="flex-1">Unsplash</TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="mt-2">
                  <Input
                    value={form.image_url}
                    onChange={e => { setF('image_url', e.target.value); setImgPreviewError(false); }}
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
                  {uploading && <p className="text-xs text-muted-foreground">Subiendo imagen...</p>}
                </TabsContent>

                <TabsContent value="unsplash" className="mt-2 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={unsplashQuery}
                      onChange={e => setUnsplashQuery(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && searchUnsplash()}
                      placeholder="Buscar en Unsplash..."
                    />
                    <Button type="button" variant="outline" size="sm" onClick={searchUnsplash} disabled={unsplashLoading}>
                      {unsplashLoading ? '...' : 'Buscar'}
                    </Button>
                  </div>
                  {unsplashResults.length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {unsplashResults.map(photo => (
                        <img
                          key={photo.id}
                          src={photo.urls.small}
                          alt={photo.alt_description ?? ''}
                          className={cn(
                            'w-full h-20 object-cover rounded cursor-pointer ring-2',
                            form.image_url === photo.urls.regular ? 'ring-primary' : 'ring-transparent hover:ring-primary/50',
                          )}
                          onClick={() => { setF('image_url', photo.urls.regular); setImgPreviewError(false); }}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {form.image_url && !imgPreviewError && (
                <img
                  src={form.image_url}
                  alt="Preview"
                  className="mt-2 w-full h-32 object-cover rounded-lg border"
                  onError={() => setImgPreviewError(true)}
                />
              )}
            </div>

            {/* CTA */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Texto del botón</Label>
                <Input
                  value={form.cta_text}
                  onChange={e => setF('cta_text', e.target.value)}
                  placeholder="ej: Pedir ahora"
                />
              </div>
              <div>
                <Label>URL del botón</Label>
                <Input
                  value={form.cta_url}
                  onChange={e => setF('cta_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Inicio</Label>
                <Input type="datetime-local" value={form.starts_at} onChange={e => setF('starts_at', e.target.value)} />
              </div>
              <div>
                <Label>Fin</Label>
                <Input type="datetime-local" value={form.ends_at} onChange={e => setF('ends_at', e.target.value)} />
              </div>
            </div>

            {/* Orden + is_active */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Orden</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={e => setF('sort_order', e.target.value)}
                />
              </div>
              <div className="flex items-end pb-0.5">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Switch checked={form.is_active} onCheckedChange={v => setF('is_active', v)} />
                  Activa
                </label>
              </div>
            </div>
          </div>

          <SheetFooter className="pt-2">
            <Button variant="outline" onClick={closeSheet}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="btn-ohana">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear promoción'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* ── Delete confirmation dialog ──────────────────────────────────────── */}
      <Dialog open={!!deleteId} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>¿Eliminar promoción?</DialogTitle>
            <DialogDescription>Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="border rounded-xl overflow-x-auto bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="p-3 font-semibold w-10"></th>
              <th className="p-3 font-semibold">Título</th>
              <th className="p-3 font-semibold">Tipo</th>
              <th className="p-3 font-semibold">Fechas</th>
              <th className="p-3 font-semibold text-center">Activa</th>
              <th className="p-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                  {statusFilter === 'all' ? 'Sin promociones. Crea la primera.' : 'No hay promociones con este filtro.'}
                </td>
              </tr>
            )}
            {filtered.map(promo => (
              <tr key={promo.id} className={`border-b last:border-b-0 ${!promo.is_active ? 'opacity-50' : ''}`}>
                <td className="p-3">
                  <PromotionThumbnail url={promo.image_url} title={promo.title} />
                </td>
                <td className="p-3">
                  <p className="font-medium">{promo.title}</p>
                  {promo.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">{promo.description}</p>
                  )}
                  {promo.badge_text && (
                    <span className="mt-0.5 inline-block bg-brand text-white text-xs px-2 py-0.5 rounded-full">
                      {promo.badge_text}
                    </span>
                  )}
                </td>
                <td className="p-3">
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    promo.type === 'combo'
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                  )}>
                    {promo.type === 'combo' ? 'Combo' : 'Informativa'}
                  </span>
                </td>
                <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                  {formatDateRange(promo.starts_at, promo.ends_at)}
                </td>
                <td className="p-3 text-center">
                  <Switch
                    checked={promo.is_active}
                    onCheckedChange={v => handleToggleActive(promo.id, v)}
                    aria-label="Activa"
                  />
                </td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(promo)} aria-label="Editar">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeleteId(promo.id)} aria-label="Eliminar">
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
