
-- Lightweight analytics events table
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast queries by event type and time
CREATE INDEX idx_analytics_events_type_time ON public.analytics_events (event_type, created_at DESC);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert events (anonymous tracking)
CREATE POLICY "Anyone can insert analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (
    event_type IS NOT NULL AND length(trim(event_type)) >= 1
  );

-- Only admins can read analytics
CREATE POLICY "Admins can read analytics"
  ON public.analytics_events FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete old events
CREATE POLICY "Admins can delete analytics"
  ON public.analytics_events FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::app_role));
