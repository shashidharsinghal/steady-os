-- Speed up reads through the `active_*` views.
--
-- `active_sales_orders`, `active_payment_transactions`, and the other active
-- views all `INNER JOIN public.active_ingestion_runs ON ... = ingestion_runs.id`,
-- where `active_ingestion_runs` itself is just
--     SELECT * FROM ingestion_runs
--      WHERE deleted_at IS NULL
--        AND status <> 'purged'::public.ingestion_status
--
-- Until now, every dashboard query had to heap-fetch each joined ingestion_run
-- row just to evaluate that two-column predicate. The pre-existing
-- `idx_ingestion_runs_status` partial index is scoped to the in-flight
-- statuses (`uploaded`, `parsing`, `preview_ready`), so it does not help this
-- read path at all.
--
-- This partial index narrows the join target to exactly the rows the active
-- views care about, so the planner can satisfy the join with an index-only
-- scan and skip the per-row heap visit. On a multi-thousand-order outlet this
-- cuts hundreds of milliseconds off the dashboard render.
--
-- Note: not using CREATE INDEX CONCURRENTLY because Supabase migrations run
-- inside a transaction. If the table grows large enough that taking a brief
-- ACCESS EXCLUSIVE lock becomes painful, drop and recreate this index
-- CONCURRENTLY in a maintenance window.

CREATE INDEX IF NOT EXISTS idx_ingestion_runs_active
  ON public.ingestion_runs (id)
  WHERE deleted_at IS NULL
    AND status <> 'purged'::public.ingestion_status;

-- The dashboard always filters sales_orders by `status = 'success'` alongside
-- `(outlet_id, ordered_at)`. The base `idx_sales_orders_outlet_time` index
-- covers (outlet_id, ordered_at DESC) but not the success filter, so any
-- unsuccessful orders that exist on the table still get scanned. A partial
-- index keyed to successful orders gives the planner a tighter target for
-- every dashboard fetch.

CREATE INDEX IF NOT EXISTS idx_sales_orders_outlet_time_success
  ON public.sales_orders (outlet_id, ordered_at DESC)
  WHERE status = 'success';
