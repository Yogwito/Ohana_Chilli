\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id) VALUES ('00000000-0000-0000-0000-000000000001'),('00000000-0000-0000-0000-000000000002');
INSERT INTO public.user_roles(user_id,role) VALUES('00000000-0000-0000-0000-000000000001','admin');
INSERT INTO public.brands(id,name) VALUES('ohana','Ohana');
INSERT INTO public.categories(id,brand_id,name) VALUES('test-menu','ohana','Test');
INSERT INTO public.products(id,brand_id,category_id,name,price_cents) VALUES('test-product','ohana','test-menu','Producto de prueba',10000);
INSERT INTO public.ingredients(id,type,name,price_cents) VALUES('test-base','base','Arroz',0),('test-protein','protein','Pollo',0),('test-acc','acompanante','Maíz',0),('test-premium','protein','Premium',7000),('protein-proteina-adicional','protein','Proteína adicional',5000);
INSERT INTO public.bowl_rules(size,name,price_cents,bases,proteins,accompaniments) VALUES('small','Pequeño',23900,1,1,4);
INSERT INTO public.delivery_zones(id,name,fee_cents) VALUES('00000000-0000-0000-0000-000000000003','Test zone',3000);
INSERT INTO public.settings(key,value) VALUES('business_hours_enforce','false');

