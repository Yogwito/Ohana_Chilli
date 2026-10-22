-- The catalog function is SECURITY INVOKER: expose only active flavor rows and the two public schedule keys.
BEGIN;
DO $$
DECLARE n integer; secured boolean;
BEGIN
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
  WHERE ns.nspname='public' AND p.proname='get_public_catalog';
  SELECT relrowsecurity INTO secured FROM pg_class WHERE oid='public.product_variants'::regclass;
  IF n <> 1 OR NOT secured THEN
    RAISE EXCEPTION 'ALTO: catálogo único o RLS de product_variants no verificado';
  END IF;
END $$;
GRANT SELECT ON public.product_variants TO anon, authenticated;
DROP POLICY IF EXISTS "Public read active product variants" ON public.product_variants;
CREATE POLICY "Public read active product variants" ON public.product_variants FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "Public read weekly business hours" ON public.settings;
CREATE POLICY "Public read weekly business hours" ON public.settings FOR SELECT TO anon, authenticated USING (key IN ('business_hours_weekly','business_hours_enforce'));

-- Additive JSON key; deployed frontend ignores unknown keys.
create or replace function public.get_public_catalog()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'products', coalesce(
      (
        select jsonb_agg(to_jsonb(product_row) order by product_row.name)
        from public.products as product_row
        where product_row.is_active = true
      ),
      '[]'::jsonb
    ),
    'product_variants', coalesce(
      (
        select jsonb_agg(jsonb_build_object(
          'id', variant_row.id,
          'product_id', variant_row.product_id,
          'name', variant_row.name,
          'price_delta_cents', variant_row.price_delta_cents
        ) order by variant_row.name)
        from public.product_variants as variant_row
        join public.products as product_row on product_row.id = variant_row.product_id
        where variant_row.is_active = true and product_row.is_active = true
      ), '[]'::jsonb
    ),
    'categories', coalesce(
      (
        select jsonb_agg(
          to_jsonb(category_row)
          order by category_row.sort_order nulls last, category_row.name
        )
        from public.categories as category_row
      ),
      '[]'::jsonb
    ),
    'ingredients', coalesce(
      (
        select jsonb_agg(to_jsonb(ingredient_row) order by ingredient_row.name)
        from public.ingredients as ingredient_row
        where ingredient_row.is_active = true
      ),
      '[]'::jsonb
    ),
    'bowl_rules', coalesce(
      (
        select jsonb_agg(to_jsonb(rule_row) order by rule_row.price_cents)
        from public.bowl_rules as rule_row
      ),
      '[]'::jsonb
    ),
    'promotions', coalesce(
      (
        select jsonb_agg(to_jsonb(promotion_row) order by promotion_row.sort_order)
        from public.promotions as promotion_row
        where promotion_row.is_active = true
      ),
      '[]'::jsonb
    ),
    'settings', coalesce(
      (
        select jsonb_agg(to_jsonb(setting_row) order by setting_row.key)
        from public.settings as setting_row
      ),
      '[]'::jsonb
    )
  );
$$;

revoke all on function public.get_public_catalog() from public;
grant execute on function public.get_public_catalog() to anon, authenticated;

COMMIT;
