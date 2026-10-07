DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.orders WHERE id='00000000-0000-0000-0000-000000000099' AND total_cents=12345 AND notes='historical snapshot' AND payment_state='unknown' AND payment_method='legacy' AND actionable_at IS NULL)
 OR NOT EXISTS(SELECT 1 FROM public.order_items WHERE order_id='00000000-0000-0000-0000-000000000099' AND details='{"recipe":["Historical ingredient"]}') THEN RAISE EXCEPTION 'Historical data changed at cutover'; END IF;
END $$;
DELETE FROM public.order_items WHERE order_id='00000000-0000-0000-0000-000000000099';
DELETE FROM public.orders WHERE id='00000000-0000-0000-0000-000000000099';
