ALTER TYPE public.ingestion_status ADD VALUE IF NOT EXISTS 'purged';

ALTER TABLE public.ingestion_runs
  ALTER COLUMN file_sha256 DROP NOT NULL,
  ADD COLUMN deleted_at timestamptz,
  ADD COLUMN deleted_by uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD COLUMN purge_scheduled_at timestamptz;

CREATE OR REPLACE FUNCTION public.sync_ingestion_run_purge_schedule()
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

CREATE TRIGGER trg_ingestion_runs_sync_purge_schedule
BEFORE INSERT OR UPDATE OF deleted_at
ON public.ingestion_runs
FOR EACH ROW
EXECUTE FUNCTION public.sync_ingestion_run_purge_schedule();

DROP INDEX IF EXISTS public.idx_ingestion_runs_status;
CREATE INDEX idx_ingestion_runs_status
  ON public.ingestion_runs (status)
  WHERE deleted_at IS NULL
    AND status IN ('uploaded', 'parsing', 'preview_ready');

CREATE INDEX idx_ingestion_runs_deleted_at
  ON public.ingestion_runs (deleted_at DESC)
  WHERE deleted_at IS NOT NULL;

CREATE OR REPLACE VIEW public.active_ingestion_runs AS
SELECT *
FROM public.ingestion_runs
WHERE deleted_at IS NULL
  AND status::text <> 'purged';

CREATE OR REPLACE VIEW public.active_sales_orders AS
SELECT sales_orders.*
FROM public.sales_orders
INNER JOIN public.active_ingestion_runs
  ON active_ingestion_runs.id = sales_orders.ingestion_run_id;

CREATE OR REPLACE VIEW public.active_payment_transactions AS
SELECT payment_transactions.*
FROM public.payment_transactions
INNER JOIN public.active_ingestion_runs
  ON active_ingestion_runs.id = payment_transactions.ingestion_run_id;

CREATE OR REPLACE VIEW public.active_aggregator_payouts AS
SELECT aggregator_payouts.*
FROM public.aggregator_payouts
INNER JOIN public.active_ingestion_runs
  ON active_ingestion_runs.id = aggregator_payouts.ingestion_run_id;

CREATE OR REPLACE VIEW public.active_customer_profiles AS
WITH active_interactions AS (
  SELECT
    active_sales_orders.customer_id,
    active_sales_orders.ordered_at AS observed_at,
    active_sales_orders.total_amount_paise AS amount_paise,
    active_sales_orders.channel IN ('swiggy', 'zomato') AS is_aggregator,
    false AS is_dine_in
  FROM public.active_sales_orders
  WHERE active_sales_orders.customer_id IS NOT NULL

  UNION ALL

  SELECT
    active_payment_transactions.customer_id,
    active_payment_transactions.transacted_at AS observed_at,
    active_payment_transactions.amount_paise,
    false AS is_aggregator,
    true AS is_dine_in
  FROM public.active_payment_transactions
  WHERE active_payment_transactions.customer_id IS NOT NULL
),
identity_summary AS (
  SELECT
    customer_identities.customer_id,
    COUNT(*)::int AS identity_count,
    COUNT(*) FILTER (WHERE customer_identities.kind = 'phone_hash')::int AS phone_identity_count,
    COUNT(*) FILTER (WHERE customer_identities.kind = 'upi_vpa')::int AS upi_identity_count,
    COUNT(*) FILTER (WHERE customer_identities.kind = 'card_fingerprint')::int AS card_identity_count,
    STRING_AGG(
      COALESCE(customer_identities.display_value, customer_identities.value),
      ' '
      ORDER BY customer_identities.last_seen_at DESC
    ) AS identity_search_text,
    (
      ARRAY_AGG(
        COALESCE(customer_identities.display_value, customer_identities.value)
        ORDER BY customer_identities.last_seen_at DESC
      )
    )[1] AS latest_identity_display
  FROM public.customer_identities
  GROUP BY customer_identities.customer_id
),
aggregates AS (
  SELECT
    active_interactions.customer_id,
    MIN(active_interactions.observed_at) AS first_seen_at,
    MAX(active_interactions.observed_at) AS last_seen_at,
    COUNT(*)::int AS total_orders,
    COALESCE(SUM(active_interactions.amount_paise), 0)::bigint AS total_spend_paise,
    BOOL_OR(active_interactions.is_aggregator) AS has_aggregator_orders,
    BOOL_OR(active_interactions.is_dine_in) AS has_dine_in,
    COUNT(*) FILTER (WHERE active_interactions.is_aggregator)::int AS aggregator_order_count,
    COUNT(*) FILTER (WHERE active_interactions.is_dine_in)::int AS dine_in_visit_count
  FROM active_interactions
  GROUP BY active_interactions.customer_id
)
SELECT
  customers.id,
  customers.name,
  customers.phone_last_4,
  aggregates.first_seen_at,
  aggregates.last_seen_at,
  aggregates.total_orders,
  aggregates.total_spend_paise,
  COALESCE(identity_summary.identity_count, 0) AS identity_count,
  COALESCE(identity_summary.phone_identity_count, 0) AS phone_identity_count,
  COALESCE(identity_summary.upi_identity_count, 0) AS upi_identity_count,
  COALESCE(identity_summary.card_identity_count, 0) AS card_identity_count,
  COALESCE(aggregates.has_aggregator_orders, false) AS has_aggregator_orders,
  COALESCE(aggregates.has_dine_in, false) AS has_dine_in,
  COALESCE(aggregates.aggregator_order_count, 0) AS aggregator_order_count,
  COALESCE(aggregates.dine_in_visit_count, 0) AS dine_in_visit_count,
  public.customer_segment_label(
    aggregates.total_orders,
    aggregates.first_seen_at,
    aggregates.last_seen_at
  ) AS highest_segment,
  COALESCE(
    NULLIF(trim(customers.name), ''),
    NULLIF(identity_summary.latest_identity_display, ''),
    CASE
      WHEN customers.phone_last_4 IS NOT NULL THEN '···' || customers.phone_last_4
      ELSE 'Customer'
    END
  ) AS primary_identifier,
  LOWER(
    CONCAT_WS(
      ' ',
      customers.name,
      customers.phone_last_4,
      identity_summary.identity_search_text
    )
  ) AS search_text
FROM aggregates
INNER JOIN public.customers
  ON customers.id = aggregates.customer_id
LEFT JOIN identity_summary
  ON identity_summary.customer_id = customers.id;

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

CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $cron$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM cron.job
    WHERE jobname = 'purge-deleted-runs'
  ) THEN
    PERFORM cron.schedule(
      'purge-deleted-runs',
      '30 3 * * *',
      'SELECT public.purge_deleted_runs();'
    );
  END IF;
END;
$cron$;
