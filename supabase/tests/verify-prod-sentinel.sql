-- Run after 20261006* on top of supabase/tests/prod-sentinel.sql.
\set ON_ERROR_STOP on
DO $$ DECLARE r jsonb; BEGIN
  IF EXISTS(SELECT 1 FROM public.orders WHERE id::text LIKE '00000000-0000-0000-0000-00000000b1%' AND (payment_method<>'legacy' OR payment_state<>'unknown' OR actionable_at IS NOT NULL OR version<>0)) THEN
    RAISE EXCEPTION 'production orders not normalised to legacy/unknown';
  END IF;
  IF (SELECT count(*) FROM public.orders WHERE payment_method='legacy' AND payment_state='unknown')<>22 THEN
    RAISE EXCEPTION 'expected 22 legacy/unknown orders';
  END IF;
  IF (SELECT updated_at FROM public.orders WHERE id='00000000-0000-0000-0000-00000000b120')<>timestamptz '2026-09-01 13:00+00' + interval '20 days' THEN
    RAISE EXCEPTION 'backfill rewrote updated_at';
  END IF;
  IF (SELECT payment_status FROM public.orders WHERE id='00000000-0000-0000-0000-00000000b101')<>'not_required' THEN
    RAISE EXCEPTION 'legacy wompi columns changed';
  END IF;
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000b001',true);
  r := public.order_action('00000000-0000-0000-0000-00000000b101',0,'accept_legacy','Pedido histórico revisado');
  IF r->>'status'<>'confirmed' OR NOT EXISTS(SELECT 1 FROM public.orders WHERE id='00000000-0000-0000-0000-00000000b101' AND status='confirmed' AND payment_method='legacy' AND payment_state='unknown') THEN
    RAISE EXCEPTION 'accept_legacy failed on production-shaped order';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.order_events WHERE order_id='00000000-0000-0000-0000-00000000b101' AND kind='accept_legacy') THEN
    RAISE EXCEPTION 'accept_legacy not audited';
  END IF;
  r := public.order_action('00000000-0000-0000-0000-00000000b102',0,'cancel','Pedido histórico duplicado');
  IF r->>'status'<>'cancelled' OR (SELECT payment_state FROM public.orders WHERE id='00000000-0000-0000-0000-00000000b102')<>'unknown'
     OR (SELECT financial_attention_at FROM public.orders WHERE id='00000000-0000-0000-0000-00000000b102') IS NOT NULL THEN
    RAISE EXCEPTION 'cancel failed on production-shaped order';
  END IF;
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-00000000b0ff',true);
  BEGIN PERFORM public.order_action('00000000-0000-0000-0000-00000000b103',0,'accept_legacy','No admin'); RAISE EXCEPTION 'non-admin accepted';
  EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'forbidden' THEN RAISE; END IF; END;
  -- Old public RPC is closed on every overload, including the 10-arg production one.
  IF has_function_privilege('anon','public.create_order_with_items(text,text,text,text,text,integer,text,integer,jsonb,text)','EXECUTE') THEN
    RAISE EXCEPTION 'legacy create_order_with_items still executable by anon';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='orders') THEN
    RAISE EXCEPTION 'orders not added to realtime publication';
  END IF;
END $$;
SET ROLE anon;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM public.settings WHERE key='prod_sentinel_private') THEN RAISE EXCEPTION 'historical anon_read still exposes private settings'; END IF;
  BEGIN PERFORM 1 FROM public.orders; RAISE EXCEPTION 'anon reads orders'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM 1 FROM public.order_items; RAISE EXCEPTION 'anon reads order_items'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.orders(customer_name,phone,order_type) VALUES('Anon','3001234567','pickup'); RAISE EXCEPTION 'anon inserts orders'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.order_items(order_id,name) VALUES('00000000-0000-0000-0000-00000000b101','x'); RAISE EXCEPTION 'anon inserts order_items'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.create_order_with_items('Anon','3001234567','pickup',NULL,NULL,0,NULL,0,'[]'::jsonb,NULL); RAISE EXCEPTION 'anon executes create_order_with_items'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
-- Functions created by 20261006* inherit prod default ACLs (EXECUTE to anon); all must be revoked.
DO $$ DECLARE leaked text; BEGIN
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO leaked
  FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
  WHERE n.nspname='public' AND p.proname LIKE ANY (ARRAY['order\_%','track_analytics_event','prune_operational_retention','create_order_with_items'])
    AND has_function_privilege('anon', p.oid, 'EXECUTE');
  IF leaked IS NOT NULL THEN RAISE EXCEPTION 'anon can execute: %', leaked; END IF;
END $$;
DO $$ DECLARE leaked text; BEGIN
  SELECT string_agg(t, ', ') INTO leaked FROM unnest(ARRAY['orders','order_items','order_events','payment_attempts','order_refunds','order_rate_limits','order_provider_events','analytics_events']) t
  WHERE has_table_privilege('anon','public.'||t,'SELECT') OR has_table_privilege('anon','public.'||t,'INSERT');
  IF leaked IS NOT NULL THEN RAISE EXCEPTION 'anon table access: %', leaked; END IF;
END $$;
DELETE FROM public.order_events WHERE order_id::text LIKE '00000000-0000-0000-0000-00000000b1%';
DELETE FROM public.order_items WHERE order_id::text LIKE '00000000-0000-0000-0000-00000000b1%';
DELETE FROM public.orders WHERE id::text LIKE '00000000-0000-0000-0000-00000000b1%';
DELETE FROM public.products WHERE id='00000000-0000-0000-0000-00000000b010';
DELETE FROM public.categories WHERE id='prod-sentinel';
DELETE FROM public.ingredients WHERE id='prod-sentinel-base';
DELETE FROM public.settings WHERE key='prod_sentinel_private';
DELETE FROM public.user_roles WHERE user_id='00000000-0000-0000-0000-00000000b001';
DELETE FROM auth.users WHERE id='00000000-0000-0000-0000-00000000b001';
