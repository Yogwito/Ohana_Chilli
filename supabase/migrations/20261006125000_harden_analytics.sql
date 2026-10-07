-- Public analytics is intentionally best-effort, but it must not expose a
-- general-purpose anonymous JSON write endpoint.  The browser calls the
-- narrowly scoped RPC below; the table itself remains unavailable to anon.
-- The Edge function derives the rate key from the ingress-owned address header.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Historical installations must not be able to bypass the grants below merely
-- because RLS was disabled outside the migration chain.
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Do not rely on a historical policy name: any direct insert policy would
-- bypass the validation and rate limit in track_analytics_event.
DO $$
DECLARE policy record;
BEGIN
  FOR policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analytics_events'
      AND cmd IN ('INSERT', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY %I ON public.analytics_events', policy.policyname);
  END LOOP;
END $$;

REVOKE ALL ON TABLE public.analytics_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, DELETE ON TABLE public.analytics_events TO authenticated;
GRANT ALL ON TABLE public.analytics_events TO service_role;

CREATE OR REPLACE FUNCTION public.track_analytics_event(
  p_event_type text,
  p_metadata jsonb,
  p_rate_key text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  v_allowed_keys text[] := ARRAY[
    'page', 'productId', 'productName', 'brand', 'priceCents',
    'itemCount', 'subtotalCents', 'orderId', 'totalCents', 'orderType'
  ];
BEGIN
  IF p_rate_key !~ '^[a-f0-9]{64}$' THEN
    RAISE EXCEPTION 'invalid_analytics_rate_key';
  END IF;

  IF p_event_type NOT IN (
    'page_view', 'add_to_cart', 'checkout_start', 'checkout_complete',
    'whatsapp_sent', 'whatsapp_blocked'
  ) THEN
    RAISE EXCEPTION 'invalid_analytics_event_type';
  END IF;

  IF jsonb_typeof(p_metadata) <> 'object'
    OR pg_column_size(p_metadata) > 2048
    OR EXISTS (
      SELECT 1
      FROM jsonb_each(p_metadata) AS entry(key, value)
      WHERE NOT (entry.key = ANY (v_allowed_keys))
        OR jsonb_typeof(entry.value) NOT IN ('string', 'number', 'boolean')
        OR (jsonb_typeof(entry.value) = 'string' AND length(entry.value #>> '{}') > 256)
    ) THEN
    RAISE EXCEPTION 'invalid_analytics_metadata';
  END IF;

  -- Preserve the existing browser contract while rejecting malformed events.
  IF (p_event_type = 'page_view' AND NOT (p_metadata ? 'page'))
    OR (p_event_type = 'add_to_cart' AND NOT (p_metadata ?& ARRAY['productId', 'productName', 'brand', 'priceCents']))
    OR (p_event_type = 'checkout_start' AND NOT (p_metadata ?& ARRAY['itemCount', 'subtotalCents']))
    OR (p_event_type = 'checkout_complete' AND NOT (p_metadata ?& ARRAY['orderId', 'totalCents', 'orderType', 'itemCount']))
    OR (p_event_type IN ('whatsapp_sent', 'whatsapp_blocked') AND NOT (p_metadata ? 'orderId')) THEN
    RAISE EXCEPTION 'invalid_analytics_metadata';
  END IF;

  INSERT INTO public.analytics_events(event_type, metadata)
  VALUES (p_event_type, p_metadata);
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.track_analytics_event(text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.track_analytics_event(text, jsonb, text) TO service_role;
