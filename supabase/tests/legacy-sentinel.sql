INSERT INTO public.orders(id,customer_name,phone,order_type,total_cents,notes)
VALUES('00000000-0000-0000-0000-000000000099','Legacy sentinel','3001234567','pickup',12345,'historical snapshot');
INSERT INTO public.order_items(order_id,name,quantity,unit_price_cents,details)
VALUES('00000000-0000-0000-0000-000000000099','Historical product',1,12345,'{"recipe":["Historical ingredient"]}');
