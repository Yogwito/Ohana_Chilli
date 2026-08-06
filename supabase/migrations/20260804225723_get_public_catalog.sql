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
