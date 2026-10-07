-- Historical orders retain unknown payment state. An administrator may explicitly
-- take responsibility for a pending legacy order without inferring a payment.
CREATE OR REPLACE FUNCTION public.order_action(p_id uuid,p_version integer,p_action text,p_note text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o orders%ROWTYPE; next_status text; BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO o FROM orders WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF o.version<>p_version THEN RAISE EXCEPTION 'version_conflict'; END IF;
  IF length(p_note)>1000 THEN RAISE EXCEPTION 'invalid_note'; END IF;
  IF p_action IN ('accept','prepare','ready','complete') AND o.payment_method='online' AND o.payment_state<>'paid' THEN RAISE EXCEPTION 'not_actionable'; END IF;
  next_status := o.status;
  CASE p_action
    WHEN 'acknowledge_financial' THEN
      IF o.financial_attention_at IS NULL OR o.financial_resolved_at IS NOT NULL OR o.financial_acknowledged_at IS NOT NULL THEN RAISE EXCEPTION 'invalid_financial_attention'; END IF;
    WHEN 'resolve_financial' THEN
      IF o.financial_attention_at IS NULL OR o.financial_resolved_at IS NOT NULL OR o.payment_method='online' OR length(trim(p_note))<3 THEN RAISE EXCEPTION 'invalid_financial_resolution'; END IF;
    WHEN 'acknowledge' THEN
      IF o.actionable_at IS NULL OR o.status<>'pending' THEN RAISE EXCEPTION 'not_actionable'; END IF;
    WHEN 'accept_legacy' THEN
      IF o.status<>'pending' OR o.payment_method<>'legacy' OR o.payment_state<>'unknown' OR o.actionable_at IS NOT NULL OR length(trim(p_note))<3 THEN RAISE EXCEPTION 'invalid_legacy_transition'; END IF;
      next_status := 'confirmed';
    WHEN 'accept' THEN
      IF o.status<>'pending' OR o.actionable_at IS NULL OR (o.payment_method='online' AND o.payment_state<>'paid') THEN RAISE EXCEPTION 'not_actionable'; END IF;
      next_status := 'confirmed';
    WHEN 'prepare' THEN IF o.status<>'confirmed' THEN RAISE EXCEPTION 'invalid_transition'; END IF; next_status := 'preparing';
    WHEN 'ready' THEN IF o.status<>'preparing' THEN RAISE EXCEPTION 'invalid_transition'; END IF; next_status := 'ready';
    WHEN 'complete' THEN IF o.status<>'ready' THEN RAISE EXCEPTION 'invalid_transition'; END IF; next_status := 'delivered';
    WHEN 'cancel' THEN IF o.status IN ('cancelled','delivered') OR length(trim(p_note))<3 THEN RAISE EXCEPTION 'invalid_transition_or_reason'; END IF; next_status := 'cancelled';
    WHEN 'record_payment' THEN
      IF o.payment_method NOT IN ('cash','transfer') OR o.payment_state NOT IN ('unpaid','unverified') OR length(trim(p_note))<3 THEN RAISE EXCEPTION 'invalid_payment_confirmation'; END IF;
      UPDATE orders SET payment_state='paid' WHERE id=p_id;
    WHEN 'resolve' THEN IF o.status IN ('cancelled','delivered') OR length(trim(p_note))<3 THEN RAISE EXCEPTION 'invalid_resolution'; END IF;
    ELSE RAISE EXCEPTION 'invalid_action';
  END CASE;
  UPDATE orders SET status=next_status, version=version+1,
    financial_acknowledged_at=CASE WHEN p_action IN ('acknowledge_financial','resolve_financial') THEN coalesce(financial_acknowledged_at,now()) ELSE financial_acknowledged_at END,
    financial_resolved_at=CASE WHEN p_action='resolve_financial' THEN now() ELSE financial_resolved_at END,
    acknowledged_at=CASE WHEN p_action IN ('acknowledge','accept','accept_legacy','cancel') THEN coalesce(acknowledged_at,now()) ELSE acknowledged_at END
    WHERE id=p_id;
  INSERT INTO order_events(order_id,actor_id,kind,data) VALUES(p_id,auth.uid(),p_action,jsonb_build_object('note',p_note,'from',o.status,'to',next_status));
  RETURN jsonb_build_object('version',o.version+1,'status',next_status);
END $$;

REVOKE ALL ON FUNCTION public.order_action(uuid,integer,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.order_action(uuid,integer,text,text) TO authenticated,service_role;
