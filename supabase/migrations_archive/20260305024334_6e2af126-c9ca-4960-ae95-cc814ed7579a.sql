-- Harden guest checkout RLS policies while keeping public insert allowed
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO public
WITH CHECK (
  customer_name IS NOT NULL
  AND length(btrim(customer_name)) >= 2
  AND phone IS NOT NULL
  AND length(btrim(phone)) >= 7
  AND order_type IN ('pickup', 'delivery')
  AND total_cents >= 0
  AND delivery_fee_cents >= 0
  AND (
    order_type = 'pickup'
    OR (
      address IS NOT NULL
      AND length(btrim(address)) >= 5
    )
  )
);

DROP POLICY IF EXISTS "Anyone can create order_items" ON public.order_items;
CREATE POLICY "Anyone can create order_items"
ON public.order_items
FOR INSERT
TO public
WITH CHECK (
  order_id IS NOT NULL
  AND name IS NOT NULL
  AND length(btrim(name)) >= 1
  AND quantity > 0
  AND unit_price_cents >= 0
);