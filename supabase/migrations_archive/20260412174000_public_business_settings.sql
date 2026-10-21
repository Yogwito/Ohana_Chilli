DROP POLICY IF EXISTS "Public read whatsapp_number" ON public.settings;

CREATE POLICY "Public read business settings"
ON public.settings
FOR SELECT
USING (
  key IN (
    'whatsapp_number',
    'contact_email',
    'contact_address',
    'contact_maps_url',
    'hours_weekday',
    'hours_weekend',
    'instagram_url',
    'instagram_handle',
    'facebook_url',
    'delivery_eta',
    'review_rating'
  )
);

INSERT INTO public.settings (key, value) VALUES
  ('whatsapp_number', '573215667170'),
  ('contact_email', 'hola@ohanachilli.com'),
  ('contact_address', 'c.c Cable Plaza Piso 4 Terraza, Manizales, Caldas'),
  ('contact_maps_url', 'https://maps.app.goo.gl/9cjJJnHzF415GcWBA?g_st=ic'),
  ('hours_weekday', '11:00 - 21:00'),
  ('hours_weekend', '11:00 - 21:00'),
  ('instagram_url', 'https://www.instagram.com/bowlsohana'),
  ('instagram_handle', '@bowlsohana'),
  ('facebook_url', 'https://www.facebook.com/share/1FMJDYhpdD/?mibextid=wwXIfr'),
  ('delivery_eta', '35-50 min'),
  ('review_rating', '4.9')
ON CONFLICT (key) DO UPDATE
SET value = EXCLUDED.value;
