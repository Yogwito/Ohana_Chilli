\set ON_ERROR_STOP on
BEGIN;
INSERT INTO auth.users(id) VALUES('00000000-0000-0000-0000-000000009100');
INSERT INTO user_roles(user_id,role) VALUES('00000000-0000-0000-0000-000000009100','admin');
INSERT INTO orders(id,customer_name,phone,order_type,total_cents,payment_method,payment_state,actionable_at)
VALUES('00000000-0000-0000-0000-000000009101','Historical pending','3001234567','pickup',12345,'legacy','unknown',NULL);
DO $$ BEGIN
  PERFORM set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000009100',true);
  BEGIN
    PERFORM order_action('00000000-0000-0000-0000-000000009101',0,'accept_legacy','');
    RAISE EXCEPTION 'legacy acceptance allowed without review note';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'invalid_legacy_transition' THEN RAISE; END IF;
  END;
  PERFORM order_action('00000000-0000-0000-0000-000000009101',0,'accept_legacy','Historical receipt reviewed');
  IF NOT EXISTS(SELECT 1 FROM orders WHERE id='00000000-0000-0000-0000-000000009101' AND status='confirmed' AND payment_method='legacy' AND payment_state='unknown' AND actionable_at IS NULL) THEN
    RAISE EXCEPTION 'legacy order payment data changed';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM order_events WHERE order_id='00000000-0000-0000-0000-000000009101' AND kind='accept_legacy' AND actor_id='00000000-0000-0000-0000-000000009100') THEN
    RAISE EXCEPTION 'legacy transition was not audited';
  END IF;
END $$;
ROLLBACK;
