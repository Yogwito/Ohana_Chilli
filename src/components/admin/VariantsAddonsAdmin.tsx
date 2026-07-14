import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCatalogMutationSync } from '@/hooks/use-catalog-sync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatPrice } from '@/domain/formatPrice';
import { toast } from 'sonner';

interface VariantRow {
  id: string;
  product_id: string;
  name: string;
  price_delta_cents: number;
  is_active: boolean;
  sort_order: number;
}

interface AddonRow {
  id: string;
  name: string;
  price_cents: number;
  is_active: boolean;
  sort_order: number;
}

interface ProductOption {
  id: string;
  name: string;
  category_id: string;
}

/** Normaliza nombres para evitar duplicados por espacios/mayúsculas. */
const cleanName = (value: string) => value.replace(/\s+/g, ' ').trim();

export default function VariantsAddonsAdmin() {
  const syncCatalog = useCatalogMutationSync();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [addons, setAddons] = useState<AddonRow[]>([]);
  const [newVariantName, setNewVariantName] = useState('');
  const [newAddon, setNewAddon] = useState({ name: '', price: '' });

  const load = async () => {
    setLoading(true);
    const [prodRes, variantRes, addonRes] = await Promise.all([
      supabase.from('products').select('id, name, category_id').order('name'),
      supabase.from('product_variants').select('*').order('sort_order'),
      supabase.from('addons').select('*').order('sort_order'),
    ]);
    setProducts((prodRes.data ?? []) as ProductOption[]);
    setVariants((variantRes.data ?? []) as VariantRow[]);
    setAddons((addonRes.data ?? []) as AddonRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const productVariants = variants.filter((v) => v.product_id === selectedProductId);

  const addVariant = async () => {
    const name = cleanName(newVariantName);
    if (!selectedProductId || !name) { toast.error('Selecciona producto y escribe el nombre'); return; }
    const { error } = await supabase.from('product_variants').insert({
      product_id: selectedProductId,
      name,
      sort_order: productVariants.length + 1,
    });
    if (error) {
      toast.error(error.code === '23505' ? 'Esa variante ya existe para este producto' : 'Error al crear variante');
      return;
    }
    await syncCatalog(['product_variants']);
    toast.success('Variante creada');
    setNewVariantName('');
    load();
  };

  const toggleVariant = async (variant: VariantRow) => {
    const { error } = await supabase
      .from('product_variants')
      .update({ is_active: !variant.is_active })
      .eq('id', variant.id);
    if (error) { toast.error('Error al actualizar variante'); return; }
    await syncCatalog(['product_variants']);
    load();
  };

  const addAddon = async () => {
    const name = cleanName(newAddon.name);
    const price = Number(newAddon.price);
    if (!name || !Number.isFinite(price) || price < 0) { toast.error('Nombre y precio válidos requeridos'); return; }
    const { error } = await supabase.from('addons').insert({
      name,
      price_cents: Math.round(price),
      sort_order: addons.length + 1,
    });
    if (error) {
      toast.error(error.code === '23505' ? 'Ese adicional ya existe' : 'Error al crear adicional');
      return;
    }
    await syncCatalog(['addons']);
    toast.success('Adicional creado');
    setNewAddon({ name: '', price: '' });
    load();
  };

  const updateAddonPrice = async (addon: AddonRow, rawPrice: string) => {
    const price = Number(rawPrice);
    if (!Number.isFinite(price) || price < 0 || price === addon.price_cents) return;
    const { error } = await supabase.from('addons').update({ price_cents: Math.round(price) }).eq('id', addon.id);
    if (error) { toast.error('Error al actualizar precio'); return; }
    await syncCatalog(['addons']);
    toast.success(`${addon.name}: ${formatPrice(Math.round(price))}`);
    load();
  };

  const toggleAddon = async (addon: AddonRow) => {
    const { error } = await supabase.from('addons').update({ is_active: !addon.is_active }).eq('id', addon.id);
    if (error) { toast.error('Error al actualizar adicional'); return; }
    await syncCatalog(['addons']);
    load();
  };

  if (loading) return <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>;

  return (
    <div className="space-y-8">
      {/* ── Variantes / sabores por producto ── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold">Variantes y sabores</h2>
          <p className="text-sm text-muted-foreground">
            Los productos con variantes activas exigen elegir sabor antes de agregar al carrito.
            Para dar sabores a un producto nuevo (ej. Hit), solo agrégalos aquí — sin tocar código.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label>Producto</Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger><SelectValue placeholder="Selecciona un producto" /></SelectTrigger>
              <SelectContent>
                {products.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}{variants.some((v) => v.product_id === p.id) ? ' ★' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>Nueva variante</Label>
            <Input
              value={newVariantName}
              onChange={(e) => setNewVariantName(e.target.value)}
              placeholder="ej: Rojo — Frutos rojos"
            />
          </div>
          <Button onClick={addVariant} disabled={!selectedProductId}>Agregar</Button>
        </div>

        {selectedProductId && (
          productVariants.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              Este producto no tiene variantes: se agrega al carrito sin selector.
            </p>
          ) : (
            <div className="divide-y rounded-xl border">
              {productVariants.map((variant) => (
                <div key={variant.id} className="flex items-center justify-between gap-3 p-3">
                  <span className={variant.is_active ? '' : 'text-muted-foreground line-through'}>
                    {variant.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{variant.is_active ? 'Activa' : 'Inactiva'}</span>
                    <Switch checked={variant.is_active} onCheckedChange={() => toggleVariant(variant)} />
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </section>

      {/* ── Catálogo compartido de adicionales ── */}
      <section className="space-y-3">
        <div>
          <h2 className="text-xl font-bold">Adicionales ({addons.length})</h2>
          <p className="text-sm text-muted-foreground">
            Catálogo compartido para toda la comida (las bebidas no llevan adicionales).
            El precio de la orden siempre se valida contra estos valores en el servidor.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Label>Nombre</Label>
            <Input
              value={newAddon.name}
              onChange={(e) => setNewAddon((p) => ({ ...p, name: e.target.value }))}
              placeholder="ej: Tocineta"
            />
          </div>
          <div className="w-36">
            <Label>Precio (COP)</Label>
            <Input
              type="number"
              value={newAddon.price}
              onChange={(e) => setNewAddon((p) => ({ ...p, price: e.target.value }))}
              placeholder="4500"
            />
          </div>
          <Button onClick={addAddon}>Agregar</Button>
        </div>

        <div className="divide-y rounded-xl border">
          {addons.map((addon) => (
            <div key={addon.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <span className={addon.is_active ? 'font-medium' : 'text-muted-foreground line-through'}>
                {addon.name}
              </span>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  defaultValue={addon.price_cents}
                  onBlur={(e) => updateAddonPrice(addon, e.target.value)}
                  className="w-28 text-right"
                  aria-label={`Precio de ${addon.name}`}
                />
                <Switch checked={addon.is_active} onCheckedChange={() => toggleAddon(addon)} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