DO $$ DECLARE req jsonb; q jsonb; result jsonb; oid uuid; online_id uuid; attempt jsonb; refund jsonb; count_before bigint; tracking jsonb; BEGIN
  IF has_table_privilege('anon','public.orders','SELECT') OR has_table_privilege('anon','public.orders','INSERT') OR has_table_privilege('authenticated','public.orders','UPDATE') THEN RAISE EXCEPTION 'direct access not revoked'; END IF;
  IF has_function_privilege('anon','public.create_order_with_items(text,text,text,text,text,integer,text,integer,jsonb)','EXECUTE') OR has_function_privilege('authenticated','public.order_create(jsonb,uuid,text,text)','EXECUTE') THEN RAISE EXCEPTION 'public RPC bypass'; END IF;
  IF has_table_privilege('anon','public.order_refunds','SELECT') OR has_table_privilege('anon','public.payment_attempts','SELECT') OR has_table_privilege('anon','public.order_events','SELECT') THEN RAISE EXCEPTION 'financial data exposed'; END IF;
  req := '{"customer_name":"Test Customer","phone":"3001234567","order_type":"delivery","payment_method":"cash","delivery_zone_id":"00000000-0000-0000-0000-000000000003","address":"Test address","items":[{"type":"product","product_id":"test-product","quantity":2,"unit_price_cents":1}]}'::jsonb;
  q := public.order_quote(req);
  IF (q->>'total')::integer<>23000 THEN RAISE EXCEPTION 'forged price accepted'; END IF;
  BEGIN PERFORM public.order_create(req,gen_random_uuid(),'forged',repeat('a',64)); RAISE EXCEPTION 'bad quote accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'quote_changed' THEN RAISE; END IF; END;
  result := public.order_create(req,'00000000-0000-0000-0000-000000000010',q->>'fingerprint',repeat('a',64)); oid:=(result->>'id')::uuid;
  IF public.order_create(req,'00000000-0000-0000-0000-000000000010',q->>'fingerprint',repeat('a',64))<>result THEN RAISE EXCEPTION 'retry creates duplicate'; END IF;
  BEGIN PERFORM public.order_create(req||'{"notes":"changed"}', '00000000-0000-0000-0000-000000000010',q->>'fingerprint',repeat('a',64)); RAISE EXCEPTION 'changed retry accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'idempotency_conflict' THEN RAISE; END IF; END;
  IF (SELECT count(*) FROM order_items WHERE order_id=oid)<>1 OR (SELECT count(*) FROM order_events WHERE order_id=oid)<>1 THEN RAISE EXCEPTION 'snapshots or history missing'; END IF;
  tracking:=public.order_track(repeat('a',64));
  IF tracking ? 'phone' OR tracking ? 'address' OR tracking ? 'customer_name' OR tracking ? 'tracking_hash' OR tracking ? 'notes' THEN RAISE EXCEPTION 'tracking leaks PII'; END IF;
  UPDATE orders SET tracking_expires_at=now()-interval '1 second' WHERE id=oid;
  BEGIN PERFORM public.order_track(repeat('a',64)); RAISE EXCEPTION 'expired token accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'tracking_not_found' THEN RAISE; END IF; END;
  UPDATE orders SET tracking_expires_at=now()+interval '30 days' WHERE id=oid;
  SELECT count(*) INTO count_before FROM orders;
  BEGIN PERFORM public.order_create(jsonb_set(req,'{items}','[{"type":"product","product_id":"test-product","quantity":0}]'),gen_random_uuid(),q->>'fingerprint',repeat('b',64)); RAISE EXCEPTION 'invalid quantity accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'invalid_quantity_or_notes' THEN RAISE; END IF; END;
  IF (SELECT count(*) FROM orders)<>count_before THEN RAISE EXCEPTION 'failed order did not roll back'; END IF;
  req:=jsonb_set(req,'{items}','[{"type":"custom-bowl","size":"small","quantity":1,"bases":["test-base"],"proteins":["test-protein"],"acompanantes":["test-acc","test-acc"],"extras":[{"ingredient_id":"test-protein","quantity":2,"source":"generic","tariff_id":"protein-proteina-adicional"}]}]');
  q:=public.order_quote(req);
  IF (q->>'total')::integer<>36900 THEN RAISE EXCEPTION 'bowl extras pricing incorrect'; END IF;
  BEGIN PERFORM public.order_quote(jsonb_set(req,'{items,0,proteins}','[]')); RAISE EXCEPTION 'missing protein accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'invalid_bowl_limits' THEN RAISE; END IF; END;
  BEGIN PERFORM public.order_quote(jsonb_set(req,'{items,0,bases}','["test-protein"]')); RAISE EXCEPTION 'wrong ingredient type accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'invalid_included_ingredient' THEN RAISE; END IF; END;
  BEGIN PERFORM public.order_quote(jsonb_set(req,'{items,0,extras,0,tariff_id}','"test-premium"')); RAISE EXCEPTION 'invalid tariff accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'invalid_tariff' THEN RAISE; END IF; END;
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
  BEGIN PERFORM public.order_action(oid,0,'accept'); RAISE EXCEPTION 'non-admin accepted order'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'forbidden' THEN RAISE; END IF; END;
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
  BEGIN PERFORM public.order_action(oid,0,'ready'); RAISE EXCEPTION 'transition skipped'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'invalid_transition' THEN RAISE; END IF; END;
  PERFORM public.order_action(oid,0,'acknowledge');
  IF (SELECT status FROM orders WHERE id=oid)<>'pending' THEN RAISE EXCEPTION 'acknowledge accepted order'; END IF;
  BEGIN PERFORM public.order_action(oid,0,'accept'); RAISE EXCEPTION 'stale update accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'version_conflict' THEN RAISE; END IF; END;
  PERFORM public.order_action(oid,1,'accept'); PERFORM public.order_action(oid,2,'prepare'); PERFORM public.order_action(oid,3,'ready'); PERFORM public.order_action(oid,4,'complete');
  req:=req||'{"payment_method":"online"}'; q:=public.order_quote(req);
  result:=public.order_create(req,gen_random_uuid(),q->>'fingerprint',repeat('c',64)); online_id:=(result->>'id')::uuid;
  IF (SELECT actionable_at FROM orders WHERE id=online_id) IS NOT NULL THEN RAISE EXCEPTION 'online order alerts before payment'; END IF;
  BEGIN PERFORM public.order_action(online_id,0,'accept'); RAISE EXCEPTION 'unpaid online order accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'not_actionable' THEN RAISE; END IF; END;
  attempt:=public.order_payment_start(repeat('c',64),'test');
  IF public.order_payment_start(repeat('c',64),'test')<>attempt THEN RAISE EXCEPTION 'duplicate pending attempt'; END IF;
  BEGIN PERFORM public.order_payment_apply(attempt->>'reference','test-transaction',1,'COP','test','APPROVED','bad-amount'); RAISE EXCEPTION 'bad amount accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'payment_mismatch' THEN RAISE; END IF; END;
  BEGIN PERFORM public.order_payment_apply(attempt->>'reference','test-transaction',3690000,'USD','test','APPROVED','bad-currency'); RAISE EXCEPTION 'bad currency accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'payment_mismatch' THEN RAISE; END IF; END;
  BEGIN PERFORM public.order_payment_apply(attempt->>'reference','test-transaction',3690000,'COP','prod','APPROVED','bad-env'); RAISE EXCEPTION 'bad environment accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'payment_mismatch' THEN RAISE; END IF; END;
  PERFORM public.order_payment_apply(attempt->>'reference','test-transaction',3690000,'COP','test','PENDING','pending');
  IF (SELECT actionable_at FROM orders WHERE id=online_id) IS NOT NULL THEN RAISE EXCEPTION 'pending payment alerts'; END IF;
  PERFORM public.order_payment_apply(attempt->>'reference','test-transaction',3690000,'COP','test','APPROVED','approved');
  PERFORM public.order_payment_apply(attempt->>'reference','test-transaction',3690000,'COP','test','APPROVED','approved');
  PERFORM public.order_payment_apply(attempt->>'reference','test-transaction',3690000,'COP','test','PENDING','late-pending');
  IF (SELECT count(*) FROM order_events WHERE order_id=online_id AND kind='payment_paid')<>1 OR (SELECT payment_state FROM orders WHERE id=online_id)<>'paid' OR (SELECT actionable_at FROM orders WHERE id=online_id) IS NULL THEN RAISE EXCEPTION 'payment not idempotent'; END IF;
  PERFORM public.order_action(online_id,2,'cancel','Customer requested cancellation');
  IF (SELECT payment_state FROM orders WHERE id=online_id)<>'paid' THEN RAISE EXCEPTION 'cancellation silently refunded'; END IF;
  refund:=public.order_refund_request(online_id,3,'Customer requested refund');
  IF public.order_refund_request(online_id,3,'duplicate reason')<>refund THEN RAISE EXCEPTION 'duplicate refund'; END IF;
  PERFORM public.order_refund_claim((refund->>'id')::uuid);
  IF public.order_refund_claim((refund->>'id')::uuid) IS NOT NULL THEN RAISE EXCEPTION 'duplicate refund submission'; END IF;
  BEGIN PERFORM public.order_refund_apply((refund->>'id')::uuid,'refund-id','test-transaction',100,'APPROVED'); RAISE EXCEPTION 'mismatched refund accepted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'refund_mismatch' THEN RAISE; END IF; END;
  PERFORM public.order_refund_apply((refund->>'id')::uuid,'refund-id','test-transaction',3690000,'APPROVED');
  PERFORM public.order_refund_apply((refund->>'id')::uuid,'refund-id','test-transaction',3690000,'APPROVED');
  IF (SELECT payment_state FROM orders WHERE id=online_id)<>'refunded' OR (SELECT count(*) FROM order_events WHERE order_id=online_id AND kind='refund_completed')<>1 THEN RAISE EXCEPTION 'refund completion not idempotent'; END IF;
  IF public.order_rate_limit('test',2) IS NOT TRUE OR public.order_rate_limit('test',2) IS NOT TRUE OR public.order_rate_limit('test',2) IS NOT FALSE THEN RAISE EXCEPTION 'rate limit ineffective'; END IF;
