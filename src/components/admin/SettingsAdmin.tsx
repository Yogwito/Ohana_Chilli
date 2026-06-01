import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { BUSINESS_SETTING_DEFINITIONS, type BusinessSettingKey } from '@/domain/businessSettings';

type BannerColor = 'warning' | 'danger' | 'info';

const COLOR_CLASSES: Record<BannerColor, string> = {
  warning: 'bg-amber-500 text-white',
  danger: 'bg-red-600 text-white',
  info: 'bg-brand text-white',
};

export default function SettingsAdmin() {
  const queryClient = useQueryClient();

  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [bannerMessage, setBannerMessage] = useState('Estamos cerrados por ahora. ¡Volvemos pronto!');
  const [bannerColor, setBannerColor] = useState<BannerColor>('warning');
  const [bannerLoading, setBannerLoading] = useState(true);
  const [bannerSaving, setBannerSaving] = useState(false);

  const [settingsForm, setSettingsForm] = useState<Record<BusinessSettingKey, string>>(
    () => Object.fromEntries(
      BUSINESS_SETTING_DEFINITIONS.map((s) => [s.key, '']),
    ) as Record<BusinessSettingKey, string>,
  );
  const [bizLoading, setBizLoading] = useState(true);
  const [bizSaving, setBizSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('settings')
      .select('key, value')
      .in('key', ['banner_enabled', 'banner_message', 'banner_color'])
      .then(({ data }) => {
        const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]));
        setBannerEnabled(map['banner_enabled'] === 'true');
        if (map['banner_message']) setBannerMessage(map['banner_message']);
        if (map['banner_color']) setBannerColor(map['banner_color'] as BannerColor);
        setBannerLoading(false);
      });

    const keys = BUSINESS_SETTING_DEFINITIONS.map((s) => s.key);
    supabase
      .from('settings')
      .select('key, value')
      .in('key', keys)
      .then(({ data, error }) => {
        if (error) { toast.error('Error al cargar configuración'); setBizLoading(false); return; }
        const next = Object.fromEntries(
          BUSINESS_SETTING_DEFINITIONS.map((s) => [s.key, '']),
        ) as Record<BusinessSettingKey, string>;
        (data ?? []).forEach((row) => {
          if (row.key in next) next[row.key as BusinessSettingKey] = row.value ?? '';
        });
        setSettingsForm(next);
        setBizLoading(false);
      });
  }, []);

  const saveBanner = async () => {
    setBannerSaving(true);
    const { error } = await supabase
      .from('settings')
      .upsert([
        { key: 'banner_enabled', value: String(bannerEnabled) },
        { key: 'banner_message', value: bannerMessage },
        { key: 'banner_color', value: bannerColor },
      ], { onConflict: 'key' });
    if (error) { toast.error('Error al guardar banner'); setBannerSaving(false); return; }
    await queryClient.invalidateQueries({ queryKey: ['banner-settings'] });
    toast.success('Banner actualizado');
    setBannerSaving(false);
  };

  const saveBusiness = async () => {
    setBizSaving(true);
    const { error } = await supabase
      .from('settings')
      .upsert(
        BUSINESS_SETTING_DEFINITIONS.map((s) => ({
          key: s.key,
          value: settingsForm[s.key].trim(),
        })),
        { onConflict: 'key' },
      );
    if (error) { toast.error('Error al actualizar configuración'); setBizSaving(false); return; }
    await queryClient.invalidateQueries({ queryKey: ['business-settings'] });
    toast.success('Configuración actualizada');
    setBizSaving(false);
  };

  return (
    <div className="max-w-3xl space-y-8">
      <h2 className="text-xl font-bold">Configuración</h2>

      {/* Banner de aviso */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-base">Banner de aviso</h3>
        {bannerLoading ? <Skeleton className="h-32" /> : (
          <>
            <div className="flex items-center gap-3">
              <Switch
                id="banner_enabled"
                checked={bannerEnabled}
                onCheckedChange={setBannerEnabled}
              />
              <Label htmlFor="banner_enabled">Mostrar banner en el sitio</Label>
            </div>
            <div>
              <Label>Mensaje del banner</Label>
              <Input
                value={bannerMessage}
                onChange={(e) => setBannerMessage(e.target.value)}
                placeholder="Estamos cerrados por ahora. ¡Volvemos pronto!"
              />
            </div>
            <div>
              <Label>Color</Label>
              <Select value={bannerColor} onValueChange={(v) => setBannerColor(v as BannerColor)}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="warning">Advertencia (amarillo)</SelectItem>
                  <SelectItem value="danger">Urgente (rojo)</SelectItem>
                  <SelectItem value="info">Informativo (verde)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Preview:</p>
              <div className={`h-10 w-full flex items-center justify-center rounded-lg text-sm font-medium ${COLOR_CLASSES[bannerColor]}`}>
                🔒 {bannerMessage || 'Mensaje del banner'}
              </div>
            </div>
            <Button onClick={saveBanner} disabled={bannerSaving} className="btn-ohana">
              <Save className="w-4 h-4 mr-2" />
              {bannerSaving ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </>
        )}
      </div>

      {/* Información del negocio */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-base">Información del negocio</h3>
        {bizLoading ? <Skeleton className="h-48" /> : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {BUSINESS_SETTING_DEFINITIONS.map((setting) => (
                <div key={setting.key} className={setting.key === 'contact_address' ? 'md:col-span-2' : ''}>
                  <Label>{setting.label}</Label>
                  <Input
                    value={settingsForm[setting.key]}
                    onChange={(e) => setSettingsForm((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                    placeholder={setting.placeholder}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{setting.description}</p>
                </div>
              ))}
            </div>
            <Button onClick={saveBusiness} disabled={bizSaving} className="btn-ohana">
              <Save className="w-4 h-4 mr-2" />
              {bizSaving ? 'Guardando...' : 'Guardar'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
