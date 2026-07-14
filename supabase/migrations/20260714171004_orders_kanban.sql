-- Kanban operativo de pedidos y seguimiento público seguro.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS public_tracking_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS preparation_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS ready_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS estimated_ready_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS orders_public_tracking_token_key
  ON public.orders (public_tracking_token);

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('cash', 'transfer'));

-- La política histórica exponía nombres, teléfonos y direcciones a anon.
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order_items" ON public.order_items;
REVOKE INSERT ON public.orders FROM anon, authenticated;
REVOKE INSERT ON public.order_items FROM anon, authenticated;

DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')))
WITH CHECK ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

CREATE TABLE IF NOT EXISTS public.order_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status text,
  to_status text NOT NULL,
  changed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS order_status_history_order_created_idx
  ON public.order_status_history (order_id, created_at DESC);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.order_status_history TO authenticated;

CREATE POLICY "Admins can read order history"
ON public.order_status_history FOR SELECT TO authenticated
USING ((SELECT public.has_role((SELECT auth.uid()), 'admin')));

CREATE OR REPLACE FUNCTION public.audit_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'confirmed' AND NEW.accepted_at IS NULL THEN
      NEW.accepted_at := now();
    ELSIF NEW.status = 'preparing' AND NEW.preparation_started_at IS NULL THEN
      NEW.preparation_started_at := now();
    ELSIF NEW.status = 'ready' AND NEW.ready_at IS NULL THEN
      NEW.ready_at := now();
    ELSIF NEW.status = 'delivered' AND NEW.delivered_at IS NULL THEN
      NEW.delivered_at := now();
    ELSIF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_order_status_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS set_order_status_timestamps ON public.orders;
CREATE TRIGGER set_order_status_timestamps
BEFORE INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.audit_order_status_change();

CREATE OR REPLACE FUNCTION public.log_order_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.order_status_history (order_id, from_status, to_status, changed_by, note)
    VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
      NEW.status,
      (SELECT auth.uid()),
      CASE WHEN NEW.status = 'cancelled' THEN NEW.cancellation_reason ELSE NULL END
    );
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.log_order_status_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS log_order_status_change ON public.orders;
CREATE TRIGGER log_order_status_change
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.log_order_status_change();

CREATE OR REPLACE FUNCTION public.create_order_with_items_v2(
  p_customer_name text,
  p_phone text,
  p_order_type text,
  p_address text DEFAULT NULL,
  p_delivery_zone text DEFAULT NULL,
  p_delivery_fee_cents integer DEFAULT 0,
  p_notes text DEFAULT NULL,
  p_total_cents integer DEFAULT 0,
  p_items jsonb DEFAULT '[]'::jsonb,
  p_payment_method text DEFAULT 'cash'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_order_id uuid := gen_random_uuid();
  v_tracking_token uuid := gen_random_uuid();
  v_items_total integer := 0;
  v_canonical_fee integer := 0;
BEGIN
  IF p_customer_name IS NULL OR length(btrim(p_customer_name)) < 2 THEN
    RAISE EXCEPTION 'Nombre inválido';
  END IF;
  IF p_phone IS NULL OR length(regexp_replace(p_phone, '\D', '', 'g')) < 7 THEN
    RAISE EXCEPTION 'Teléfono inválido';
  END IF;
  IF p_order_type NOT IN ('pickup', 'delivery') THEN
    RAISE EXCEPTION 'Tipo de pedido inválido';
  END IF;
  IF p_order_type = 'delivery' AND length(btrim(COALESCE(p_address, ''))) < 5 THEN
    RAISE EXCEPTION 'Dirección inválida';
  END IF;
  IF p_total_cents < 0 OR p_delivery_fee_cents < 0 THEN
    RAISE EXCEPTION 'Valor de pedido inválido';
  END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'El pedido debe incluir al menos un producto';
  END IF;
  IF p_payment_method NOT IN ('cash', 'transfer') THEN
    RAISE EXCEPTION 'Método de pago inválido';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(p_items) AS checked(quantity integer, unit_price_cents integer)
    WHERE checked.quantity < 1 OR checked.quantity > 50 OR checked.unit_price_cents < 0
  ) THEN
    RAISE EXCEPTION 'Producto inválido';
  END IF;

  SELECT COALESCE(sum(checked.quantity * checked.unit_price_cents), 0)::integer
  INTO v_items_total
  FROM jsonb_to_recordset(p_items) AS checked(quantity integer, unit_price_cents integer);

  IF p_order_type = 'delivery' THEN
    SELECT fee_cents INTO v_canonical_fee
    FROM public.delivery_zones
    WHERE is_active AND lower(btrim(name)) = lower(btrim(COALESCE(p_delivery_zone, '')))
    LIMIT 1;
    IF NOT FOUND OR v_canonical_fee <> p_delivery_fee_cents THEN
      RAISE EXCEPTION 'La zona o tarifa de domicilio cambió';
    END IF;
  ELSIF p_delivery_fee_cents <> 0 THEN
    RAISE EXCEPTION 'Un pedido para recoger no tiene domicilio';
  END IF;

  IF p_total_cents <> v_items_total + v_canonical_fee THEN
    RAISE EXCEPTION 'El total del pedido no coincide';
  END IF;

  INSERT INTO public.orders (
    id, public_tracking_token, customer_name, phone, order_type, address,
    delivery_zone, delivery_fee_cents, notes, total_cents, status, payment_method
  ) VALUES (
    v_order_id, v_tracking_token, btrim(p_customer_name), btrim(p_phone), p_order_type,
    p_address, p_delivery_zone, p_delivery_fee_cents, p_notes, p_total_cents,
    'pending', p_payment_method
  );

  INSERT INTO public.order_items (order_id, brand_id, name, quantity, unit_price_cents, details)
  SELECT
    v_order_id, item.brand_id, item.name, item.quantity, item.unit_price_cents,
    COALESCE(item.details, '{}'::jsonb)
  FROM jsonb_to_recordset(p_items) AS item(
    brand_id text, name text, quantity integer, unit_price_cents integer, details jsonb
  );

  RETURN jsonb_build_object('order_id', v_order_id, 'tracking_token', v_tracking_token);