END $$;
-- Exercise RLS with real role changes, not just privilege metadata.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.orders) OR EXISTS(SELECT 1 FROM public.order_events) THEN RAISE EXCEPTION 'non-admin reads customer data'; END IF; END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.orders) THEN RAISE EXCEPTION 'admin cannot read orders'; END IF; END $$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM 1 FROM public.orders; RAISE EXCEPTION 'anonymous orders readable'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.orders(customer_name,phone,order_type) VALUES('Anon','3001234567','pickup'); RAISE EXCEPTION 'anonymous direct insert'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN PERFORM public.order_quote('{}'); RAISE EXCEPTION 'anonymous RPC bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
ROLLBACK;

-- Force a failure after order/item writes to prove transaction rollback.
BEGIN;
INSERT INTO public.brands(id,name) VALUES('rollback','Test');
INSERT INTO public.categories(id,brand_id,name) VALUES('rollback','rollback','Test');
INSERT INTO public.products(id,brand_id,category_id,name,price_cents) VALUES('rollback','rollback','rollback','Test',1000);
CREATE FUNCTION public.test_fail_order_event() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced_history_failure'; END $$;
CREATE TRIGGER test_fail_order_event BEFORE INSERT ON public.order_events FOR EACH ROW EXECUTE FUNCTION public.test_fail_order_event();
DO $$ DECLARE request jsonb; quote jsonb; before_count bigint; BEGIN
 request:='{"customer_name":"Rollback test","phone":"3001234567","order_type":"pickup","payment_method":"cash","items":[{"type":"product","product_id":"rollback","quantity":1}]}';
 quote:=public.order_quote(request); SELECT count(*) INTO before_count FROM public.orders;
 BEGIN PERFORM public.order_create(request,gen_random_uuid(),quote->>'fingerprint',repeat('f',64)); RAISE EXCEPTION 'forced rollback not raised'; EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'forced_history_failure' THEN RAISE; END IF; END;
 IF (SELECT count(*) FROM public.orders)<>before_count OR EXISTS(SELECT 1 FROM public.order_items WHERE name='Test') THEN RAISE EXCEPTION 'partial order persisted'; END IF;
END $$;
ROLLBACK;

