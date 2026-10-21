-- Synthetic rows shaped like production before 20261006* (no real customer data).
-- Prod facts: payment_method NULL, payment_status 'not_required', status pending/delivered.
INSERT INTO auth.users(id) VALUES('00000000-0000-0000-0000-00000000b001');
INSERT INTO public.user_roles(user_id,role) VALUES('00000000-0000-0000-0000-00000000b001','admin');
INSERT INTO public.brands(id,name) VALUES('ohana','Ohana') ON CONFLICT DO NOTHING;
INSERT INTO public.categories(id,brand_id,name) VALUES('prod-sentinel','ohana','Sentinel');
INSERT INTO public.products(id,brand_id,category_id,name,price_cents) VALUES('00000000-0000-0000-0000-00000000b010','ohana','prod-sentinel','Sentinel bowl',25900);
INSERT INTO public.ingredients(id,name,type,price_cents) VALUES('prod-sentinel-base','Arroz','base',0);
INSERT INTO public.settings(key,value) VALUES('prod_sentinel_private','never-public') ON CONFLICT (key) DO NOTHING;
-- Exactly like prod on 2026-10-20: 22 orders, 18 pending + 4 delivered.
INSERT INTO public.orders(id,customer_name,phone,order_type,total_cents,status,created_at,updated_at)
SELECT ('00000000-0000-0000-0000-00000000b1'||lpad(g::text,2,'0'))::uuid, 'Prod '||g, '3001234567', 'pickup', 25900,
       CASE WHEN g<=18 THEN 'pending' ELSE 'delivered' END,
       timestamptz '2026-09-01 12:00+00' + g*interval '1 day', timestamptz '2026-09-01 13:00+00' + g*interval '1 day'
FROM generate_series(1,22) g;
INSERT INTO public.order_items(order_id,brand_id,name,quantity,unit_price_cents,details)
SELECT id,'ohana','Sentinel bowl',1,25900,'{"product_id":"00000000-0000-0000-0000-00000000b010"}' FROM public.orders WHERE id::text LIKE '00000000-0000-0000-0000-00000000b1%';
DO $$ BEGIN
  IF (SELECT count(*) FROM public.orders)<>22 OR (SELECT count(*) FROM public.orders WHERE status='pending')<>18
     OR EXISTS(SELECT 1 FROM public.orders WHERE payment_method IS NOT NULL OR payment_status<>'not_required') THEN
    RAISE EXCEPTION 'sentinel does not match production shape';
  END IF;
END $$;