END;
$$;

REVOKE ALL ON FUNCTION public.create_order_with_items_v2(
  text, text, text, text, text, integer, text, integer, jsonb, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_order_with_items_v2(
  text, text, text, text, text, integer, text, integer, jsonb, text
) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_order_status(p_tracking_token uuid)
RETURNS TABLE (
  id uuid,
  status text,
  order_type text,
  created_at timestamptz,
  accepted_at timestamptz,
  preparation_started_at timestamptz,
  ready_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  estimated_ready_at timestamptz,
  cancellation_reason text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT o.id, o.status, o.order_type, o.created_at, o.accepted_at,
         o.preparation_started_at, o.ready_at, o.delivered_at, o.cancelled_at,
         o.estimated_ready_at, o.cancellation_reason
  FROM public.orders o
  WHERE o.public_tracking_token = p_tracking_token
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.get_public_order_status(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_order_status(uuid) TO anon, authenticated;

REVOKE UPDATE ON public.orders FROM authenticated;

CREATE OR REPLACE FUNCTION public.transition_order_status(
  p_order_id uuid,
  p_new_status text,
  p_cancellation_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_current_status text;
  v_updated public.orders%ROWTYPE;
BEGIN
  IF (SELECT auth.uid()) IS NULL
     OR NOT public.has_role((SELECT auth.uid()), 'admin') THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT status INTO v_current_status
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'Pedido no encontrado'; END IF;

  IF NOT (
    (v_current_status = 'pending' AND p_new_status = 'confirmed') OR
    (v_current_status = 'confirmed' AND p_new_status = 'preparing') OR
    (v_current_status = 'preparing' AND p_new_status = 'ready') OR
    (v_current_status = 'ready' AND p_new_status = 'delivered') OR
    (v_current_status IN ('pending', 'confirmed', 'preparing', 'ready') AND p_new_status = 'cancelled')
  ) THEN
    RAISE EXCEPTION 'Transición inválida: % → %', v_current_status, p_new_status;
  END IF;

  IF p_new_status = 'cancelled' AND length(btrim(COALESCE(p_cancellation_reason, ''))) < 3 THEN
    RAISE EXCEPTION 'Indica un motivo de cancelación';
  END IF;

  UPDATE public.orders
  SET status = p_new_status,
      cancellation_reason = CASE WHEN p_new_status = 'cancelled' THEN btrim(p_cancellation_reason) ELSE cancellation_reason END,
      estimated_ready_at = CASE
        WHEN p_new_status = 'confirmed' AND estimated_ready_at IS NULL THEN now() + interval '20 minutes'
        ELSE estimated_ready_at
      END
  WHERE id = p_order_id
  RETURNING * INTO v_updated;

  RETURN jsonb_build_object(
    'id', v_updated.id,
    'status', v_updated.status,
    'estimated_ready_at', v_updated.estimated_ready_at,
    'cancellation_reason', v_updated.cancellation_reason
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transition_order_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transition_order_status(uuid, text, text) TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
