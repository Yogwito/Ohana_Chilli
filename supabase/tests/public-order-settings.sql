\set ON_ERROR_STOP on
BEGIN;
INSERT INTO public.settings(key,value) VALUES
  ('business_hours_enforce','true'), ('banner_enabled','true'),
  ('banner_message','Horario especial'), ('banner_color','warning'),
  ('internal_audit_secret','never-public')
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;
INSERT INTO public.settings(key,value)
SELECT key, to_char((now() AT TIME ZONE 'America/Bogota') + interval '2 hours','HH24:MI') || ' - ' ||
  to_char((now() AT TIME ZONE 'America/Bogota') + interval '3 hours','HH24:MI')
FROM unnest(ARRAY['hours_weekday','hours_weekend']) key
ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value;
DO $$ BEGIN
  BEGIN
    PERFORM public.order_quote('{"order_type":"pickup","payment_method":"cash","items":[{"type":"product","product_id":"irrelevant-when-closed","quantity":1}]}');
    RAISE EXCEPTION 'closed business accepted a quote';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'business_closed' THEN RAISE; END IF;
  END;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.settings WHERE key IN ('business_hours_enforce','banner_enabled','banner_message','banner_color'))<>4 THEN
    RAISE EXCEPTION 'public ordering settings are hidden';
  END IF;
  IF EXISTS (SELECT 1 FROM public.settings WHERE key='internal_audit_secret') THEN
    RAISE EXCEPTION 'private settings exposed';
  END IF;
END $$;
RESET ROLE;
ROLLBACK;
