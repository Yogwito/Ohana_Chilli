-- Run only against local/staging after 21d. All successful orders are rolled back.
\set ON_ERROR_STOP on
BEGIN;
DO $test$
DECLARE
  simple record;
  flavored record;
  other_variant record;
  flavor record;
  item jsonb;
  item_other jsonb;
  open_hours jsonb;
  msg text;
BEGIN
  SELECT p.id, p.name, p.price_cents INTO simple FROM public.products p
  WHERE p.is_active AND NOT EXISTS (SELECT 1 FROM public.product_variants v WHERE v.product_id=p.id AND v.is_active)
  ORDER BY p.id LIMIT 1;
  SELECT p.id, p.name, p.price_cents INTO flavored FROM public.products p
  WHERE p.is_active AND EXISTS (SELECT 1 FROM public.product_variants v WHERE v.product_id=p.id AND v.is_active)
  ORDER BY p.id LIMIT 1;
  SELECT v.id, v.name, v.price_delta_cents INTO flavor FROM public.product_variants v
  WHERE v.product_id=flavored.id AND v.is_active ORDER BY v.id LIMIT 1;
  SELECT v.id, v.name INTO other_variant FROM public.product_variants v
  WHERE v.product_id<>flavored.id AND v.is_active ORDER BY v.id LIMIT 1;
  IF simple.id IS NULL OR flavored.id IS NULL OR other_variant.id IS NULL THEN
    RAISE EXCEPTION 'Test requiere producto simple y variantes activas en dos productos';
  END IF;
  item := jsonb_build_object('brand_id','ohana','name',flavored.name,'quantity',1,
    'unit_price_cents',flavored.price_cents+flavor.price_delta_cents,
    'details',jsonb_build_object('product_id',flavored.id,'customizations',jsonb_build_object('variant',jsonb_build_object('id',flavor.id,'name',flavor.name))));
  item_other := jsonb_build_object('brand_id','ohana','name',simple.name,'quantity',1,
    'unit_price_cents',simple.price_cents,'details',jsonb_build_object('product_id',simple.id));
  UPDATE public.settings SET value='false' WHERE key='business_hours_enforce';

  -- Active variant and the unchanged simple-product 21c path succeed.
  PERFORM public.create_order_with_items('Prueba 21d','3001234567','pickup',NULL,NULL,0,NULL,
    flavored.price_cents+flavor.price_delta_cents,jsonb_build_array(item));
  PERFORM public.create_order_with_items('Prueba 21d','3001234567','pickup',NULL,NULL,0,NULL,
    simple.price_cents,jsonb_build_array(item_other));

  BEGIN
    PERFORM public.create_order_with_items('Prueba 21d','3001234567','pickup',NULL,NULL,0,NULL,
      flavored.price_cents,jsonb_build_array(item #- '{details,customizations,variant}' || jsonb_build_object('unit_price_cents',flavored.price_cents)));
    RAISE EXCEPTION 'Aceptó sabor ausente';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;
    IF msg !~ 'Falta seleccionar sabor' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.create_order_with_items('Prueba 21d','3001234567','pickup',NULL,NULL,0,NULL,
      flavored.price_cents,jsonb_build_array(jsonb_set(item,'{details,customizations,variant,id}',to_jsonb(other_variant.id))));
    RAISE EXCEPTION 'Aceptó variante de otro producto';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;
    IF msg !~ 'Sabor/variante no disponible' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.create_order_with_items('Prueba 21d','3001234567','pickup',NULL,NULL,0,NULL,
      flavored.price_cents+flavor.price_delta_cents,jsonb_build_array(jsonb_set(item,'{details,customizations,variant,name}','"Falso"'::jsonb)));
    RAISE EXCEPTION 'Aceptó nombre de sabor manipulado';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;
    IF msg !~ 'Sabor/variante no disponible' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.create_order_with_items('Prueba 21d','3001234567','pickup',NULL,NULL,0,NULL,
      11*simple.price_cents,jsonb_build_array(jsonb_set(item_other,'{quantity}','11'::jsonb)));
    RAISE EXCEPTION 'Aceptó once unidades';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;
    IF msg !~ 'más de 10 unidades' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.create_order_with_items('Prueba 21d','3001234567','pickup',NULL,NULL,0,NULL,
      11*flavored.price_cents,jsonb_build_array(item_other, jsonb_set(item_other,'{quantity}','10'::jsonb)));
    RAISE EXCEPTION 'Aceptó once unidades en dos líneas';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;
    IF msg !~ 'más de 10 unidades' THEN RAISE; END IF;
  END;

  open_hours := (SELECT jsonb_agg(jsonb_build_object('open','00:00','close','23:59')) FROM generate_series(0,6));
  INSERT INTO public.settings(key,value) VALUES ('business_hours_weekly','[null,null,null,null,null,null,null]')
  ON CONFLICT(key) DO UPDATE SET value=excluded.value;
  UPDATE public.settings SET value='true' WHERE key='business_hours_enforce';
  BEGIN
    PERFORM public.create_order_with_items('Prueba 21d','3001234567','pickup',NULL,NULL,0,NULL,
      simple.price_cents,jsonb_build_array(item_other));
    RAISE EXCEPTION 'Aceptó pedido cerrado';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS msg = MESSAGE_TEXT;
    IF msg !~ 'Estamos cerrados' THEN RAISE; END IF;
  END;
  UPDATE public.settings SET value=open_hours::text WHERE key='business_hours_weekly';
  PERFORM public.create_order_with_items('Prueba 21d','3001234567','pickup',NULL,NULL,0,NULL,
    simple.price_cents,jsonb_build_array(item_other));
  RAISE NOTICE '21d: sabor, variante ajena, horario cerrado/abierto y límite 10 verificados';
END $test$;
ROLLBACK;
