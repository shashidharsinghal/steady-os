CREATE OR REPLACE FUNCTION public.dashboard_item_performance(
  p_outlet_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE (
  kind text,
  category text,
  item_name text,
  qty numeric,
  revenue_paise bigint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH filtered_items AS (
    SELECT
      li.item_name,
      li.category,
      li.quantity,
      li.line_total_paise
    FROM public.active_sales_line_items li
    INNER JOIN public.active_sales_orders so
      ON so.id = li.order_id
    WHERE so.outlet_id = p_outlet_id
      AND so.status = 'success'
      AND so.ordered_at >= p_start
      AND so.ordered_at < p_end
  )
  SELECT
    'category'::text AS kind,
    COALESCE(filtered_items.category, 'Uncategorised') AS category,
    NULL::text AS item_name,
    SUM(filtered_items.quantity) AS qty,
    SUM(filtered_items.line_total_paise) AS revenue_paise
  FROM filtered_items
  GROUP BY COALESCE(filtered_items.category, 'Uncategorised')

  UNION ALL

  SELECT
    'item'::text AS kind,
    filtered_items.category,
    filtered_items.item_name,
    SUM(filtered_items.quantity) AS qty,
    SUM(filtered_items.line_total_paise) AS revenue_paise
  FROM filtered_items
  GROUP BY filtered_items.item_name, filtered_items.category;
$$;

CREATE OR REPLACE FUNCTION public.dashboard_payment_method_breakdown(
  p_outlet_id uuid,
  p_start timestamptz,
  p_end timestamptz
)
RETURNS TABLE (
  method text,
  total_paise bigint,
  order_count bigint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    split.method,
    SUM(split.amount_paise) AS total_paise,
    COUNT(DISTINCT split.order_id) AS order_count
  FROM public.active_sales_payment_splits split
  INNER JOIN public.active_sales_orders so
    ON so.id = split.order_id
  WHERE so.outlet_id = p_outlet_id
    AND so.status = 'success'
    AND so.ordered_at >= p_start
    AND so.ordered_at < p_end
  GROUP BY split.method;
$$;