BEGIN;
INSERT INTO public.brands(id,name) VALUES('payment-failure','Test');
INSERT INTO public.categories(id,brand_id,name) VALUES('payment-failure','payment-failure','Test');
INSERT INTO public.products(id,brand_id,category_id,name,price_cents) VALUES('payment-failure','payment-failure','payment-failure','Test',1000);
INSERT INTO auth.users(id) VALUES('00000000-0000-0000-0000-000000000088');
INSERT INTO public.user_roles(user_id,role) VALUES('00000000-0000-0000-0000-000000000088','admin');
DO $$ DECLARE request jsonb; quote jsonb; oid uuid; attempt jsonb; second jsonb; refund jsonb; BEGIN
 request:='{"customer_name":"Payment failure","phone":"3001234567","order_type":"pickup","payment_method":"online","items":[{"type":"product","product_id":"payment-failure","quantity":1}]}';
 quote:=public.order_quote(request);oid:=(public.order_create(request,gen_random_uuid(),quote->>'fingerprint',repeat('e',64))->>'id')::uuid;
 attempt:=public.order_payment_start(repeat('e',64),'test');
 PERFORM public.order_payment_apply(attempt->>'reference','rejected-id',100000,'COP','test','DECLINED','rejected-fixture');
 IF (SELECT actionable_at FROM public.orders WHERE id=oid) IS NOT NULL OR (SELECT payment_state FROM public.orders WHERE id=oid)<>'rejected' THEN RAISE EXCEPTION 'rejected payment actionable'; END IF;
 second:=public.order_payment_start(repeat('e',64),'test');
 IF second->>'reference'=attempt->>'reference' OR second->>'order_id'<>oid::text THEN RAISE EXCEPTION 'payment retry identity invalid'; END IF;
 PERFORM public.order_payment_apply(second->>'reference','approved-id',100000,'COP','test','APPROVED','second-approved-fixture');
 PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000088',true);
 refund:=public.order_refund_request(oid,4,'Refund failure test');PERFORM public.order_refund_claim((refund->>'id')::uuid);
 PERFORM public.order_refund_apply((refund->>'id')::uuid,'failed-refund','approved-id',100000,'DECLINED');
 IF (SELECT payment_state FROM public.orders WHERE id=oid)<>'paid' OR (SELECT state FROM public.order_refunds WHERE order_id=oid)<>'failed' THEN RAISE EXCEPTION 'failed refund changed paid state'; END IF;
END $$;
ROLLBACK;

-- Match the existing builder: repeated included portions are legal within size limits.
BEGIN;
INSERT INTO public.ingredients(id,type,name,price_cents) VALUES('portion-base','base','Arroz',0),('portion-protein','protein','Pollo',0),('portion-sauce','sauce','BBQ',0),('portion-topping','topping','Ajonjolí',0);
INSERT INTO public.bowl_rules(size,name,price_cents,bases,proteins,accompaniments) VALUES('small','Small',23900,1,1,4),('large','Large',32900,2,3,6);
DO $$ DECLARE request jsonb; BEGIN
 request:='{"order_type":"pickup","payment_method":"cash","items":[{"type":"custom-bowl","size":"large","quantity":1,"bases":["portion-base","portion-base"],"proteins":["portion-protein","portion-protein","portion-protein"],"sauces":["portion-sauce","portion-sauce","portion-sauce"],"complementos":["portion-topping","portion-topping","portion-topping"]}]}';
 IF (public.order_quote(request)->>'total')::integer<>32900 THEN RAISE EXCEPTION 'included portions incorrectly charged'; END IF;
 request:=jsonb_set(request,'{items,0,size}','"small"');request:=jsonb_set(request,'{items,0,bases}','["portion-base"]');request:=jsonb_set(request,'{items,0,proteins}','["portion-protein"]');
 BEGIN PERFORM public.order_quote(request);RAISE EXCEPTION 'small sauce/topping limits bypassed';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'invalid_bowl_limits' THEN RAISE;END IF;END;
END $$;
ROLLBACK;

BEGIN;
DO $$ DECLARE closed_range text; BEGIN
 closed_range:=to_char((now() AT TIME ZONE 'America/Bogota')+interval '1 hour','HH24:MI');
 INSERT INTO public.settings(key,value) VALUES('business_hours_enforce','true'),('hours_weekday',closed_range||' - '||closed_range),('hours_weekend',closed_range||' - '||closed_range);
 BEGIN PERFORM public.order_quote('{"order_type":"pickup","payment_method":"cash","items":[]}');RAISE EXCEPTION 'hours bypassed';EXCEPTION WHEN raise_exception THEN IF SQLERRM<>'business_closed' THEN RAISE;END IF;END;
END $$;
ROLLBACK;
