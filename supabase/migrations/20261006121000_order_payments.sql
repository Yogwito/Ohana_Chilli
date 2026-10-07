CREATE FUNCTION public.order_payment_start(p_hash text,p_environment text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o orders%ROWTYPE; a payment_attempts%ROWTYPE; BEGIN
  SELECT * INTO o FROM orders WHERE tracking_hash=p_hash AND tracking_expires_at>now() FOR UPDATE;
  IF NOT FOUND OR o.payment_method<>'online' OR o.status<>'pending' OR o.payment_state IN ('paid','refunded') THEN RAISE EXCEPTION 'payment_not_available'; END IF;
  SELECT * INTO a FROM payment_attempts WHERE order_id=o.id AND state='pending';
  IF NOT FOUND THEN
    INSERT INTO payment_attempts(order_id,reference,environment,amount_cop)
      VALUES(o.id,'ohana-'||gen_random_uuid()::text,p_environment,o.total_cents) RETURNING * INTO a;
    UPDATE orders SET payment_state='pending',version=version+1 WHERE id=o.id;
    INSERT INTO order_events(order_id,kind) VALUES(o.id,'payment_started');
  END IF;
  IF a.environment<>p_environment THEN RAISE EXCEPTION 'environment_mismatch'; END IF;
  -- Do not create a second attempt on timeouts; reconciliation must prove a terminal outcome.
  RETURN to_jsonb(a);
END $$;

CREATE FUNCTION public.order_payment_apply(p_reference text,p_provider_id text,p_amount bigint,p_currency text,p_environment text,p_status text,p_event_key text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a payment_attempts%ROWTYPE; o orders%ROWTYPE; mapped text; BEGIN
  SELECT * INTO a FROM payment_attempts WHERE reference=p_reference;
  IF NOT FOUND THEN RAISE EXCEPTION 'payment_reference_mismatch'; END IF;
  SELECT * INTO o FROM orders WHERE id=a.order_id FOR UPDATE;
  SELECT * INTO a FROM payment_attempts WHERE id=a.id FOR UPDATE;
  IF a.amount_cop::bigint*100 IS DISTINCT FROM p_amount OR p_currency IS DISTINCT FROM 'COP' OR a.environment IS DISTINCT FROM p_environment
    OR p_provider_id IS NULL OR (a.provider_id IS NOT NULL AND a.provider_id<>p_provider_id) THEN RAISE EXCEPTION 'payment_mismatch'; END IF;
  IF p_status NOT IN ('APPROVED','PENDING','DECLINED','ERROR','VOIDED') OR p_status IS NULL THEN RAISE EXCEPTION 'invalid_provider_status'; END IF;
  INSERT INTO order_provider_events(key) VALUES(p_event_key) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  mapped := CASE WHEN p_status='APPROVED' THEN 'paid' WHEN p_status='PENDING' THEN 'pending' ELSE 'rejected' END;
  -- Terminal states cannot be downgraded by delayed events. Unexpected conflicts need operator review.
  IF a.state<>'pending' AND a.state<>mapped THEN
    IF mapped='pending' THEN RETURN; END IF;
    RAISE EXCEPTION 'payment_terminal_conflict';
  END IF;
  UPDATE payment_attempts SET provider_id=p_provider_id,provider_status=p_status,state=mapped,checked_at=now() WHERE id=a.id;
  IF a.state<>mapped THEN
    UPDATE orders SET payment_state=mapped,version=version+1,
      actionable_at=CASE WHEN mapped='paid' AND status='pending' THEN now() ELSE actionable_at END WHERE id=o.id;
    INSERT INTO order_events(order_id,kind,data) VALUES(o.id,'payment_'||mapped,jsonb_build_object('attempt_id',a.id));
  END IF;
END $$;

CREATE FUNCTION public.order_refund_request(p_id uuid,p_version integer,p_reason text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE o orders%ROWTYPE; a payment_attempts%ROWTYPE; r order_refunds%ROWTYPE; BEGIN
  IF NOT has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO o FROM orders WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  SELECT * INTO r FROM order_refunds WHERE order_id=p_id;
  IF FOUND THEN RETURN to_jsonb(r); END IF;
  IF o.version<>p_version THEN RAISE EXCEPTION 'version_conflict'; END IF;
  IF o.payment_method<>'online' OR o.payment_state<>'paid' THEN RAISE EXCEPTION 'not_refundable'; END IF;
  SELECT * INTO a FROM payment_attempts WHERE order_id=p_id AND state='paid';
  IF NOT FOUND OR a.provider_id IS NULL THEN RAISE EXCEPTION 'payment_not_verified'; END IF;
  INSERT INTO order_refunds(order_id,attempt_id,actor_id,amount_cop,reason) VALUES(p_id,a.id,auth.uid(),o.total_cents,trim(p_reason)) RETURNING * INTO r;
  UPDATE orders SET version=version+1 WHERE id=p_id;
  INSERT INTO order_events(order_id,actor_id,kind,data) VALUES(p_id,auth.uid(),'refund_requested',jsonb_build_object('refund_id',r.id,'reason',r.reason));
  RETURN to_jsonb(r);
END $$;

CREATE FUNCTION public.order_refund_claim(p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r order_refunds%ROWTYPE; a payment_attempts%ROWTYPE; BEGIN
  SELECT * INTO r FROM order_refunds WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF r.state<>'requested' THEN RETURN NULL; END IF;
  UPDATE order_refunds SET state='processing',updated_at=now() WHERE id=p_id;
  SELECT * INTO a FROM payment_attempts WHERE id=r.attempt_id;
  INSERT INTO order_events(order_id,kind,data) VALUES(r.order_id,'refund_processing',jsonb_build_object('refund_id',r.id));
  RETURN jsonb_build_object('id',r.id,'order_id',r.order_id,'amount_cop',r.amount_cop,'reason',r.reason,'transaction_id',a.provider_id,'environment',a.environment);
END $$;

CREATE FUNCTION public.order_refund_apply(p_id uuid,p_provider_id text,p_transaction_id text,p_amount bigint,p_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r order_refunds%ROWTYPE; a payment_attempts%ROWTYPE; mapped text; BEGIN
  SELECT * INTO r FROM order_refunds WHERE id=p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  PERFORM 1 FROM orders WHERE id=r.order_id FOR UPDATE;
  SELECT * INTO r FROM order_refunds WHERE id=p_id FOR UPDATE;
  SELECT * INTO a FROM payment_attempts WHERE id=r.attempt_id;
  IF r.amount_cop::bigint*100 IS DISTINCT FROM p_amount OR a.provider_id IS DISTINCT FROM p_transaction_id
    OR (r.provider_id IS NOT NULL AND r.provider_id<>p_provider_id) OR p_provider_id IS NULL THEN RAISE EXCEPTION 'refund_mismatch'; END IF;
  IF p_status NOT IN ('APPROVED','PENDING','DECLINED','ERROR','CANCELLED') OR p_status IS NULL THEN RAISE EXCEPTION 'invalid_refund_status'; END IF;
  mapped := CASE WHEN p_status='APPROVED' THEN 'completed' WHEN p_status='PENDING' THEN 'processing' ELSE 'failed' END;
  IF r.state IN ('completed','failed') THEN RETURN; END IF;
  UPDATE order_refunds SET provider_id=p_provider_id,state=mapped,error_code=CASE WHEN mapped='failed' THEN p_status END,updated_at=now() WHERE id=p_id;
  IF mapped='completed' THEN UPDATE orders SET payment_state='refunded',version=version+1 WHERE id=r.order_id; END IF;
  IF r.state<>mapped THEN INSERT INTO order_events(order_id,kind,data) VALUES(r.order_id,'refund_'||mapped,jsonb_build_object('refund_id',r.id)); END IF;
END $$;
CREATE FUNCTION public.order_refund_issue(p_id uuid,p_code text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r order_refunds%ROWTYPE; BEGIN
 IF p_code NOT IN ('provider_unavailable','refund_method_unavailable','refund_environment_mismatch','refund_mismatch','refund_unresolved','validation_failed') THEN p_code:='refund_unresolved'; END IF;
 SELECT * INTO r FROM order_refunds WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
 UPDATE order_refunds SET error_code=p_code,updated_at=now() WHERE id=p_id;
 INSERT INTO order_events(order_id,kind,data) VALUES(r.order_id,'refund_review_required',jsonb_build_object('refund_id',p_id,'code',p_code));
END $$;

DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('order_payment_start','order_payment_apply','order_refund_request','order_refund_claim','order_refund_apply','order_refund_issue') LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',f.signature);
  END LOOP;
END $$;
GRANT EXECUTE ON FUNCTION public.order_refund_request(uuid,integer,text) TO authenticated;
