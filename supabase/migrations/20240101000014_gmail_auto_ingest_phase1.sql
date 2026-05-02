CREATE TABLE public.gmail_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  connected_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  gmail_address text NOT NULL,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'active',
  last_sync_at timestamptz,
  last_sync_status text,
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gmail_connections_outlet_unique UNIQUE (outlet_id),
  CONSTRAINT gmail_connections_status_check
    CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  CONSTRAINT gmail_connections_sync_status_check
    CHECK (
      last_sync_status IS NULL
      OR last_sync_status IN ('success', 'partial', 'failed', 'no_emails')
    )
);

CREATE INDEX idx_gmail_connections_status
  ON public.gmail_connections (status, token_expires_at);

CREATE TRIGGER set_gmail_connections_updated_at
  BEFORE UPDATE ON public.gmail_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gmail_connections_select"
  ON public.gmail_connections FOR SELECT
  USING (public.is_partner(auth.uid()));

CREATE POLICY "gmail_connections_insert"
  ON public.gmail_connections FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "gmail_connections_update"
  ON public.gmail_connections FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

CREATE TABLE public.gmail_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES public.gmail_connections(id) ON DELETE CASCADE,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  triggered_by text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  emails_found int NOT NULL DEFAULT 0 CHECK (emails_found >= 0),
  emails_processed int NOT NULL DEFAULT 0 CHECK (emails_processed >= 0),
  emails_skipped int NOT NULL DEFAULT 0 CHECK (emails_skipped >= 0),
  ingestion_run_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
  processed_message_ids text[] NOT NULL DEFAULT ARRAY[]::text[],
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gmail_sync_runs_triggered_by_check
    CHECK (triggered_by IN ('cron_primary', 'cron_retry', 'manual', 'backfill')),
  CONSTRAINT gmail_sync_runs_status_check
    CHECK (status IN ('running', 'success', 'partial', 'failed', 'no_emails'))
);

CREATE INDEX idx_gmail_sync_runs_outlet
  ON public.gmail_sync_runs (outlet_id, started_at DESC);

CREATE INDEX idx_gmail_sync_runs_connection
  ON public.gmail_sync_runs (connection_id, started_at DESC);

ALTER TABLE public.gmail_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gmail_sync_runs_select"
  ON public.gmail_sync_runs FOR SELECT
  USING (public.is_partner(auth.uid()));

CREATE POLICY "gmail_sync_runs_insert"
  ON public.gmail_sync_runs FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "gmail_sync_runs_update"
  ON public.gmail_sync_runs FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

CREATE TABLE public.gmail_processed_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  connection_id uuid NOT NULL REFERENCES public.gmail_connections(id) ON DELETE CASCADE,
  sync_run_id uuid NOT NULL REFERENCES public.gmail_sync_runs(id) ON DELETE CASCADE,
  message_id text NOT NULL,
  source_type text NOT NULL,
  subject text NOT NULL,
  sender text NOT NULL,
  received_at timestamptz,
  ingestion_run_id uuid REFERENCES public.ingestion_runs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gmail_processed_messages_unique UNIQUE (outlet_id, message_id)
);

CREATE INDEX idx_gmail_processed_messages_outlet_time
  ON public.gmail_processed_messages (outlet_id, created_at DESC);

ALTER TABLE public.gmail_processed_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "gmail_processed_messages_select"
  ON public.gmail_processed_messages FOR SELECT
  USING (public.is_partner(auth.uid()));

CREATE POLICY "gmail_processed_messages_insert"
  ON public.gmail_processed_messages FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));
