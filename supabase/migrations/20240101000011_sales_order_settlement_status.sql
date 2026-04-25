CREATE TYPE public.settlement_status AS ENUM (
  'settled',
  'pending',
  'unknown'
);

ALTER TABLE public.sales_orders
  ADD COLUMN settlement_status public.settlement_status NOT NULL DEFAULT 'unknown';

UPDATE public.sales_orders
SET settlement_status =
  CASE
    WHEN channel IN ('dine_in', 'takeaway') THEN 'settled'::public.settlement_status
    WHEN source = 'swiggy' AND aggregator_net_payout_paise IS NOT NULL THEN 'settled'::public.settlement_status
    WHEN source = 'swiggy' AND aggregator_net_payout_paise IS NULL THEN 'pending'::public.settlement_status
    WHEN source = 'zomato' THEN 'pending'::public.settlement_status
    WHEN source = 'petpooja' AND channel IN ('swiggy', 'zomato') THEN 'pending'::public.settlement_status
    ELSE 'unknown'::public.settlement_status
  END;

CREATE INDEX idx_sales_orders_settlement
  ON public.sales_orders (outlet_id, channel, settlement_status);
