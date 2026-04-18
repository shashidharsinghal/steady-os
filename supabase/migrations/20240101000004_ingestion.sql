CREATE TYPE public.ingestion_status AS ENUM (
  'uploaded',
  'parsing',
  'preview_ready',
  'committing',
  'committed',
  'rolled_back',
  'failed'
);

CREATE TYPE public.detection_method AS ENUM (
  'filename_pattern',
  'header_inspection',
  'content_llm',
  'user_override'
);

CREATE TABLE public.ingestion_runs (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  outlet_id             uuid        REFERENCES public.outlets(id),
  uploaded_by           uuid        NOT NULL REFERENCES auth.users(id),
  uploaded_at           timestamptz NOT NULL DEFAULT now(),

  -- Classification
  source_type           text        NOT NULL,
  detection_method      public.detection_method NOT NULL,
  detection_confidence  numeric(3,2) CHECK (detection_confidence BETWEEN 0.00 AND 1.00),
  user_confirmed_source boolean     NOT NULL DEFAULT false,

  -- File
  file_name             text        NOT NULL,
  file_size_bytes       bigint      NOT NULL CHECK (file_size_bytes > 0),
  file_mime_type        text,
  file_storage_path     text        NOT NULL,
  file_sha256           text        NOT NULL,

  -- Lifecycle
  status                public.ingestion_status NOT NULL DEFAULT 'uploaded',
  parsing_started_at    timestamptz,
  parsing_completed_at  timestamptz,
  committing_started_at timestamptz,
  committed_at          timestamptz,
  rolled_back_at        timestamptz,
  failed_at             timestamptz,

  -- Counts (null = not yet known at this stage)
  rows_seen             int,
  rows_parsed           int,
  rows_to_insert        int,
  rows_duplicate        int,
  rows_errored          int,

  -- Payloads
  preview_payload       jsonb,
  error_details         jsonb,

  -- Audit
  committed_by          uuid        REFERENCES auth.users(id),
  rolled_back_by        uuid        REFERENCES auth.users(id),
  rollback_reason       text,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingestion_runs_outlet_time
  ON public.ingestion_runs (outlet_id, uploaded_at DESC);

CREATE INDEX idx_ingestion_runs_user_time
  ON public.ingestion_runs (uploaded_by, uploaded_at DESC);

CREATE INDEX idx_ingestion_runs_status
  ON public.ingestion_runs (status)
  WHERE status IN ('uploaded', 'parsing', 'preview_ready');

-- Prevent the same file content from being committed twice per outlet
CREATE UNIQUE INDEX idx_ingestion_runs_file_hash
  ON public.ingestion_runs (outlet_id, file_sha256)
  WHERE status = 'committed';

CREATE TRIGGER set_ingestion_runs_updated_at
  BEFORE UPDATE ON public.ingestion_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ingestion_runs ENABLE ROW LEVEL SECURITY;

-- Partners see all runs; uploaders see their own
CREATE POLICY "ingestion_runs_select"
  ON public.ingestion_runs FOR SELECT
  USING (
    public.is_partner(auth.uid())
    OR uploaded_by = auth.uid()
  );

CREATE POLICY "ingestion_runs_insert"
  ON public.ingestion_runs FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "ingestion_runs_update"
  ON public.ingestion_runs FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

-- No DELETE — use rollback status instead

-- ─── Row-level errors ────────────────────────────────────────────────────────

CREATE TABLE public.ingestion_row_errors (
  id            uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id        uuid  NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE CASCADE,
  row_number    int   NOT NULL,
  error_code    text  NOT NULL,
  error_message text  NOT NULL,
  field_name    text,
  raw_value     text  CHECK (length(raw_value) <= 500),
  raw_row       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingestion_row_errors_run
  ON public.ingestion_row_errors (run_id, row_number);

ALTER TABLE public.ingestion_row_errors ENABLE ROW LEVEL SECURITY;

-- Inherits access from parent run
CREATE POLICY "ingestion_row_errors_select"
  ON public.ingestion_row_errors FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.ingestion_runs r
      WHERE r.id = ingestion_row_errors.run_id
        AND (public.is_partner(auth.uid()) OR r.uploaded_by = auth.uid())
    )
  );

-- Writes only from service role (server actions) — no direct client insert
CREATE POLICY "ingestion_row_errors_insert"
  ON public.ingestion_row_errors FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

-- ─── Storage bucket ───────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('ingestion-uploads', 'ingestion-uploads', false)
ON CONFLICT (id) DO NOTHING;

-- Partners and uploaders can read raw files (via signed URLs only)
CREATE POLICY "ingestion_uploads_storage_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ingestion-uploads'
    AND auth.role() = 'authenticated'
    AND public.is_partner(auth.uid())
  );

-- Only partners can upload (enforced in server action; this is the DB gate)
CREATE POLICY "ingestion_uploads_storage_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ingestion-uploads'
    AND public.is_partner(auth.uid())
  );

CREATE POLICY "ingestion_uploads_storage_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'ingestion-uploads'
    AND public.is_partner(auth.uid())
  );
