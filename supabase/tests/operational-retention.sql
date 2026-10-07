\set ON_ERROR_STOP on
BEGIN;

SET LOCAL ROLE service_role;
INSERT INTO public.analytics_events(event_type, metadata, created_at) VALUES
  ('page_view', '{"page":"/old"}', now() - interval '91 days'),
  ('page_view', '{"page":"/recent"}', now() - interval '89 days');
INSERT INTO public.order_rate_limits(key, window_start, attempts) VALUES
  ('retention-old', now() - interval '25 hours', 1),
  ('retention-recent', now() - interval '23 hours', 1);

DO $$
DECLARE result jsonb;
BEGIN
  result := public.prune_operational_retention();
  IF (result->>'analytics_events_deleted')::integer < 1
    OR (result->>'order_rate_limits_deleted')::integer < 1 THEN
    RAISE EXCEPTION 'retention did not delete expired operational records: %', result;
  END IF;
  IF EXISTS (SELECT 1 FROM public.analytics_events WHERE metadata->>'page' = '/old')
    OR EXISTS (SELECT 1 FROM public.order_rate_limits WHERE key = 'retention-old') THEN
    RAISE EXCEPTION 'expired operational records survived retention';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.analytics_events WHERE metadata->>'page' = '/recent')
    OR NOT EXISTS (SELECT 1 FROM public.order_rate_limits WHERE key = 'retention-recent') THEN
    RAISE EXCEPTION 'retention deleted recent operational records';
  END IF;
END $$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM public.prune_operational_retention();
    RAISE EXCEPTION 'anonymous retention execution was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

ROLLBACK;
