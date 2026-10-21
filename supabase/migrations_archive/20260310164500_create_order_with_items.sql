CREATE OR REPLACE FUNCTION public.create_order_with_items(
  p_customer_name text,
  p_phone text,
  p_order_type text,
  p_address text DEFAULT NULL,
  p_delivery_zone text DEFAULT NULL,
  p_delivery_fee_cents integer DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_total_cents integer DEFAULT 0,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid := gen_random_uuid();
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must include at least one item';
  END IF;

  INSERT INTO public.orders (
    id,
    customer_name,
    phone,
    order_type,
    address,
    delivery_zone,
    delivery_fee_cents,
    notes,
    total_cents,
    status
  )
  VALUES (
    v_order_id,
    p_customer_name,
    p_phone,
    p_order_type,
    p_address,
    p_delivery_zone,
    p_delivery_fee_cents,
    p_notes,
    p_total_cents,
    'pending'
  );

  INSERT INTO public.order_items (
    order_id,
    brand_id,
    name,
    quantity,
    unit_price_cents,
    details
  )
  SELECT
    v_order_id,
    item.brand_id,
    item.name,
    item.quantity,
    item.unit_price_cents,
    COALESCE(item.details, '{}'::jsonb)
  FROM jsonb_to_recordset(p_items) AS item(
    brand_id text,
    name text,
    quantity integer,
    unit_price_cents integer,
    details jsonb
  );

  IF NOT EXISTS (
    SELECT 1
    FROM public.order_items
    WHERE order_id = v_order_id
  ) THEN
    RAISE EXCEPTION 'Order must include at least one persisted item';
  END IF;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_order_with_items(
  text,
  text,
  text,
  text,
  text,
  integer,
  text,
  integer,
  jsonb
) TO anon, authenticated;
