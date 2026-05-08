ALTER TABLE public.ingestion_runs
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_archived
  ON public.ingestion_runs (outlet_id, archived_at)
  WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.archived_ingestion_runs AS
  SELECT *
  FROM public.ingestion_runs
  WHERE deleted_at IS NULL
    AND archived_at IS NOT NULL
    AND status <> 'purged';

GRANT SELECT ON public.archived_ingestion_runs TO authenticated;

CREATE TABLE IF NOT EXISTS public.activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id   uuid REFERENCES public.outlets(id),
  user_id     uuid REFERENCES auth.users(id),
  action      text NOT NULL,
  target_type text,
  target_id   uuid,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_outlet_time
  ON public.activity_log (outlet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_user_time
  ON public.activity_log (user_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_log_select_partners" ON public.activity_log;
CREATE POLICY "activity_log_select_partners"
  ON public.activity_log FOR SELECT
  USING (public.is_partner());

DROP POLICY IF EXISTS "activity_log_insert_partners" ON public.activity_log;
CREATE POLICY "activity_log_insert_partners"
  ON public.activity_log FOR INSERT
  WITH CHECK (public.is_partner());
