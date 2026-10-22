import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { BUSINESS_SETTING_DEFINITIONS, type BusinessSettingKey } from '@/domain/businessSettings';
import { useBusinessOpenStatus } from '@/hooks/use-catalog';
import { parseWeeklyHours, type WeeklyHours } from '@/domain/businessHours';

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

type BannerColor = 'warning' | 'danger' | 'info';

const COLOR_CLASSES: Record<BannerColor, string> = {
  warning: 'bg-amber-500 text-white',
  danger: 'bg-red-600 text-white',
  info: 'bg-brand text-white',
};

export default function SettingsAdmin() {
  const queryClient = useQueryClient();
  const { isOpen, weeklyConfigured } = useBusinessOpenStatus();

  const [hoursEnforce, setHoursEnforce] = useState(false);
  const [hoursEnforceLoading, setHoursEnforceLoading] = useState(true);
  const [hoursEnforceSaving, setHoursEnforceSaving] = useState(false);
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(Array(7).fill(null));
  const [weeklyLoading, setWeeklyLoading] = useState(true);
  const [weeklySaving, setWeeklySaving] = useState(false);

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
    supabase.from('settings').select('value').eq('key', 'business_hours_weekly').maybeSingle().then(({ data }) => {
      setWeeklyHours(parseWeeklyHours(data?.value) ?? Array(7).fill(null));
      setWeeklyLoading(false);
    });
    supabase
      .from('settings')
      .select('key, value')
      .eq('key', 'business_hours_enforce')
      .maybeSingle()
      .then(({ data }) => {
        setHoursEnforce(data?.value === 'true');
        setHoursEnforceLoading(false);
      });
  }, []);

  const saveHoursEnforce = async (value: boolean) => {
    if (value && weeklyHours.every(day => !day)) { toast.error('Configura al menos un día antes de activar el bloqueo'); return; }
    if (value && !parseWeeklyHours(JSON.stringify(weeklyHours))) { toast.error('Revisa el horario semanal'); return; }
    setHoursEnforceSaving(true);
    const { error } = await supabase
      .from('settings')
      .upsert(value ? [
        { key: 'business_hours_weekly', value: JSON.stringify(weeklyHours) },
        { key: 'business_hours_enforce', value: 'true' },
      ] : [{ key: 'business_hours_enforce', value: 'false' }], { onConflict: 'key' });
    setHoursEnforceSaving(false);
    if (error) { toast.error('Error al guardar'); return; }
    setHoursEnforce(value);
    await queryClient.invalidateQueries({ queryKey: ['public-catalog'] });
    toast.success(value ? 'Bloqueo activado' : 'Bloqueo desactivado');
  };

  const saveWeeklyHours = async () => {
    if (!parseWeeklyHours(JSON.stringify(weeklyHours))) { toast.error('Revisa que cada cierre sea posterior a la apertura'); return; }
    setWeeklySaving(true);
    const { error } = await supabase.from('settings').upsert({ key: 'business_hours_weekly', value: JSON.stringify(weeklyHours) }, { onConflict: 'key' });
    setWeeklySaving(false);
    if (error) { toast.error('Error al guardar horario'); return; }
    await queryClient.invalidateQueries({ queryKey: ['public-catalog'] });
    toast.success('Horario actualizado');
  };

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

      {/* Horarios de atención */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <Clock className="w-4 h-4" /> Horarios de atención
        </h3>
        {hoursEnforceLoading ? <Skeleton className="h-20" /> : (
          <>
            <div className="flex items-start gap-3">
              <Switch
                id="hours_enforce"
                checked={hoursEnforce}
                disabled={hoursEnforceSaving || weeklyLoading}
                onCheckedChange={async (v) => {
                  await saveHoursEnforce(v);
                }}
              />
              <div>
                <Label htmlFor="hours_enforce" className="cursor-pointer">Bloquear pedidos fuera de horario</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Si está activo, el checkout queda deshabilitado cuando el local está cerrado según los horarios configurados abajo.
                </p>
              </div>
            </div>
            {!weeklyLoading && (
              <div className="rounded-lg bg-muted/50 border px-4 py-3 text-sm flex items-center gap-2">
                {(() => {
                  const open = weeklyConfigured ? isOpen : null;
                  if (open === null) return <span className="text-muted-foreground">Sin horario semanal configurado.</span>;
                  return open
                    ? <><span className="w-2 h-2 rounded-full bg-green-500 shrink-0" /> <span>Ahora: <strong className="text-green-700 dark:text-green-400">Abierto</strong></span></>
                    : <><span className="w-2 h-2 rounded-full bg-red-500 shrink-0" /> <span>Ahora: <strong className="text-red-600 dark:text-red-400">Cerrado</strong></span></>;
                })()}
              </div>
            )}
            <div className="space-y-3 border-t pt-4">
              <p className="text-sm text-muted-foreground">Hora de Bogotá. Activa cada día y define apertura y cierre.</p>
              {DAY_NAMES.map((name, day) => <div key={name} className="flex flex-wrap items-center gap-3">
                <Switch aria-label={`Abrir ${name}`} checked={Boolean(weeklyHours[day])} onCheckedChange={(enabled) => setWeeklyHours(previous => previous.map((value, index) => index === day ? (enabled ? { open: '11:00', close: '21:00' } : null) : value))} />
                <span className="w-24 text-sm">{name}</span>
                {weeklyHours[day] ? <><Input aria-label={`Apertura ${name}`} type="time" className="w-32" value={weeklyHours[day]!.open} onChange={event => setWeeklyHours(previous => previous.map((value, index) => index === day ? { ...value!, open: event.target.value } : value))} /><Input aria-label={`Cierre ${name}`} type="time" className="w-32" value={weeklyHours[day]!.close} onChange={event => setWeeklyHours(previous => previous.map((value, index) => index === day ? { ...value!, close: event.target.value } : value))} /></> : <span className="text-sm text-muted-foreground">Cerrado</span>}
              </div>)}
              <Button type="button" onClick={saveWeeklyHours} disabled={weeklySaving || weeklyLoading}>Guardar horario semanal</Button>
            </div>
          </>
        )}
      </div>

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
