-- Verificación de los 5 tipos de pedido del frontend legacy 98bd908 + precio manipulado.
-- NO deja datos: todo corre dentro de una transacción que termina en ROLLBACK.
-- Uso (ids del catálogo real del entorno, NUNCA prod sin aprobación):
--   psql "$DB" -v ON_ERROR_STOP=1 \
--     -v simple_product_id=<uuid sin variantes ni extras> \
--     -v extra_product_id=<uuid> -v extra_id=<uuid product_default_ingredients is_extra> \
--     -v variant_product_id=<uuid con variantes activas> \
--     -v bowl_size=medium -v bowl_ingredient_ids='arroz,pollo' \
--     -v promo_id=<uuid promotions type=combo activa> \
--     -f supabase/hotfix/verify_checkout_cases.sql
-- Cada caso imprime OK / RECHAZADO: <mensaje>. El caso "manipulado" DEBE salir RECHAZADO.
\set QUIET on
BEGIN;
SELECT set_config('hotfix.simple_product_id', :'simple_product_id', true),
       set_config('hotfix.extra_product_id', :'extra_product_id', true),
       set_config('hotfix.extra_id', :'extra_id', true),
       set_config('hotfix.variant_product_id', :'variant_product_id', true),
       set_config('hotfix.bowl_size', :'bowl_size', true),
       set_config('hotfix.bowl_ingredient_ids', :'bowl_ingredient_ids', true),
       set_config('hotfix.promo_id', :'promo_id', true) \gset

CREATE FUNCTION pg_temp.try_order(label text, items jsonb, total integer) RETURNS text
LANGUAGE plpgsql AS $f$
DECLARE r text;
BEGIN
  r := public.create_order_with_items('Cliente Prueba', '3001234567', 'pickup', NULL, NULL, 0,
                                      'HOTFIX verify', total, items);
  RETURN format('%-22s OK (order %s, total %s)', label, r, total);
EXCEPTION WHEN OTHERS THEN
  RETURN format('%-22s RECHAZADO: %s', label, SQLERRM);
END $f$;

CREATE FUNCTION pg_temp.price(pid text) RETURNS integer LANGUAGE sql AS
$f$ SELECT price_cents FROM public.products WHERE id::text = pid $f$;

-- Payloads idénticos a los que arma CheckoutPage.tsx de 98bd908 (precios de catálogo del cliente).
WITH c AS (
  SELECT current_setting('hotfix.simple_product_id') sp,
         current_setting('hotfix.extra_product_id') xp,
         current_setting('hotfix.extra_id') xi,
         current_setting('hotfix.variant_product_id') vp,
         current_setting('hotfix.bowl_size') bs,
         string_to_array(current_setting('hotfix.bowl_ingredient_ids'), ',') bi,
         current_setting('hotfix.promo_id') pr
), v AS (
  SELECT c.*,
    pg_temp.price(sp) sp_price,
    pg_temp.price(xp) + 2 * (SELECT extra_price_cents FROM public.product_default_ingredients WHERE id::text = xi) xp_price,
    (SELECT ingredient_name FROM public.product_default_ingredients WHERE id::text = xi) xi_name,
    (SELECT extra_price_cents FROM public.product_default_ingredients WHERE id::text = xi) xi_price,
    pg_temp.price(vp) vp_price,
    ((SELECT price_cents FROM public.bowl_rules WHERE size = bs)
      + (SELECT COALESCE(sum(i.price_cents),0) FROM unnest(bi) u JOIN public.ingredients i ON i.id = u)
      + 5000 + 500)::integer bowl_price,  -- + proteína extra sintética (5000) + complemento extra sintético (500)
    (SELECT price_cents FROM public.promotions WHERE id::text = pr) pr_price
  FROM c
)
SELECT x FROM v, LATERAL (VALUES
  (pg_temp.try_order('1 producto simple',
     jsonb_build_array(jsonb_build_object('brand_id','ohana','name','Simple','quantity',1,'unit_price_cents',sp_price,
       'details', jsonb_build_object('product_id',sp,'customizations',NULL))), sp_price)),
  (pg_temp.try_order('2 producto + extras',
     jsonb_build_array(jsonb_build_object('brand_id','ohana','name','Con extras','quantity',1,'unit_price_cents',xp_price,
       'details', jsonb_build_object('product_id',xp,'customizations', jsonb_build_object(
         'removedIngredients','[]'::jsonb,'note','','extraTotal',2*xi_price,
         'extras', jsonb_build_array(jsonb_build_object('id',xi,'name',xi_name,'price',xi_price),
                                     jsonb_build_object('id',xi,'name',xi_name,'price',xi_price)))))), xp_price)),
  (pg_temp.try_order('3 producto c/variantes',
     jsonb_build_array(jsonb_build_object('brand_id','ohana','name','Con variantes','quantity',1,'unit_price_cents',vp_price,
       'details', jsonb_build_object('product_id',vp,'customizations',NULL))), vp_price)),
  (pg_temp.try_order('4a bowl (98bd908)',
     jsonb_build_array(jsonb_build_object('brand_id','ohana','name','Bowl Personalizado','quantity',1,'unit_price_cents',bowl_price,
       'details', jsonb_build_object('size','Mediano','bases','["x"]'::jsonb))), bowl_price)),
  (pg_temp.try_order('4b bowl (hotfix)',
     jsonb_build_array(jsonb_build_object('brand_id','ohana','name','Bowl Personalizado','quantity',1,'unit_price_cents',bowl_price,
       'details', jsonb_build_object('size','Mediano','validation', jsonb_build_object('size',bs,'ingredient_ids',to_jsonb(bi),
         'extras', jsonb_build_array(jsonb_build_object('name','Proteína extra','charge',5000),
                                     jsonb_build_object('name','Complemento extra','charge',500)))))), bowl_price)),
  (pg_temp.try_order('5 promo combo',
     jsonb_build_array(jsonb_build_object('brand_id','ohana','name','Combo','quantity',1,'unit_price_cents',pr_price,
       'details', jsonb_build_object('product_id','promo-'||pr,'customizations',NULL))), pr_price)),
  (pg_temp.try_order('6 precio manipulado',
     jsonb_build_array(jsonb_build_object('brand_id','ohana','name','Simple','quantity',1,'unit_price_cents',sp_price-1000,
       'details', jsonb_build_object('product_id',sp,'customizations',NULL))), sp_price-1000)),
  (pg_temp.try_order('7 extra manipulado',
     jsonb_build_array(jsonb_build_object('brand_id','ohana','name','Con extras','quantity',1,'unit_price_cents',pg_temp.price(xp)+1,
       'details', jsonb_build_object('product_id',xp,'customizations', jsonb_build_object(
         'extras', jsonb_build_array(jsonb_build_object('id',xi,'name',xi_name,'price',1)))))), pg_temp.price(xp)+1)),
  (pg_temp.try_order('8 extra de otro prod',
     jsonb_build_array(jsonb_build_object('brand_id','ohana','name','Simple','quantity',1,'unit_price_cents',sp_price+xi_price,
       'details', jsonb_build_object('product_id',sp,'customizations', jsonb_build_object(
         'extras', jsonb_build_array(jsonb_build_object('id',xi,'name',xi_name,'price',xi_price)))))), sp_price+xi_price))
) AS t(x);
ROLLBACK;
