CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TYPE public.sales_channel AS ENUM (
  'dine_in',
  'takeaway',
  'swiggy',
  'zomato',
  'other'
);

CREATE TYPE public.sales_status AS ENUM (
  'success',
  'cancelled',
  'refunded',
  'partial'
);

CREATE TYPE public.payment_method AS ENUM (
  'cash',
  'card',
  'upi',
  'wallet',
  'online_aggregator',
  'not_paid',
  'part_payment',
  'other'
);

CREATE OR REPLACE FUNCTION public.normalize_customer_phone(raw_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
BEGIN
  IF raw_phone IS NULL THEN
    RETURN NULL;
  END IF;

  digits := regexp_replace(raw_phone, '[^0-9]', '', 'g');

  IF digits = '' THEN
    RETURN NULL;
  END IF;

  IF length(digits) = 12 AND left(digits, 2) = '91' THEN
    digits := right(digits, 10);
  ELSIF length(digits) = 11 AND left(digits, 1) = '0' THEN
    digits := right(digits, 10);
  END IF;

  IF length(digits) <> 10 THEN
    RETURN NULL;
  END IF;

  IF digits ~ '^([0-9])\1{9}$' THEN
    RETURN NULL;
  END IF;

  IF digits IN ('1234567890', '0123456789') THEN
    RETURN NULL;
  END IF;

  RETURN '+91' || digits;
END;
$$;

CREATE OR REPLACE FUNCTION public.hash_customer_phone(raw_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN public.normalize_customer_phone(raw_phone) IS NULL THEN NULL
    ELSE encode(
      extensions.digest(
        public.normalize_customer_phone(raw_phone)
        || COALESCE(current_setting('app.settings.phone_hash_salt', true), ''),
        'sha256'
      ),
      'hex'
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.sales_source_row_hash(parts text[])
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    extensions.digest(array_to_string(array_remove(parts, NULL), '||', ''), 'sha256'),
    'hex'
  )
$$;

CREATE TABLE public.customers (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_hash             text        UNIQUE,
  phone_last_4           text,
  name                   text,
  first_seen_at          timestamptz NOT NULL,
  last_seen_at           timestamptz NOT NULL,
  total_orders           int         NOT NULL DEFAULT 0 CHECK (total_orders >= 0),
  total_spend_paise      bigint      NOT NULL DEFAULT 0 CHECK (total_spend_paise >= 0),
  marketing_opt_in       boolean     NOT NULL DEFAULT false,
  marketing_opt_in_at    timestamptz,
  marketing_opt_in_source text,
  first_ingestion_run_id uuid        NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE RESTRICT,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customers_phone_last_4_format
    CHECK (phone_last_4 IS NULL OR phone_last_4 ~ '^[0-9]{4}$'),
  CONSTRAINT customers_name_quality
    CHECK (name IS NULL OR length(trim(name)) >= 2),
  CONSTRAINT customers_seen_window
    CHECK (last_seen_at >= first_seen_at)
);

CREATE INDEX idx_customers_last_seen
  ON public.customers (last_seen_at DESC);

CREATE INDEX idx_customers_first_ingestion_run
  ON public.customers (first_ingestion_run_id);

CREATE TRIGGER set_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.sales_orders (
  id                             uuid                  PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id                      uuid                  NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  source                         text                  NOT NULL,
  source_order_id                text                  NOT NULL,
  channel                        public.sales_channel  NOT NULL,
  order_type_raw                 text,
  area_raw                       text,
  sub_order_type_raw             text,
  status                         public.sales_status   NOT NULL,
  ordered_at                     timestamptz           NOT NULL,
  gross_amount_paise             bigint                NOT NULL CHECK (gross_amount_paise >= 0),
  discount_amount_paise          bigint                NOT NULL DEFAULT 0 CHECK (discount_amount_paise >= 0),
  net_amount_paise               bigint                NOT NULL CHECK (net_amount_paise >= 0),
  delivery_charge_paise          bigint                NOT NULL DEFAULT 0 CHECK (delivery_charge_paise >= 0),
  packaging_charge_paise         bigint                NOT NULL DEFAULT 0 CHECK (packaging_charge_paise >= 0),
  service_charge_paise           bigint                NOT NULL DEFAULT 0 CHECK (service_charge_paise >= 0),
  tax_amount_paise               bigint                NOT NULL DEFAULT 0 CHECK (tax_amount_paise >= 0),
  round_off_paise                bigint                NOT NULL DEFAULT 0,
  total_amount_paise             bigint                NOT NULL CHECK (total_amount_paise >= 0),
  cgst_paise                     bigint                NOT NULL DEFAULT 0 CHECK (cgst_paise >= 0),
  sgst_paise                     bigint                NOT NULL DEFAULT 0 CHECK (sgst_paise >= 0),
  igst_paise                     bigint                NOT NULL DEFAULT 0 CHECK (igst_paise >= 0),
  gst_paid_by_merchant_paise     bigint                NOT NULL DEFAULT 0 CHECK (gst_paid_by_merchant_paise >= 0),
  gst_paid_by_ecommerce_paise    bigint                NOT NULL DEFAULT 0 CHECK (gst_paid_by_ecommerce_paise >= 0),
  aggregator_commission_paise    bigint                CHECK (aggregator_commission_paise IS NULL OR aggregator_commission_paise >= 0),
  aggregator_fees_paise          bigint                CHECK (aggregator_fees_paise IS NULL OR aggregator_fees_paise >= 0),
  aggregator_net_payout_paise    bigint                CHECK (aggregator_net_payout_paise IS NULL OR aggregator_net_payout_paise >= 0),
  payment_method                 public.payment_method NOT NULL,
  payment_method_raw             text,
  customer_id                    uuid                  REFERENCES public.customers(id) ON DELETE SET NULL,
  customer_name_raw              text,
  customer_phone_last_4          text,
  biller                         text,
  kot_no                         text,
  notes                          text,
  ingestion_run_id               uuid                  NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE RESTRICT,
  raw_data                       jsonb                 NOT NULL,
  created_at                     timestamptz           NOT NULL DEFAULT now(),
  CONSTRAINT sales_orders_source_unique
    UNIQUE (outlet_id, source, source_order_id),
  CONSTRAINT sales_orders_customer_phone_last_4_format
    CHECK (customer_phone_last_4 IS NULL OR customer_phone_last_4 ~ '^[0-9]{4}$'),
  CONSTRAINT sales_orders_money_relationship
    CHECK (gross_amount_paise - discount_amount_paise = net_amount_paise),
  CONSTRAINT sales_orders_total_floor
    CHECK (total_amount_paise >= net_amount_paise)
);

CREATE INDEX idx_sales_orders_outlet_time
  ON public.sales_orders (outlet_id, ordered_at DESC);

CREATE INDEX idx_sales_orders_channel
  ON public.sales_orders (outlet_id, channel, ordered_at DESC);

CREATE INDEX idx_sales_orders_customer
  ON public.sales_orders (customer_id)
  WHERE customer_id IS NOT NULL;

CREATE INDEX idx_sales_orders_run
  ON public.sales_orders (ingestion_run_id);

CREATE TABLE public.sales_line_items (
  id               uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         uuid          NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  item_name        text          NOT NULL,
  category         text,
  quantity         numeric(10,3) NOT NULL CHECK (quantity > 0),
  unit_price_paise bigint        NOT NULL CHECK (unit_price_paise >= 0),
  discount_paise   bigint        NOT NULL DEFAULT 0 CHECK (discount_paise >= 0),
  tax_paise        bigint        NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  line_total_paise bigint        NOT NULL CHECK (line_total_paise >= 0),
  raw_data         jsonb         NOT NULL,
  ingestion_run_id uuid          NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE RESTRICT,
  created_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE INDEX idx_line_items_order
  ON public.sales_line_items (order_id);

CREATE INDEX idx_line_items_run
  ON public.sales_line_items (ingestion_run_id);

CREATE TABLE public.payment_transactions (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id             uuid        NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  source                text        NOT NULL,
  source_transaction_id text        NOT NULL,
  transaction_type      text        NOT NULL,
  amount_paise          bigint      NOT NULL CHECK (amount_paise >= 0),
  currency              text        NOT NULL DEFAULT 'INR',
  transacted_at         timestamptz NOT NULL,
  status                text        NOT NULL,
  card_issuer           text,
  card_network          text,
  card_last_4           text,
  is_contactless        boolean,
  is_emi                boolean,
  upi_vpa               text,
  upi_name              text,
  hardware_id           text,
  tid                   text,
  mid                   text,
  batch_no              text,
  matched_order_id      uuid        REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  match_confidence      text,
  matched_at            timestamptz,
  raw_data              jsonb       NOT NULL,
  ingestion_run_id      uuid        NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE RESTRICT,
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_transactions_source_unique
    UNIQUE (outlet_id, source, source_transaction_id),
  CONSTRAINT payment_transactions_card_last_4_format
    CHECK (card_last_4 IS NULL OR card_last_4 ~ '^[0-9]{4}$')
);

CREATE INDEX idx_payment_txns_outlet_time
  ON public.payment_transactions (outlet_id, transacted_at DESC);

CREATE INDEX idx_payment_txns_unmatched
  ON public.payment_transactions (outlet_id)
  WHERE matched_order_id IS NULL;

CREATE INDEX idx_payment_txns_run
  ON public.payment_transactions (ingestion_run_id);

CREATE TABLE public.aggregator_payouts (
  id                               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id                        uuid        NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  source                           text        NOT NULL,
  period_start                     date        NOT NULL,
  period_end                       date        NOT NULL,
  total_orders                     int         NOT NULL CHECK (total_orders >= 0),
  cancelled_orders                 int         NOT NULL DEFAULT 0 CHECK (cancelled_orders >= 0),
  item_total_paise                 bigint      NOT NULL CHECK (item_total_paise >= 0),
  packaging_charges_paise          bigint      NOT NULL DEFAULT 0 CHECK (packaging_charges_paise >= 0),
  restaurant_discount_share_paise  bigint      NOT NULL DEFAULT 0 CHECK (restaurant_discount_share_paise >= 0),
  gst_collected_paise              bigint      NOT NULL DEFAULT 0 CHECK (gst_collected_paise >= 0),
  total_customer_paid_paise        bigint      NOT NULL CHECK (total_customer_paid_paise >= 0),
  commission_paise                 bigint      NOT NULL DEFAULT 0 CHECK (commission_paise >= 0),
  payment_collection_paise         bigint      NOT NULL DEFAULT 0 CHECK (payment_collection_paise >= 0),
  long_distance_paise              bigint      NOT NULL DEFAULT 0 CHECK (long_distance_paise >= 0),
  swiggy_one_fees_paise            bigint      NOT NULL DEFAULT 0 CHECK (swiggy_one_fees_paise >= 0),
  pocket_hero_fees_paise           bigint      NOT NULL DEFAULT 0 CHECK (pocket_hero_fees_paise >= 0),
  bolt_fees_paise                  bigint      NOT NULL DEFAULT 0 CHECK (bolt_fees_paise >= 0),
  restaurant_cancellation_paise    bigint      NOT NULL DEFAULT 0 CHECK (restaurant_cancellation_paise >= 0),
  call_center_paise                bigint      NOT NULL DEFAULT 0 CHECK (call_center_paise >= 0),
  delivery_fee_sponsored_paise     bigint      NOT NULL DEFAULT 0 CHECK (delivery_fee_sponsored_paise >= 0),
  other_fees_paise                 bigint      NOT NULL DEFAULT 0 CHECK (other_fees_paise >= 0),
  gst_on_fees_paise                bigint      NOT NULL DEFAULT 0 CHECK (gst_on_fees_paise >= 0),
  total_fees_paise                 bigint      NOT NULL CHECK (total_fees_paise >= 0),
  customer_cancellations_paise     bigint      NOT NULL DEFAULT 0 CHECK (customer_cancellations_paise >= 0),
  customer_complaints_paise        bigint      NOT NULL DEFAULT 0 CHECK (customer_complaints_paise >= 0),
  gst_deduction_paise              bigint      NOT NULL DEFAULT 0 CHECK (gst_deduction_paise >= 0),
  tcs_paise                        bigint      NOT NULL DEFAULT 0 CHECK (tcs_paise >= 0),
  tds_paise                        bigint      NOT NULL DEFAULT 0 CHECK (tds_paise >= 0),
  total_taxes_paise                bigint      NOT NULL CHECK (total_taxes_paise >= 0),
  net_payout_paise                 bigint      NOT NULL,
  settlement_date                  date,
  adjustments_paise                bigint      NOT NULL DEFAULT 0,
  adjustments_detail               jsonb,
  raw_data                         jsonb       NOT NULL,
  ingestion_run_id                 uuid        NOT NULL REFERENCES public.ingestion_runs(id) ON DELETE RESTRICT,
  created_at                       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aggregator_payouts_period_unique
    UNIQUE (outlet_id, source, period_start, period_end),
  CONSTRAINT aggregator_payouts_period_window
    CHECK (period_end >= period_start)
);

CREATE INDEX idx_payouts_outlet_period
  ON public.aggregator_payouts (outlet_id, period_start DESC);

CREATE INDEX idx_payouts_run
  ON public.aggregator_payouts (ingestion_run_id);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.aggregator_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_select"
  ON public.customers FOR SELECT
  USING (public.is_partner(auth.uid()));

CREATE POLICY "customers_insert"
  ON public.customers FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "customers_update"
  ON public.customers FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "customers_delete"
  ON public.customers FOR DELETE
  USING (public.is_partner(auth.uid()));

CREATE POLICY "sales_orders_select"
  ON public.sales_orders FOR SELECT
  USING (public.is_partner(auth.uid()));

CREATE POLICY "sales_orders_insert"
  ON public.sales_orders FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "sales_orders_update"
  ON public.sales_orders FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "sales_orders_delete"
  ON public.sales_orders FOR DELETE
  USING (public.is_partner(auth.uid()));

CREATE POLICY "sales_line_items_select"
  ON public.sales_line_items FOR SELECT
  USING (public.is_partner(auth.uid()));

CREATE POLICY "sales_line_items_insert"
  ON public.sales_line_items FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "sales_line_items_update"
  ON public.sales_line_items FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "sales_line_items_delete"
  ON public.sales_line_items FOR DELETE
  USING (public.is_partner(auth.uid()));

CREATE POLICY "payment_transactions_select"
  ON public.payment_transactions FOR SELECT
  USING (public.is_partner(auth.uid()));

CREATE POLICY "payment_transactions_insert"
  ON public.payment_transactions FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "payment_transactions_update"
  ON public.payment_transactions FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "payment_transactions_delete"
  ON public.payment_transactions FOR DELETE
  USING (public.is_partner(auth.uid()));

CREATE POLICY "aggregator_payouts_select"
  ON public.aggregator_payouts FOR SELECT
  USING (public.is_partner(auth.uid()));

CREATE POLICY "aggregator_payouts_insert"
  ON public.aggregator_payouts FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "aggregator_payouts_update"
  ON public.aggregator_payouts FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "aggregator_payouts_delete"
  ON public.aggregator_payouts FOR DELETE
  USING (public.is_partner(auth.uid()));
