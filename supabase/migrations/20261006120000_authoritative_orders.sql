-- Additive cutover. Run only after live audit, backup/restore drill and Edge deployment.
-- Existing snapshots and payment knowledge are preserved.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS payment_state text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS actionable_at timestamptz,
  ADD COLUMN IF NOT EXISTS tracking_hash text,
  ADD COLUMN IF NOT EXISTS tracking_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS request_key uuid,
  ADD COLUMN IF NOT EXISTS request_hash text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_request_key ON public.orders(request_key);
CREATE UNIQUE INDEX IF NOT EXISTS orders_tracking_hash ON public.orders(tracking_hash);
CREATE INDEX IF NOT EXISTS orders_attention ON public.orders(actionable_at) WHERE acknowledged_at IS NULL AND status = 'pending';
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('legacy','cash','transfer','online')) NOT VALID;
ALTER TABLE public.orders ADD CONSTRAINT orders_payment_state_check CHECK (payment_state IN ('unknown','unpaid','unverified','pending','paid','rejected','refunded')) NOT VALID;
ALTER TABLE public.orders ADD CONSTRAINT orders_amount_check CHECK (total_cents >= 0 AND delivery_fee_cents >= 0 AND delivery_fee_cents <= total_cents) NOT VALID;
ALTER TABLE public.order_items ADD CONSTRAINT order_items_amount_quantity_check CHECK (quantity BETWEEN 1 AND 20 AND unit_price_cents >= 0) NOT VALID;
-- NOT VALID avoids rewriting or rejecting historical data; enforced for every new write.
ALTER TABLE public.product_default_ingredients ADD COLUMN IF NOT EXISTS is_extra boolean NOT NULL DEFAULT false;
ALTER TABLE public.product_default_ingredients ADD COLUMN IF NOT EXISTS extra_price_cents integer NOT NULL DEFAULT 0;

CREATE TABLE public.order_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id),
  actor_id uuid REFERENCES auth.users(id), kind text NOT NULL, data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.order_events(order_id, created_at);
CREATE TABLE public.payment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.orders(id),
  reference text NOT NULL UNIQUE, provider_id text UNIQUE, environment text NOT NULL CHECK (environment IN ('test','prod')),
  amount_cop integer NOT NULL CHECK (amount_cop > 0), currency text NOT NULL DEFAULT 'COP' CHECK (currency = 'COP'),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','paid','rejected')),
  provider_status text, expires_at timestamptz NOT NULL DEFAULT now() + interval '30 minutes',
  checked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX payment_one_unresolved ON public.payment_attempts(order_id) WHERE state IN ('pending','paid');
CREATE TABLE public.order_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id),
  attempt_id uuid NOT NULL REFERENCES public.payment_attempts(id), actor_id uuid NOT NULL REFERENCES auth.users(id),
  amount_cop integer NOT NULL CHECK (amount_cop > 0), reason text NOT NULL CHECK (length(reason) BETWEEN 3 AND 500),
  state text NOT NULL DEFAULT 'requested' CHECK (state IN ('requested','processing','completed','failed')),
  provider_id text UNIQUE, error_code text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.order_rate_limits (key text PRIMARY KEY, window_start timestamptz NOT NULL, attempts integer NOT NULL);
CREATE TABLE public.order_provider_events (key text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());

-- Remove every historical policy on sensitive order tables, including unknown live policy names.
DO $$ DECLARE p record; t text; BEGIN
  FOREACH t IN ARRAY ARRAY['orders','order_items','order_events','payment_attempts','order_refunds','order_rate_limits','order_provider_events'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    IF t NOT IN ('order_rate_limits','order_provider_events') THEN
      EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t);
      EXECUTE format('CREATE POLICY admin_read ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''admin''))', t);
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.create_order_with_items(text,text,text,text,text,integer,text,integer,jsonb) FROM PUBLIC, anon, authenticated;
-- Metadata must also be readable under RLS.
ALTER TABLE public.product_default_ingredients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS order_catalog_metadata ON public.product_default_ingredients;
CREATE POLICY order_catalog_metadata ON public.product_default_ingredients FOR SELECT USING (true);
GRANT SELECT ON public.product_default_ingredients TO anon, authenticated;

