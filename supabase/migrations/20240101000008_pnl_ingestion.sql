CREATE TABLE public.pnl_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  entity_name text,
  store_name text,
  gross_sales_paise bigint NOT NULL DEFAULT 0,
  trade_discount_paise bigint NOT NULL DEFAULT 0,
  net_sales_paise bigint NOT NULL DEFAULT 0,
  dine_in_sales_paise bigint NOT NULL DEFAULT 0,
  swiggy_sales_paise bigint NOT NULL DEFAULT 0,
  zomato_sales_paise bigint NOT NULL DEFAULT 0,
  other_online_sales_paise bigint NOT NULL DEFAULT 0,
  opening_stock_paise bigint NOT NULL DEFAULT 0,
  purchases_paise bigint NOT NULL DEFAULT 0,
  closing_stock_paise bigint NOT NULL DEFAULT 0,
  cogs_paise bigint NOT NULL DEFAULT 0,
  gross_profit_paise bigint NOT NULL DEFAULT 0,
  total_expenses_paise bigint NOT NULL DEFAULT 0,
  miscellaneous_paise bigint NOT NULL DEFAULT 0,
  online_aggregator_charges_paise bigint NOT NULL DEFAULT 0,
  salaries_paise bigint NOT NULL DEFAULT 0,
  rent_total_paise bigint NOT NULL DEFAULT 0,
  utilities_paise bigint NOT NULL DEFAULT 0,
  marketing_fees_paise bigint NOT NULL DEFAULT 0,
  management_fees_paise bigint NOT NULL DEFAULT 0,
  logistic_cost_paise bigint NOT NULL DEFAULT 0,
  corporate_expenses_paise bigint NOT NULL DEFAULT 0,
  maintenance_paise bigint NOT NULL DEFAULT 0,
  net_profit_paise bigint NOT NULL DEFAULT 0,
  gst_amount_paise bigint NOT NULL DEFAULT 0,
  invoice_value_paise bigint NOT NULL DEFAULT 0,
  paid_by_franchise_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  raw_text text NOT NULL,
  ingestion_run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE RESTRICT,
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  purge_scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT pnl_reports_period_window CHECK (period_end >= period_start),
  CONSTRAINT pnl_reports_outlet_period_unique UNIQUE (outlet_id, period_start, period_end)
);

CREATE INDEX idx_pnl_reports_outlet_period
  ON public.pnl_reports (outlet_id, period_start DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_pnl_reports_deleted_at
  ON public.pnl_reports (deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX idx_pnl_reports_run
  ON public.pnl_reports (ingestion_run_id);

CREATE TABLE public.pnl_expense_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES public.pnl_reports(id) ON DELETE CASCADE,
  category text NOT NULL,
  subcategory text,
  label text NOT NULL,
  amount_paise bigint NOT NULL DEFAULT 0,
  paid_by_franchise boolean NOT NULL DEFAULT false,
  notes text,
  ingestion_run_id uuid NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pnl_expense_lines_report
  ON public.pnl_expense_lines (report_id);

CREATE INDEX idx_pnl_expense_lines_run
  ON public.pnl_expense_lines (ingestion_run_id);

CREATE TRIGGER set_pnl_reports_updated_at
  BEFORE UPDATE ON public.pnl_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.sync_pnl_report_purge_schedule()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.purge_scheduled_at :=
    CASE
      WHEN NEW.deleted_at IS NULL THEN NULL
      ELSE NEW.deleted_at + interval '30 days'
    END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pnl_reports_sync_purge_schedule
BEFORE INSERT OR UPDATE OF deleted_at
ON public.pnl_reports
FOR EACH ROW
EXECUTE FUNCTION public.sync_pnl_report_purge_schedule();

CREATE OR REPLACE VIEW public.active_pnl_reports AS
SELECT *
FROM public.pnl_reports
WHERE deleted_at IS NULL;

ALTER TABLE public.pnl_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pnl_expense_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pnl_reports_select"
  ON public.pnl_reports FOR SELECT
  USING (
    public.is_partner(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.outlet_members
      WHERE outlet_members.outlet_id = pnl_reports.outlet_id
        AND outlet_members.user_id = auth.uid()
    )
  );

CREATE POLICY "pnl_reports_insert"
  ON public.pnl_reports FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "pnl_reports_update"
  ON public.pnl_reports FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "pnl_expense_lines_select"
  ON public.pnl_expense_lines FOR SELECT
  USING (
    public.is_partner(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.pnl_reports
      JOIN public.outlet_members
        ON outlet_members.outlet_id = pnl_reports.outlet_id
      WHERE pnl_reports.id = pnl_expense_lines.report_id
        AND outlet_members.user_id = auth.uid()
    )
  );

CREATE POLICY "pnl_expense_lines_insert"
  ON public.pnl_expense_lines FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "pnl_expense_lines_update"
  ON public.pnl_expense_lines FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

CREATE OR REPLACE FUNCTION public.purge_deleted_runs()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_run_ids uuid[];
  target_report_ids uuid[];
  affected_customer_ids uuid[];
  linked_run_ids uuid[];
  purged_run_count integer := 0;
  purged_report_count integer := 0;
BEGIN
  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[])
  INTO target_run_ids
  FROM public.ingestion_runs
  WHERE deleted_at < now() - interval '30 days'
    AND status = 'committed';

  IF cardinality(target_run_ids) > 0 THEN
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

    DELETE FROM public.sales_line_items
    WHERE ingestion_run_id = ANY(target_run_ids);

    DELETE FROM public.pnl_expense_lines
    WHERE ingestion_run_id = ANY(target_run_ids);

    DELETE FROM public.sales_orders
    WHERE ingestion_run_id = ANY(target_run_ids);

    DELETE FROM public.payment_transactions
    WHERE ingestion_run_id = ANY(target_run_ids);

    DELETE FROM public.aggregator_payouts
    WHERE ingestion_run_id = ANY(target_run_ids);

    DELETE FROM public.pnl_reports
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

    GET DIAGNOSTICS purged_run_count = ROW_COUNT;
  END IF;

  SELECT COALESCE(array_agg(id), ARRAY[]::uuid[]),
         COALESCE(array_agg(ingestion_run_id), ARRAY[]::uuid[])
  INTO target_report_ids, linked_run_ids
  FROM public.pnl_reports
  WHERE deleted_at < now() - interval '30 days';

  IF cardinality(target_report_ids) > 0 THEN
    DELETE FROM public.pnl_reports
    WHERE id = ANY(target_report_ids);

    GET DIAGNOSTICS purged_report_count = ROW_COUNT;

    UPDATE public.ingestion_runs
    SET
      status = 'purged',
      file_sha256 = NULL,
      preview_payload = NULL,
      updated_at = now()
    WHERE id = ANY(linked_run_ids)
      AND id <> ALL(target_run_ids);
  END IF;

  RETURN purged_run_count + purged_report_count;
END;
$$;
