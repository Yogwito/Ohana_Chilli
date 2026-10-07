-- Add authoritative combo promotion snapshots without changing existing orders.
CREATE OR REPLACE FUNCTION public.order_quote(p_request jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE
  item jsonb; extra jsonb; ident text; section text; ingredient_type text; selection jsonb; names jsonb;
  product products%ROWTYPE; ing ingredients%ROWTYPE; tariff ingredients%ROWTYPE; rule bowl_rules%ROWTYPE;
  meta product_default_ingredients%ROWTYPE; zone delivery_zones%ROWTYPE; promo promotions%ROWTYPE;
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
    ELSIF item->>'type'='promotion' THEN
      SELECT * INTO promo FROM promotions WHERE id::text=item->>'promotion_id' AND is_active AND type='combo'
        AND (starts_at IS NULL OR starts_at<=now()) AND (ends_at IS NULL OR ends_at>now())
        AND (days_of_week IS NULL OR cardinality(days_of_week)=0 OR extract(dow FROM local_time)::integer=ANY(days_of_week)) FOR SHARE;
      IF NOT FOUND OR promo.price_cents IS NULL OR promo.price_cents<=0 THEN RAISE EXCEPTION 'promotion_unavailable'; END IF;
      IF jsonb_array_length(coalesce(item->'removed','[]'))>0 OR jsonb_array_length(coalesce(item->'extras','[]'))>0 THEN RAISE EXCEPTION 'invalid_promotion_customization'; END IF;
      amount := promo.price_cents;
      details := details || jsonb_build_object('promotion_id',promo.id,'description',coalesce(promo.description,''));
      snapshots := snapshots || jsonb_build_array(jsonb_build_object('brand_id','ohana','name',promo.title,'quantity',qty,'unit_price_cents',amount,'details',details));
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

REVOKE ALL ON FUNCTION public.order_quote(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.order_quote(jsonb) TO service_role;