CREATE FUNCTION public.order_rate_limit(p_key text, p_limit integer DEFAULT 10) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE n integer; BEGIN
  INSERT INTO order_rate_limits VALUES(p_key,now(),1)
  ON CONFLICT (key) DO UPDATE SET
    attempts = CASE WHEN order_rate_limits.window_start < now()-interval '10 minutes' THEN 1 ELSE order_rate_limits.attempts+1 END,
    window_start = CASE WHEN order_rate_limits.window_start < now()-interval '10 minutes' THEN now() ELSE order_rate_limits.window_start END
  RETURNING attempts INTO n;
  RETURN n <= p_limit;
END $$;

CREATE FUNCTION public.order_generic_ingredient(p_id text, p_name text) RETURNS boolean
LANGUAGE sql IMMUTABLE SET search_path=public AS $$
  SELECT p_id IN ('protein-proteina-adicional','acompanante-adicional','topping-complemento-adicional')
    OR lower(translate(p_name,'íñáéóú','inaeou')) IN ('proteina adicional','proteina extra','acompanante adicional','acompanante extra','complemento adicional','complemento extra');
$$;

CREATE FUNCTION public.order_quote(p_request jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE
  item jsonb; extra jsonb; ident text; section text; ingredient_type text; selection jsonb; names jsonb;
  product products%ROWTYPE; ing ingredients%ROWTYPE; tariff ingredients%ROWTYPE; rule bowl_rules%ROWTYPE;
  meta product_default_ingredients%ROWTYPE; zone delivery_zones%ROWTYPE;
  qty integer; amount integer; unit_amount integer; maximum integer; minimum integer;
  subtotal bigint := 0; fee integer := 0; snapshots jsonb := '[]'; details jsonb; extras jsonb;
  hours text; matches text[]; clock_time time; local_time timestamp := now() AT TIME ZONE 'America/Bogota';
BEGIN
  IF p_request->>'order_type' NOT IN ('pickup','delivery') OR p_request->>'order_type' IS NULL THEN RAISE EXCEPTION 'invalid_order_type'; END IF;
  IF p_request->>'payment_method' NOT IN ('cash','transfer','online') OR p_request->>'payment_method' IS NULL THEN RAISE EXCEPTION 'invalid_payment_method'; END IF;
  IF (SELECT value FROM settings WHERE key='business_hours_enforce')='true' THEN
    SELECT value INTO hours FROM settings WHERE key=CASE WHEN extract(dow FROM local_time) IN (0,6) THEN 'hours_weekend' ELSE 'hours_weekday' END;
    matches := regexp_match(hours, '(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})');
    IF matches IS NULL THEN RAISE EXCEPTION 'hours_not_configured'; END IF;
    clock_time := local_time::time;
    IF (matches[1]::time <= matches[2]::time AND (clock_time < matches[1]::time OR clock_time > matches[2]::time))
      OR (matches[1]::time > matches[2]::time AND clock_time < matches[1]::time AND clock_time > matches[2]::time) THEN RAISE EXCEPTION 'business_closed'; END IF;
  END IF;
  IF jsonb_typeof(p_request->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(p_request->'items') NOT BETWEEN 1 AND 30 THEN RAISE EXCEPTION 'invalid_items'; END IF;
  IF p_request->>'order_type'='delivery' THEN
    SELECT * INTO zone FROM delivery_zones WHERE id::text=p_request->>'delivery_zone_id' AND is_active FOR SHARE;
    IF NOT FOUND OR zone.fee_cents < 0 THEN RAISE EXCEPTION 'invalid_delivery_zone'; END IF;
    fee := zone.fee_cents;
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_request->'items') LOOP
    qty := (item->>'quantity')::integer;
    IF qty IS NULL OR qty NOT BETWEEN 1 AND 20 OR length(coalesce(item->>'notes',''))>500 THEN RAISE EXCEPTION 'invalid_quantity_or_notes'; END IF;
    amount := 0; details := jsonb_build_object('notes', coalesce(item->>'notes','')); extras := '[]';
    IF item->>'type'='product' THEN
      SELECT * INTO product FROM products WHERE id::text=item->>'product_id' AND is_active FOR SHARE;
      IF NOT FOUND OR product.price_cents < 0 THEN RAISE EXCEPTION 'product_unavailable'; END IF;
      amount := product.price_cents;
      names := '[]';
      IF jsonb_typeof(coalesce(item->'removed','[]')) <> 'array' OR jsonb_array_length(coalesce(item->'removed','[]'))>30 THEN RAISE EXCEPTION 'invalid_removals'; END IF;
      FOR ident IN SELECT jsonb_array_elements_text(coalesce(item->'removed','[]')) LOOP
        SELECT * INTO meta FROM product_default_ingredients WHERE product_id::text=product.id::text AND ingredient_name=ident AND is_removable AND NOT is_extra FOR SHARE;
        IF NOT FOUND THEN RAISE EXCEPTION 'invalid_removal'; END IF;
        names := names || jsonb_build_array(meta.ingredient_name);
      END LOOP;
      details := details || jsonb_build_object('removed',names,'recipe',coalesce(to_jsonb(product.ingredients_list),'[]'::jsonb));
      IF jsonb_typeof(coalesce(item->'extras','[]')) <> 'array' OR jsonb_array_length(coalesce(item->'extras','[]'))>20 THEN RAISE EXCEPTION 'invalid_extras'; END IF;
      FOR extra IN SELECT value FROM jsonb_array_elements(coalesce(item->'extras','[]')) LOOP
        SELECT * INTO meta FROM product_default_ingredients WHERE id::text=extra->>'ingredient_id' AND product_id::text=product.id::text AND is_extra FOR SHARE;
        IF NOT FOUND OR meta.extra_price_cents <= 0 THEN RAISE EXCEPTION 'invalid_product_extra'; END IF;
        unit_amount := (extra->>'quantity')::integer;
        IF unit_amount IS NULL OR unit_amount NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'invalid_extra_quantity'; END IF;
        amount := amount + meta.extra_price_cents * unit_amount;
        extras := extras || jsonb_build_array(jsonb_build_object('name',meta.ingredient_name,'quantity',unit_amount,'unit_price_cents',meta.extra_price_cents));
      END LOOP;
      details := details || jsonb_build_object('extras',extras,'product_id',product.id);
      snapshots := snapshots || jsonb_build_array(jsonb_build_object('brand_id',product.brand_id,'name',product.name,'quantity',qty,'unit_price_cents',amount,'details',details));
    ELSIF item->>'type'='custom-bowl' THEN
      SELECT * INTO rule FROM bowl_rules WHERE size=item->>'size' FOR SHARE;
      IF NOT FOUND OR rule.price_cents<0 THEN RAISE EXCEPTION 'size_unavailable'; END IF;
      amount := rule.price_cents;
      FOREACH section IN ARRAY ARRAY['bases','proteins','acompanantes','sauces','complementos'] LOOP
        ingredient_type := CASE section WHEN 'bases' THEN 'base' WHEN 'proteins' THEN 'protein' WHEN 'acompanantes' THEN 'acompanante' WHEN 'sauces' THEN 'sauce' ELSE 'topping' END;
        maximum := CASE section WHEN 'bases' THEN rule.bases WHEN 'proteins' THEN rule.proteins WHEN 'acompanantes' THEN rule.accompaniments ELSE CASE rule.size WHEN 'large' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END END;
        minimum := CASE WHEN section IN ('bases','proteins') THEN 1 ELSE 0 END;
        selection := coalesce(item->section,'[]'); names := '[]';
        IF jsonb_typeof(selection)<>'array' OR jsonb_array_length(selection) NOT BETWEEN minimum AND maximum THEN RAISE EXCEPTION 'invalid_bowl_limits'; END IF;
        IF section='acompanantes' AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(selection) s GROUP BY s HAVING count(*)>3) THEN RAISE EXCEPTION 'duplicate_ingredient'; END IF;
        FOR ident IN SELECT jsonb_array_elements_text(selection) LOOP
          SELECT * INTO ing FROM ingredients WHERE id::text=ident AND type=ingredient_type AND is_active FOR SHARE;
          IF NOT FOUND OR order_generic_ingredient(ing.id::text,ing.name) OR ing.price_cents<>0 THEN RAISE EXCEPTION 'invalid_included_ingredient'; END IF;
          names := names || jsonb_build_array(ing.name);
        END LOOP;
        details := details || jsonb_build_object(section,names);
      END LOOP;
      IF jsonb_typeof(coalesce(item->'extras','[]'))<>'array' OR jsonb_array_length(coalesce(item->'extras','[]'))>20 THEN RAISE EXCEPTION 'invalid_extras'; END IF;
      FOR extra IN SELECT value FROM jsonb_array_elements(coalesce(item->'extras','[]')) LOOP
        SELECT * INTO ing FROM ingredients WHERE id::text=extra->>'ingredient_id' AND is_active FOR SHARE;
        IF NOT FOUND OR ing.type='base' OR order_generic_ingredient(ing.id::text,ing.name) THEN RAISE EXCEPTION 'invalid_extra'; END IF;
        IF extra->>'source'='catalog' THEN
          IF ing.price_cents<=0 THEN RAISE EXCEPTION 'invalid_tariff'; END IF;
          unit_amount := ing.price_cents;
        ELSIF extra->>'source'='generic' THEN
          SELECT * INTO tariff FROM ingredients WHERE id::text=extra->>'tariff_id' AND is_active AND type=ing.type FOR SHARE;
          IF NOT FOUND OR NOT order_generic_ingredient(tariff.id::text,tariff.name) THEN RAISE EXCEPTION 'invalid_tariff'; END IF;
          unit_amount := CASE WHEN tariff.price_cents>0 THEN tariff.price_cents WHEN ing.type='protein' THEN 5000 ELSE 3000 END;
        ELSIF extra->>'source' IN ('upsell','suggestion') THEN
          -- Canonical catalog premium always wins. Fixed menu tariffs match existing builder.
          unit_amount := CASE WHEN ing.price_cents>0 THEN ing.price_cents WHEN ing.type='protein' THEN 5000 WHEN ing.type='sauce' THEN 2000 WHEN ing.type='topping' THEN 500 WHEN extra->>'source'='upsell' THEN 2000 ELSE 3000 END;
          -- Upsell accompanies included protein or a catalog premium only.
          IF extra->>'source'='upsell' AND ing.price_cents=0 AND NOT (ing.type='protein' AND item->'proteins' ? ing.id::text) THEN RAISE EXCEPTION 'invalid_upsell'; END IF;
        ELSE RAISE EXCEPTION 'invalid_tariff'; END IF;
        maximum := (extra->>'quantity')::integer;
        IF maximum IS NULL OR maximum NOT BETWEEN 1 AND 10 THEN RAISE EXCEPTION 'invalid_extra_quantity'; END IF;
        amount := amount + unit_amount*maximum;
        extras := extras || jsonb_build_array(jsonb_build_object('name',ing.name,'quantity',maximum,'unit_price_cents',unit_amount));
      END LOOP;
      details := details || jsonb_build_object('size',rule.name,'extras',extras);
      snapshots := snapshots || jsonb_build_array(jsonb_build_object('brand_id','ohana','name','Bowl Personalizado','quantity',qty,'unit_price_cents',amount,'details',details));
    ELSE RAISE EXCEPTION 'invalid_item_type'; END IF;
    subtotal := subtotal + amount::bigint*qty;
  END LOOP;
  IF subtotal+fee NOT BETWEEN 1 AND 10000000 THEN RAISE EXCEPTION 'invalid_total'; END IF;
  RETURN jsonb_build_object('items',snapshots,'subtotal',subtotal,'delivery_fee',fee,'delivery_zone',zone.name,'total',subtotal+fee,
    'fingerprint',encode(digest((snapshots::text || fee::text || coalesce(zone.name,'')),'sha256'),'hex'));
