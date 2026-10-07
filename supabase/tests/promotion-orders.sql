\set ON_ERROR_STOP on
BEGIN;
INSERT INTO public.brands(id,name) VALUES('ohana','Ohana') ON CONFLICT DO NOTHING;
INSERT INTO public.promotions(id,title,type,price_cents,is_active) VALUES('00000000-0000-0000-0000-000000001234','Combo canonical','combo',18000,true);
DO $$ DECLARE req jsonb; q jsonb; created jsonb; BEGIN
req:='{"customer_name":"Test","phone":"3001234567","order_type":"pickup","payment_method":"cash","items":[{"type":"promotion","promotion_id":"00000000-0000-0000-0000-000000001234","quantity":2,"price":1}]}';
q:=order_quote(req);
IF (q->>'total')::integer<>36000 OR q#>>'{items,0,name}'<>'Combo canonical' THEN RAISE EXCEPTION 'promotion quote failed'; END IF;
created:=order_create(req,gen_random_uuid(),q->>'fingerprint',repeat('f',64));
IF created#>>'{receipt,items,0,name}'<>'Combo canonical' THEN RAISE EXCEPTION 'promotion snapshot failed'; END IF;
UPDATE promotions SET price_cents=19000 WHERE id='00000000-0000-0000-0000-000000001234';
BEGIN PERFORM order_create(req,gen_random_uuid(),q->>'fingerprint',repeat('e',64)); RAISE EXCEPTION 'stale price accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'quote_changed' THEN RAISE; END IF; END;
UPDATE promotions SET ends_at=now()-interval '1 second' WHERE id='00000000-0000-0000-0000-000000001234';
BEGIN PERFORM order_quote(req); RAISE EXCEPTION 'expired combo accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'promotion_unavailable' THEN RAISE; END IF; END;
UPDATE promotions SET ends_at=NULL,is_active=false WHERE id='00000000-0000-0000-0000-000000001234';
BEGIN PERFORM order_quote(req); RAISE EXCEPTION 'inactive combo accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'promotion_unavailable' THEN RAISE; END IF; END;
END $$;
ROLLBACK;
