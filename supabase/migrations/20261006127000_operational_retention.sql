-- Bounded retention for high-volume, non-financial operational records.
-- This is deliberately a service-role operation: do not grant browser roles a
-- deletion path and do not assume pg_cron is available in every Supabase tier.
CREATE INDEX IF NOT EXISTS order_rate_limits_window_start_idx
  ON public.order_rate_limits(window_start);

CREATE OR REPLACE FUNCTION public.prune_operational_retention()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_analytics_deleted integer;
  v_rate_limits_deleted integer;
BEGIN
  -- Product analytics has no financial or order-authority role. Ninety days
  -- preserves current operational reporting while bounding table growth.
  DELETE FROM public.analytics_events
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS v_analytics_deleted = ROW_COUNT;

  -- A rate-limit window lasts ten minutes. One day is sufficient for abuse
  -- investigation and makes a forged-key flood unable to grow indefinitely.
  DELETE FROM public.order_rate_limits
  WHERE window_start < now() - interval '24 hours';
  GET DIAGNOSTICS v_rate_limits_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'analytics_events_deleted', v_analytics_deleted,
    'order_rate_limits_deleted', v_rate_limits_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.prune_operational_retention() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prune_operational_retention() TO service_role;