END $$;

CREATE FUNCTION public.order_receipt(p_id uuid) RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT jsonb_build_object('id',o.id,'total',o.total_cents,'receipt',jsonb_build_object(
   'total',o.total_cents,'delivery_fee',o.delivery_fee_cents,'delivery_zone',o.delivery_zone,
   'items',(SELECT jsonb_agg(jsonb_build_object('name',i.name,'quantity',i.quantity,'unit_price_cents',i.unit_price_cents,'details',i.details) ORDER BY i.id) FROM order_items i WHERE i.order_id=o.id)))
 FROM orders o WHERE o.id=p_id;
$$;

CREATE FUNCTION public.order_create(p_request jsonb, p_key uuid, p_quote text, p_tracking_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE q jsonb; existing orders%ROWTYPE; oid uuid; request_digest text; BEGIN
  request_digest := encode(digest(p_request::text,'sha256'),'hex');
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key::text,0));
  SELECT * INTO existing FROM orders WHERE request_key=p_key;
  IF FOUND THEN
    IF existing.request_hash<>request_digest OR existing.tracking_hash<>p_tracking_hash THEN RAISE EXCEPTION 'idempotency_conflict'; END IF;
    RETURN order_receipt(existing.id);
  END IF;
  IF length(trim(coalesce(p_request->>'customer_name',''))) NOT BETWEEN 2 AND 100 OR coalesce(p_request->>'phone','') !~ '^\+?[0-9 -]{10,20}$' OR length(coalesce(p_request->>'notes',''))>500 THEN RAISE EXCEPTION 'invalid_customer'; END IF;
  IF p_request->>'order_type'='delivery' AND length(trim(coalesce(p_request->>'address',''))) NOT BETWEEN 5 AND 300 THEN RAISE EXCEPTION 'invalid_address'; END IF;
  IF p_key IS NULL THEN RAISE EXCEPTION 'invalid_idempotency_key'; END IF;
  IF p_tracking_hash IS NULL OR p_tracking_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid_tracking_hash'; END IF;
  q := order_quote(p_request);
  IF q->>'fingerprint' IS DISTINCT FROM p_quote THEN RAISE EXCEPTION 'quote_changed'; END IF;
  INSERT INTO orders(customer_name,phone,order_type,address,notes,total_cents,delivery_zone,delivery_fee_cents,payment_method,payment_state,actionable_at,request_key,request_hash,tracking_hash,tracking_expires_at)
  VALUES (trim(p_request->>'customer_name'),p_request->>'phone',p_request->>'order_type',p_request->>'address',p_request->>'notes',(q->>'total')::integer,q->>'delivery_zone',(q->>'delivery_fee')::integer,
    p_request->>'payment_method',CASE p_request->>'payment_method' WHEN 'cash' THEN 'unpaid' WHEN 'transfer' THEN 'unverified' ELSE 'pending' END,
    CASE WHEN p_request->>'payment_method'<>'online' THEN now() END,p_key,request_digest,p_tracking_hash,now()+interval '30 days') RETURNING id INTO oid;
  INSERT INTO order_items(order_id,brand_id,name,quantity,unit_price_cents,details)
    SELECT oid, x.brand_id,x.name,x.quantity,x.unit_price_cents,x.details FROM jsonb_to_recordset(q->'items') x(brand_id text,name text,quantity integer,unit_price_cents integer,details jsonb);
  INSERT INTO order_events(order_id,kind) VALUES(oid,'created');
  RETURN order_receipt(oid);
