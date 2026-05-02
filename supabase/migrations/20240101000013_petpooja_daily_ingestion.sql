ALTER TABLE public.ingestion_runs
  ADD COLUMN IF NOT EXISTS trigger_source text NOT NULL DEFAULT 'manual_upload',
  ADD CONSTRAINT ingestion_runs_trigger_source_check
    CHECK (trigger_source IN ('manual_upload', 'gmail_auto', 'gmail_manual', 'gmail_backfill'));

ALTER TABLE public.sales_orders
  ADD COLUMN IF NOT EXISTS order_type text,
  ADD COLUMN IF NOT EXISTS covers int,
  ADD COLUMN IF NOT EXISTS server_name text,
  ADD COLUMN IF NOT EXISTS table_no text;

CREATE TABLE IF NOT EXISTS public.sales_payment_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  method text NOT NULL,
  amount_paise bigint NOT NULL CHECK (amount_paise >= 0),
  ingestion_run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_payment_splits_method_check
    CHECK (method IN ('cash', 'card', 'upi', 'online_aggregator', 'wallet', 'due', 'not_paid', 'other')),
  CONSTRAINT sales_payment_splits_unique_method
    UNIQUE (order_id, method, ingestion_run_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_splits_order
  ON public.sales_payment_splits (order_id);

CREATE INDEX IF NOT EXISTS idx_payment_splits_outlet
  ON public.sales_payment_splits (outlet_id, method);

CREATE INDEX IF NOT EXISTS idx_payment_splits_run
  ON public.sales_payment_splits (ingestion_run_id);

ALTER TABLE public.sales_payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sales_payment_splits_select"
  ON public.sales_payment_splits FOR SELECT
  USING (
    public.is_partner(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.employees
      WHERE employees.user_id = auth.uid()
        AND employees.current_outlet_id = sales_payment_splits.outlet_id
        AND employees.archived_at IS NULL
    )
  );

CREATE POLICY "sales_payment_splits_insert"
  ON public.sales_payment_splits FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "sales_payment_splits_delete"
  ON public.sales_payment_splits FOR DELETE
  USING (public.is_partner(auth.uid()));

CREATE OR REPLACE VIEW public.active_sales_payment_splits AS
SELECT sales_payment_splits.*
FROM public.sales_payment_splits
INNER JOIN public.active_ingestion_runs
  ON active_ingestion_runs.id = sales_payment_splits.ingestion_run_id;

CREATE OR REPLACE VIEW public.active_sales_line_items AS
SELECT sales_line_items.*
FROM public.sales_line_items
INNER JOIN public.active_ingestion_runs
  ON active_ingestion_runs.id = sales_line_items.ingestion_run_id;

CREATE OR REPLACE FUNCTION public.purge_deleted_runs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_run_ids uuid[];
  affected_customer_ids uuid[];
  purged_count integer := 0;
BEGIN
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO target_run_ids
  FROM public.ingestion_runs
  WHERE deleted_at < now() - interval '30 days'
    AND status = 'committed';

  IF cardinality(target_run_ids) = 0 THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(array_agg(DISTINCT customer_id), ARRAY[]::uuid[])
  INTO affected_customer_ids
  FROM (
    SELECT sales_orders.customer_id
    FROM public.sales_orders
    WHERE sales_orders.ingestion_run_id = ANY(target_run_ids)
      AND sales_orders.customer_id IS NOT NULL
    UNION
    SELECT payment_transactions.customer_id
    FROM public.payment_transactions
    WHERE payment_transactions.ingestion_run_id = ANY(target_run_ids)
      AND payment_transactions.customer_id IS NOT NULL
  ) affected_customers;

  DELETE FROM public.sales_payment_splits
  WHERE ingestion_run_id = ANY(target_run_ids);

  DELETE FROM public.sales_line_items
  WHERE ingestion_run_id = ANY(target_run_ids);

  DELETE FROM public.sales_orders
  WHERE ingestion_run_id = ANY(target_run_ids);

  DELETE FROM public.payment_transactions
  WHERE ingestion_run_id = ANY(target_run_ids);

  DELETE FROM public.aggregator_payouts
  WHERE ingestion_run_id = ANY(target_run_ids);

  DELETE FROM public.customer_identities
  WHERE customer_id = ANY(affected_customer_ids)
    AND NOT EXISTS (
      SELECT 1
      FROM public.sales_orders
      WHERE sales_orders.customer_id = customer_identities.customer_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.payment_transactions
      WHERE payment_transactions.customer_id = customer_identities.customer_id
    );

  DELETE FROM public.customers
  WHERE customers.id = ANY(affected_customer_ids)
    AND NOT EXISTS (
      SELECT 1
      FROM public.sales_orders
      WHERE sales_orders.customer_id = customers.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.payment_transactions
      WHERE payment_transactions.customer_id = customers.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.customer_identities
      WHERE customer_identities.customer_id = customers.id
    );

  UPDATE public.ingestion_runs
  SET
    status = 'purged',
    file_sha256 = NULL,
    preview_payload = NULL,
    updated_at = now()
  WHERE id = ANY(target_run_ids);

  GET DIAGNOSTICS purged_count = ROW_COUNT;
  RETURN purged_count;
END;
$$;
