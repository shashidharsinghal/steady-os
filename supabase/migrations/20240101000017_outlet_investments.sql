ALTER TABLE public.outlets
  ADD COLUMN IF NOT EXISTS opened_on date,
  ADD COLUMN IF NOT EXISTS total_invested_paise bigint,
  ADD COLUMN IF NOT EXISTS projected_breakeven_date date;

COMMENT ON COLUMN public.outlets.opened_on IS
  'Partner-configured opening date used by investment recovery tracking.';
COMMENT ON COLUMN public.outlets.total_invested_paise IS
  'Total initial investment in paise for outlet recovery tracking.';
COMMENT ON COLUMN public.outlets.projected_breakeven_date IS
  'Optional partner-set target date for reaching breakeven.';

CREATE OR REPLACE VIEW public.outlet_monthly_profit AS
WITH monthly_revenue AS (
  SELECT
    so.outlet_id,
    date_trunc('month', so.ordered_at AT TIME ZONE 'Asia/Kolkata')::date AS month,
    SUM(
      CASE
        WHEN so.channel IN ('dine_in', 'takeaway')
          THEN so.total_amount_paise
        WHEN so.aggregator_net_payout_paise IS NOT NULL AND so.aggregator_net_payout_paise > 0
          THEN so.aggregator_net_payout_paise
        ELSE GREATEST(
          so.total_amount_paise
          - COALESCE(so.aggregator_commission_paise, 0)
          - COALESCE(so.aggregator_fees_paise, 0),
          0
        )
      END
    )::bigint AS revenue_paise
  FROM public.active_sales_orders so
  WHERE so.status = 'success'
  GROUP BY so.outlet_id, date_trunc('month', so.ordered_at AT TIME ZONE 'Asia/Kolkata')::date
)
SELECT
  monthly_revenue.outlet_id,
  monthly_revenue.month,
  monthly_revenue.revenue_paise,
  0::bigint AS cogs_paise,
  0::bigint AS expenses_paise,
  monthly_revenue.revenue_paise::bigint AS net_profit_paise
FROM monthly_revenue;

GRANT SELECT ON public.outlet_monthly_profit TO authenticated;
