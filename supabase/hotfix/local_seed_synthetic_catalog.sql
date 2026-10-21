-- SOLO Postgres local: catálogo sintético con las formas de prod para verify_checkout_cases.sql.
INSERT INTO public.brands VALUES ('ohana','Ohana') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id,name,brand_id) VALUES ('wraps','Wraps','ohana') ON CONFLICT DO NOTHING;
INSERT INTO public.products (id,brand_id,category_id,name,price_cents) VALUES
 ('11111111-1111-1111-1111-111111111111','ohana','wraps','Jugo natural',8000),
 ('22222222-2222-2222-2222-222222222222','ohana','wraps','Wrap pollo',22000),
 ('33333333-3333-3333-3333-333333333333','ohana','wraps','Limonada sabores',9000),
 ('44444444-4444-4444-4444-444444444444','ohana','wraps','Smoothie premium',12000);
INSERT INTO public.product_default_ingredients (id,product_id,ingredient_name,is_extra,extra_price_cents) VALUES
 ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa','22222222-2222-2222-2222-222222222222','Queso extra',true,3000),
 ('aaaaaaaa-aaaa-aaaa-aaaa-bbbbbbbbbbbb','22222222-2222-2222-2222-222222222222','Lechuga',false,0);
INSERT INTO public.product_variants (product_id,name,price_delta_cents) VALUES
 ('33333333-3333-3333-3333-333333333333','Mango',0),
 ('33333333-3333-3333-3333-333333333333','Maracuyá',2000),
 ('44444444-4444-4444-4444-444444444444','Fresa',1000),
 ('44444444-4444-4444-4444-444444444444','Mora',1500);
INSERT INTO public.bowl_rules (size,name,price_cents,bases,proteins,accompaniments) VALUES
 ('small','Pequeño',22000,1,1,3),('medium','Mediano',28000,1,2,3),('large','Grande',34000,2,2,4);
INSERT INTO public.ingredients (id,name,type,price_cents) VALUES
 ('arroz','Arroz','base',0),('pollo','Pollo','protein',0),('salmon','Salmón','protein',6000),
 ('mango','Mango','acompanante',0),('aguacate-adicional','Aguacate adicional','acompanante',0);
INSERT INTO public.promotions (id,title,discount_type,type,price_cents,is_active) VALUES
 ('55555555-5555-5555-5555-555555555555','Combo pareja','label','combo',40000,true);