END $$;

CREATE FUNCTION public.order_action(p_id uuid,p_version integer,p_action text,p_note text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o orders%ROWTYPE; next_status text; BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO o FROM orders WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF o.version<>p_version THEN RAISE EXCEPTION 'version_conflict'; END IF;
  IF length(p_note)>1000 THEN RAISE EXCEPTION 'invalid_note'; END IF;
  IF p_action IN ('accept','prepare','ready','complete') AND o.payment_method='online' AND o.payment_state<>'paid' THEN RAISE EXCEPTION 'not_actionable'; END IF;
  next_status := o.status;
  CASE p_action
    WHEN 'acknowledge' THEN
      IF o.actionable_at IS NULL OR o.status<>'pending' THEN RAISE EXCEPTION 'not_actionable'; END IF;
    WHEN 'accept' THEN
      IF o.status<>'pending' OR o.actionable_at IS NULL OR (o.payment_method='online' AND o.payment_state<>'paid') THEN RAISE EXCEPTION 'not_actionable'; END IF;
      next_status := 'confirmed';
    WHEN 'prepare' THEN IF o.status<>'confirmed' THEN RAISE EXCEPTION 'invalid_transition'; END IF; next_status := 'preparing';
    WHEN 'ready' THEN IF o.status<>'preparing' THEN RAISE EXCEPTION 'invalid_transition'; END IF; next_status := 'ready';
    WHEN 'complete' THEN IF o.status<>'ready' THEN RAISE EXCEPTION 'invalid_transition'; END IF; next_status := 'delivered';
    WHEN 'cancel' THEN IF o.status IN ('cancelled','delivered') OR length(trim(p_note))<3 THEN RAISE EXCEPTION 'invalid_transition_or_reason'; END IF; next_status := 'cancelled';
    WHEN 'record_payment' THEN
      IF o.payment_method NOT IN ('cash','transfer') OR o.payment_state NOT IN ('unpaid','unverified') OR length(trim(p_note))<3 THEN RAISE EXCEPTION 'invalid_payment_confirmation'; END IF;
      UPDATE orders SET payment_state='paid' WHERE id=p_id;
    WHEN 'resolve' THEN IF o.status IN ('cancelled','delivered') OR length(trim(p_note))<3 THEN RAISE EXCEPTION 'invalid_resolution'; END IF;
    ELSE RAISE EXCEPTION 'invalid_action';
  END CASE;
  UPDATE orders SET status=next_status, version=version+1,
    acknowledged_at=CASE WHEN p_action IN ('acknowledge','accept','cancel') THEN coalesce(acknowledged_at,now()) ELSE acknowledged_at END
    WHERE id=p_id;
  INSERT INTO order_events(order_id,actor_id,kind,data) VALUES(p_id,auth.uid(),p_action,jsonb_build_object('note',p_note,'from',o.status,'to',next_status));
  RETURN jsonb_build_object('version',o.version+1,'status',next_status);
END $$;

CREATE FUNCTION public.order_track(p_hash text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o orders%ROWTYPE; BEGIN
  SELECT * INTO o FROM orders WHERE tracking_hash=p_hash AND tracking_expires_at>now();
  IF NOT FOUND THEN RAISE EXCEPTION 'tracking_not_found'; END IF;
  RETURN jsonb_build_object('reference',left(o.id::text,8),'status',o.status,'payment_state',o.payment_state,'payment_method',o.payment_method,'total',o.total_cents,'delivery_fee',o.delivery_fee_cents,'created_at',o.created_at,
    'items',(SELECT jsonb_agg(jsonb_build_object('name',name,'quantity',quantity,'unit_price_cents',unit_price_cents,'recipe',details - ARRAY['notes','customizations'])) FROM order_items WHERE order_id=o.id),
    'refund_state',(SELECT state FROM order_refunds WHERE order_id=o.id));
END $$;

-- Backend-only quote/create/track paths; admin transitions use verified auth.uid().
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('order_quote','order_create','order_receipt','order_track','order_rate_limit','order_generic_ingredient','order_action') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.order_action(uuid,integer,text,text) TO authenticated;
DO $$ BEGIN
  IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='orders') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
