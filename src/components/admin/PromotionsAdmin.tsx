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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Plus, Trash2 } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PromotionRow {
  id: string;
  title: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed' | 'label';
  discount_value: number;
  badge_text: string | null;
  image_url: string | null;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  created_at: string;
}

type DiscountType = 'percentage' | 'fixed' | 'label';

interface FormState {
  title: string;
  description: string;
  discount_type: DiscountType;
  discount_value: string;
  badge_text: string;
  image_url: string;
  starts_at: string;
  ends_at: string;
  sort_order: string;
  is_active: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  discount_type: 'percentage',
  discount_value: '',
  badge_text: '',
  image_url: '',
  starts_at: '',
  ends_at: '',
  sort_order: '0',
  is_active: true,
};

function formatDiscount(row: PromotionRow): string {
  if (row.discount_type === 'percentage') return `${row.discount_value}%`;
  if (row.discount_type === 'fixed') {
    const formatted = row.discount_value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `-$${formatted}`;
  }
  return row.badge_text ?? '—';
}

function formatDateRange(starts: string | null, ends: string | null): string {
  if (!starts && !ends) return 'Sin fecha';
  const fmt = (d: string) => new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: '2-digit' });
  if (starts && ends) return `${fmt(starts)} – ${fmt(ends)}`;
  if (starts) return `Desde ${fmt(starts)}`;
  return `Hasta ${fmt(ends!)}`;
}

function rowToForm(row: PromotionRow): FormState {
  const toDatetimeLocal = (iso: string | null) => {
    if (!iso) return '';
    return iso.slice(0, 16);
  };
  return {
    title: row.title,
    description: row.description ?? '',
    discount_type: row.discount_type,
    discount_value: row.discount_value > 0 ? String(row.discount_value) : '',
    badge_text: row.badge_text ?? '',
    image_url: row.image_url ?? '',
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
    discount_type: form.discount_type,
    discount_value: form.discount_value !== '' ? Number(form.discount_value) : 0,
    badge_text: form.badge_text.trim() || null,
    image_url: form.image_url.trim() || null,
    starts_at: form.starts_at || null,
    ends_at: form.ends_at || null,
    sort_order: form.sort_order !== '' ? Number(form.sort_order) : 0,
    is_active: form.is_active,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function PromotionsAdmin() {
  const syncCatalog = useCatalogMutationSync();
  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .order('sort_order')
      .order('created_at');
    if (error) { toast.error('Error al cargar promociones'); }
    setPromotions((data ?? []) as PromotionRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row: PromotionRow) => {
    setEditingId(row.id);
    setForm(rowToForm(row));
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('El título es requerido'); return; }
    if (form.discount_type !== 'label' && form.discount_value === '') {
      toast.error('El valor del descuento es requerido'); return;
    }
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
    closeDialog();
    load();
  };

  const handleToggleActive = async (id: string, active: boolean) => {
    const { error } = await supabase.from('promotions').update({ is_active: active }).eq('id', id);
    if (error) { toast.error('Error al actualizar'); return; }
    await syncCatalog(['promotions']);
    setPromotions(prev => prev.map(p => p.id === id ? { ...p, is_active: active } : p));
    toast.success(active ? 'Promoción activada' : 'Promoción desactivada');
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

  if (loading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Promociones ({promotions.length})</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Nueva promoción
        </Button>
      </div>

      {/* ── Create / Edit dialog ────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={v => { if (!v) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar promoción' : 'Nueva promoción'}</DialogTitle>
            <DialogDescription>
              {editingId ? 'Modifica los datos de la promoción.' : 'Crea una nueva promoción para mostrar en el menú.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <Label>Título *</Label>
              <Input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="ej: Bowl Mediano 2x1" />
            </div>

            <div>
              <Label>Descripción</Label>
              <Textarea
                value={form.description}
                onChange={e => setF('description', e.target.value)}
                rows={2}
                placeholder="Descripción opcional de la promoción"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tipo de descuento *</Label>
                <Select value={form.discount_type} onValueChange={v => setF('discount_type', v as DiscountType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Porcentaje</SelectItem>
                    <SelectItem value="fixed">Valor fijo COP</SelectItem>
                    <SelectItem value="label">Solo etiqueta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.discount_type !== 'label' && (
                <div>
                  <Label>
                    {form.discount_type === 'percentage' ? 'Porcentaje (%)' : 'Valor (COP)'} *
                  </Label>
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

            <div>
              <Label>Badge text</Label>
              <Input
                value={form.badge_text}
                onChange={e => setF('badge_text', e.target.value)}
                placeholder="ej: 2x1, Nuevo, Popular"
              />
            </div>

            <div>
              <Label>URL de imagen</Label>
              <Input
                value={form.image_url}
                onChange={e => setF('image_url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Inicio</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={e => setF('starts_at', e.target.value)}
                />
              </div>
              <div>
                <Label>Fin</Label>
                <Input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={e => setF('ends_at', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Orden</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.sort_order}
                  onChange={e => setF('sort_order', e.target.value)}
                  className="w-full"
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

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="btn-ohana">
              {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear promoción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              <th className="p-3 font-semibold">Título</th>
              <th className="p-3 font-semibold">Descuento</th>
              <th className="p-3 font-semibold">Badge</th>
              <th className="p-3 font-semibold">Fechas</th>
              <th className="p-3 font-semibold text-center">Activa</th>
              <th className="p-3 font-semibold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {promotions.length === 0 && (
              <tr>
                <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                  Sin promociones. Crea la primera.
                </td>
              </tr>
            )}
            {promotions.map(promo => (
              <tr key={promo.id} className={`border-b last:border-b-0 ${!promo.is_active ? 'opacity-50' : ''}`}>
                <td className="p-3">
                  <p className="font-medium">{promo.title}</p>
                  {promo.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">{promo.description}</p>
                  )}
                </td>
                <td className="p-3 text-sm font-mono">{formatDiscount(promo)}</td>
                <td className="p-3">
                  {promo.badge_text ? (
                    <span className="bg-brand text-white text-xs px-2 py-0.5 rounded-full">
                      {promo.badge_text}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
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
