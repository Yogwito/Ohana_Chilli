-- Only presentation/ordering policy keys are public; never broaden to all settings.
DROP POLICY IF EXISTS "Public read business settings" ON public.settings;
-- Production carries a historical catch-all "anon_read" (USING true) that would OR
-- with the allowlist below and expose every key. Admin reads keep working through
-- admin_write_settings (FOR ALL, admin only).
DROP POLICY IF EXISTS anon_read ON public.settings;
CREATE POLICY "Public read business settings" ON public.settings FOR SELECT TO anon, authenticated
USING (key IN (
  'whatsapp_number', 'contact_email', 'contact_address', 'contact_maps_url',
  'hours_weekday', 'hours_weekend', 'instagram_url', 'instagram_handle',
  'facebook_url', 'delivery_eta', 'review_rating', 'business_hours_enforce',
  'banner_enabled', 'banner_message', 'banner_color'
));
