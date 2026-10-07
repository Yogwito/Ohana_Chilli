\set ON_ERROR_STOP on
BEGIN;

SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    INSERT INTO public.analytics_events(event_type, metadata) VALUES ('page_view', '{"page":"/"}');
    RAISE EXCEPTION 'anonymous direct analytics insert was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM public.track_analytics_event('page_view', '{"page":"/"}', repeat('a', 64));
    RAISE EXCEPTION 'anonymous analytics RPC was allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

END $$;
RESET ROLE;

SET LOCAL ROLE service_role;
DO $$
BEGIN
  IF public.track_analytics_event('page_view', '{"page":"/"}', repeat('a', 64)) IS NOT TRUE THEN
    RAISE EXCEPTION 'service analytics event was rejected';
  END IF;

  BEGIN
    PERFORM public.track_analytics_event('anything', '{}', repeat('b', 64));
    RAISE EXCEPTION 'analytics event type allowlist was bypassed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'invalid_analytics_event_type' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.track_analytics_event('page_view', jsonb_build_object('page', repeat('a', 2049)), repeat('c', 64));
    RAISE EXCEPTION 'oversized analytics metadata was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'invalid_analytics_metadata' THEN RAISE; END IF;
  END;

END $$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN
    PERFORM 1 FROM public.analytics_events;
    RAISE EXCEPTION 'anonymous analytics reads were allowed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END $$;
RESET ROLE;

ROLLBACK;
