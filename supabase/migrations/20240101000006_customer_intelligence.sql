CREATE TYPE public.identity_kind AS ENUM (
  'phone_hash',
  'upi_vpa',
  'card_fingerprint'
);

ALTER TABLE public.payment_transactions
  ADD COLUMN customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX idx_payment_txns_customer
  ON public.payment_transactions (customer_id)
  WHERE customer_id IS NOT NULL;

CREATE TABLE public.customer_identities (
  id                uuid                 PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       uuid                 NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  kind              public.identity_kind NOT NULL,
  value             text                 NOT NULL,
  display_value     text,
  first_seen_at     timestamptz          NOT NULL,
  last_seen_at      timestamptz          NOT NULL,
  observation_count int                  NOT NULL DEFAULT 1 CHECK (observation_count >= 1),
  created_at        timestamptz          NOT NULL DEFAULT now(),
  UNIQUE (kind, value),
  CONSTRAINT customer_identities_seen_window
    CHECK (last_seen_at >= first_seen_at)
);

CREATE INDEX idx_customer_identities_customer
  ON public.customer_identities (customer_id);

CREATE INDEX idx_customer_identities_kind_last_seen
  ON public.customer_identities (kind, last_seen_at DESC);

CREATE TABLE public.customer_merges (
  id                     uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_customer_id    uuid        NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  secondary_customer_id  uuid        NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  merged_by              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason                 text,
  merged_at              timestamptz NOT NULL DEFAULT now(),
  undo_available_until   timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  secondary_snapshot     jsonb       NOT NULL DEFAULT '{}'::jsonb,
  restored_at            timestamptz,
  restored_by            uuid        REFERENCES auth.users(id) ON DELETE RESTRICT,
  CONSTRAINT customer_merges_distinct_customers
    CHECK (primary_customer_id <> secondary_customer_id)
);

CREATE INDEX idx_customer_merges_primary
  ON public.customer_merges (primary_customer_id, merged_at DESC);

CREATE INDEX idx_customer_merges_secondary
  ON public.customer_merges (secondary_customer_id, merged_at DESC);

CREATE TABLE public.customer_dismissed_matches (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_a_id      uuid        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  customer_b_id      uuid        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  dismissed_by       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  reason             text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT customer_dismissed_matches_distinct
    CHECK (customer_a_id <> customer_b_id)
);

CREATE UNIQUE INDEX idx_customer_dismissed_matches_pair
  ON public.customer_dismissed_matches (
    LEAST(customer_a_id, customer_b_id),
    GREATEST(customer_a_id, customer_b_id)
  );

CREATE OR REPLACE FUNCTION public.hash_card_fingerprint(
  raw_card_last_4 text,
  raw_card_issuer text,
  raw_card_network text
)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN raw_card_last_4 IS NULL OR regexp_replace(raw_card_last_4, '[^0-9]', '', 'g') !~ '^[0-9]{4}$' THEN NULL
    ELSE encode(
      extensions.digest(
        regexp_replace(raw_card_last_4, '[^0-9]', '', 'g')
        || '|'
        || lower(trim(COALESCE(raw_card_issuer, 'unknown')))
        || '|'
        || lower(trim(COALESCE(raw_card_network, 'unknown')))
        || COALESCE(current_setting('app.settings.card_fingerprint_salt', true), ''),
        'sha256'
      ),
      'hex'
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.customer_segment_label(
  p_total_orders int,
  p_first_seen_at timestamptz,
  p_last_seen_at timestamptz
)
RETURNS text
LANGUAGE sql
STABLE
AS $$
  SELECT CASE
    WHEN COALESCE(p_total_orders, 0) >= 6 THEN 'super_regular'
    WHEN COALESCE(p_total_orders, 0) >= 3 AND p_last_seen_at >= now() - interval '30 days' THEN 'regular'
    WHEN COALESCE(p_total_orders, 0) >= 2 AND p_last_seen_at >= now() - interval '30 days' THEN 'active'
    WHEN p_first_seen_at >= now() - interval '30 days' THEN 'new'
    WHEN COALESCE(p_total_orders, 0) >= 2 AND p_last_seen_at >= now() - interval '90 days' THEN 'lapsed'
    WHEN COALESCE(p_total_orders, 0) >= 2 THEN 'churned'
    WHEN COALESCE(p_total_orders, 0) = 1 THEN 'one_timer'
    ELSE 'new'
  END
$$;

CREATE OR REPLACE FUNCTION public.refresh_customer_aggregates(customer_ids uuid[] DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH interactions AS (
    SELECT
      sales_orders.customer_id,
      sales_orders.ordered_at AS observed_at,
      sales_orders.total_amount_paise AS amount_paise
    FROM public.sales_orders
    WHERE sales_orders.customer_id IS NOT NULL

    UNION ALL

    SELECT
      payment_transactions.customer_id,
      payment_transactions.transacted_at AS observed_at,
      payment_transactions.amount_paise
    FROM public.payment_transactions
    WHERE payment_transactions.customer_id IS NOT NULL
  ),
  target_customers AS (
    SELECT customers.id
    FROM public.customers
    WHERE customer_ids IS NULL OR customers.id = ANY(customer_ids)
  ),
  aggregates AS (
    SELECT
      target_customers.id AS customer_id,
      MIN(interactions.observed_at) AS first_seen_at,
      MAX(interactions.observed_at) AS last_seen_at,
      COUNT(interactions.observed_at)::int AS total_orders,
      COALESCE(SUM(interactions.amount_paise), 0)::bigint AS total_spend_paise
    FROM target_customers
    LEFT JOIN interactions ON interactions.customer_id = target_customers.id
    GROUP BY target_customers.id
  )
  UPDATE public.customers
  SET
    first_seen_at = COALESCE(aggregates.first_seen_at, customers.first_seen_at),
    last_seen_at = COALESCE(aggregates.last_seen_at, customers.last_seen_at),
    total_orders = aggregates.total_orders,
    total_spend_paise = aggregates.total_spend_paise,
    updated_at = now()
  FROM aggregates
  WHERE customers.id = aggregates.customer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_orphan_customers(customer_ids uuid[] DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.customers
  WHERE (customer_ids IS NULL OR customers.id = ANY(customer_ids))
    AND NOT EXISTS (
      SELECT 1 FROM public.sales_orders WHERE sales_orders.customer_id = customers.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.payment_transactions WHERE payment_transactions.customer_id = customers.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.customer_merges
      WHERE customer_merges.secondary_customer_id = customers.id
        AND customer_merges.restored_at IS NULL
    );
$$;

CREATE OR REPLACE VIEW public.customer_profiles AS
WITH identity_summary AS (
  SELECT
    customer_identities.customer_id,
    COUNT(*)::int AS identity_count,
    COUNT(*) FILTER (WHERE customer_identities.kind = 'phone_hash')::int AS phone_identity_count,
    COUNT(*) FILTER (WHERE customer_identities.kind = 'upi_vpa')::int AS upi_identity_count,
    COUNT(*) FILTER (WHERE customer_identities.kind = 'card_fingerprint')::int AS card_identity_count,
    STRING_AGG(COALESCE(customer_identities.display_value, customer_identities.value), ' ' ORDER BY customer_identities.last_seen_at DESC) AS identity_search_text,
    (
      ARRAY_AGG(COALESCE(customer_identities.display_value, customer_identities.value) ORDER BY customer_identities.last_seen_at DESC)
    )[1] AS latest_identity_display
  FROM public.customer_identities
  GROUP BY customer_identities.customer_id
),
channel_summary AS (
  SELECT
    sales_orders.customer_id,
    BOOL_OR(sales_orders.channel IN ('swiggy', 'zomato')) AS has_aggregator_orders,
    COUNT(*) FILTER (WHERE sales_orders.channel IN ('swiggy', 'zomato'))::int AS aggregator_order_count
  FROM public.sales_orders
  WHERE sales_orders.customer_id IS NOT NULL
  GROUP BY sales_orders.customer_id
),
payment_summary AS (
  SELECT
    payment_transactions.customer_id,
    COUNT(*)::int AS dine_in_visit_count
  FROM public.payment_transactions
  WHERE payment_transactions.customer_id IS NOT NULL
  GROUP BY payment_transactions.customer_id
)
SELECT
  customers.id,
  customers.name,
  customers.phone_last_4,
  customers.first_seen_at,
  customers.last_seen_at,
  customers.total_orders,
  customers.total_spend_paise,
  COALESCE(identity_summary.identity_count, 0) AS identity_count,
  COALESCE(identity_summary.phone_identity_count, 0) AS phone_identity_count,
  COALESCE(identity_summary.upi_identity_count, 0) AS upi_identity_count,
  COALESCE(identity_summary.card_identity_count, 0) AS card_identity_count,
  COALESCE(channel_summary.has_aggregator_orders, false) AS has_aggregator_orders,
  COALESCE(payment_summary.dine_in_visit_count, 0) > 0 AS has_dine_in,
  COALESCE(channel_summary.aggregator_order_count, 0) AS aggregator_order_count,
  COALESCE(payment_summary.dine_in_visit_count, 0) AS dine_in_visit_count,
  public.customer_segment_label(customers.total_orders, customers.first_seen_at, customers.last_seen_at) AS highest_segment,
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
FROM public.customers
LEFT JOIN identity_summary ON identity_summary.customer_id = customers.id
LEFT JOIN channel_summary ON channel_summary.customer_id = customers.id
LEFT JOIN payment_summary ON payment_summary.customer_id = customers.id;

CREATE OR REPLACE VIEW public.customer_segment_overview AS
SELECT
  customer_profiles.highest_segment AS segment,
  COUNT(*)::int AS customer_count,
  COALESCE(SUM(customer_profiles.total_spend_paise), 0)::bigint AS total_spend_paise,
  COALESCE(AVG(customer_profiles.total_orders), 0)::numeric(10, 2) AS average_order_count
FROM public.customer_profiles
GROUP BY customer_profiles.highest_segment;

ALTER TABLE public.customer_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_merges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_dismissed_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_identities_select"
  ON public.customer_identities FOR SELECT
  USING (public.is_partner(auth.uid()));

CREATE POLICY "customer_identities_insert"
  ON public.customer_identities FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "customer_identities_update"
  ON public.customer_identities FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "customer_identities_delete"
  ON public.customer_identities FOR DELETE
  USING (public.is_partner(auth.uid()));

CREATE POLICY "customer_merges_select"
  ON public.customer_merges FOR SELECT
  USING (public.is_partner(auth.uid()));

CREATE POLICY "customer_merges_insert"
  ON public.customer_merges FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "customer_merges_update"
  ON public.customer_merges FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "customer_dismissed_matches_select"
  ON public.customer_dismissed_matches FOR SELECT
  USING (public.is_partner(auth.uid()));

CREATE POLICY "customer_dismissed_matches_insert"
  ON public.customer_dismissed_matches FOR INSERT
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "customer_dismissed_matches_update"
  ON public.customer_dismissed_matches FOR UPDATE
  USING (public.is_partner(auth.uid()))
  WITH CHECK (public.is_partner(auth.uid()));

CREATE POLICY "customer_dismissed_matches_delete"
  ON public.customer_dismissed_matches FOR DELETE
  USING (public.is_partner(auth.uid()));

WITH phone_identity_rows AS (
  SELECT
    customers.id AS customer_id,
    customers.phone_hash AS value,
    CASE
      WHEN customers.phone_last_4 IS NOT NULL THEN '···' || customers.phone_last_4
      ELSE NULL
    END AS display_value,
    customers.first_seen_at,
    customers.last_seen_at,
    GREATEST(customers.total_orders, 1) AS observation_count
  FROM public.customers
  WHERE customers.phone_hash IS NOT NULL
)
INSERT INTO public.customer_identities (
  customer_id,
  kind,
  value,
  display_value,
  first_seen_at,
  last_seen_at,
  observation_count
)
SELECT
  phone_identity_rows.customer_id,
  'phone_hash',
  phone_identity_rows.value,
  phone_identity_rows.display_value,
  phone_identity_rows.first_seen_at,
  phone_identity_rows.last_seen_at,
  phone_identity_rows.observation_count
FROM phone_identity_rows
ON CONFLICT (kind, value) DO NOTHING;

WITH upi_candidates AS (
  SELECT
    gen_random_uuid() AS customer_id,
    payment_transactions.upi_vpa AS value,
    NULLIF(MIN(payment_transactions.upi_name), '') AS customer_name,
    MIN(payment_transactions.transacted_at) AS first_seen_at,
    MAX(payment_transactions.transacted_at) AS last_seen_at,
    COUNT(*)::int AS total_orders,
    COALESCE(SUM(payment_transactions.amount_paise), 0)::bigint AS total_spend_paise,
    (
      ARRAY_AGG(payment_transactions.ingestion_run_id ORDER BY payment_transactions.transacted_at ASC)
    )[1] AS first_ingestion_run_id,
    LEFT(split_part(payment_transactions.upi_vpa, '@', 1), 6) || '…@' || split_part(payment_transactions.upi_vpa, '@', 2) AS display_value
  FROM public.payment_transactions
  LEFT JOIN public.customer_identities
    ON customer_identities.kind = 'upi_vpa'
   AND customer_identities.value = payment_transactions.upi_vpa
  WHERE payment_transactions.upi_vpa IS NOT NULL
    AND payment_transactions.customer_id IS NULL
    AND customer_identities.id IS NULL
  GROUP BY payment_transactions.upi_vpa
),
inserted_customers AS (
  INSERT INTO public.customers (
    id,
    phone_hash,
    phone_last_4,
    name,
    first_seen_at,
    last_seen_at,
    total_orders,
    total_spend_paise,
    first_ingestion_run_id
  )
  SELECT
    upi_candidates.customer_id,
    NULL,
    NULL,
    upi_candidates.customer_name,
    upi_candidates.first_seen_at,
    upi_candidates.last_seen_at,
    upi_candidates.total_orders,
    upi_candidates.total_spend_paise,
    upi_candidates.first_ingestion_run_id
  FROM upi_candidates
  RETURNING id
)
INSERT INTO public.customer_identities (
  customer_id,
  kind,
  value,
  display_value,
  first_seen_at,
  last_seen_at,
  observation_count
)
SELECT
  upi_candidates.customer_id,
  'upi_vpa',
  upi_candidates.value,
  upi_candidates.display_value,
  upi_candidates.first_seen_at,
  upi_candidates.last_seen_at,
  upi_candidates.total_orders
FROM upi_candidates;

UPDATE public.payment_transactions
SET customer_id = customer_identities.customer_id
FROM public.customer_identities
WHERE payment_transactions.customer_id IS NULL
  AND payment_transactions.upi_vpa IS NOT NULL
  AND customer_identities.kind = 'upi_vpa'
  AND customer_identities.value = payment_transactions.upi_vpa;

WITH card_candidates AS (
  SELECT
    gen_random_uuid() AS customer_id,
    public.hash_card_fingerprint(payment_transactions.card_last_4, payment_transactions.card_issuer, payment_transactions.card_network) AS fingerprint,
    MIN(payment_transactions.transacted_at) AS first_seen_at,
    MAX(payment_transactions.transacted_at) AS last_seen_at,
    COUNT(*)::int AS total_orders,
    COALESCE(SUM(payment_transactions.amount_paise), 0)::bigint AS total_spend_paise,
    (
      ARRAY_AGG(payment_transactions.ingestion_run_id ORDER BY payment_transactions.transacted_at ASC)
    )[1] AS first_ingestion_run_id,
    '···'
      || COALESCE(payment_transactions.card_last_4, '0000')
      || CASE
        WHEN COALESCE(NULLIF(payment_transactions.card_issuer, ''), NULLIF(payment_transactions.card_network, '')) IS NOT NULL
          THEN ' ' || TRIM(CONCAT(COALESCE(payment_transactions.card_issuer, ''), ' ', COALESCE(payment_transactions.card_network, '')))
        ELSE ''
      END AS display_value
  FROM public.payment_transactions
  LEFT JOIN public.customer_identities
    ON customer_identities.kind = 'card_fingerprint'
   AND customer_identities.value = public.hash_card_fingerprint(payment_transactions.card_last_4, payment_transactions.card_issuer, payment_transactions.card_network)
  WHERE payment_transactions.customer_id IS NULL
    AND payment_transactions.card_last_4 IS NOT NULL
    AND customer_identities.id IS NULL
    AND public.hash_card_fingerprint(payment_transactions.card_last_4, payment_transactions.card_issuer, payment_transactions.card_network) IS NOT NULL
  GROUP BY
    payment_transactions.card_last_4,
    payment_transactions.card_issuer,
    payment_transactions.card_network
),
inserted_card_customers AS (
  INSERT INTO public.customers (
    id,
    phone_hash,
    phone_last_4,
    name,
    first_seen_at,
    last_seen_at,
    total_orders,
    total_spend_paise,
    first_ingestion_run_id
  )
  SELECT
    card_candidates.customer_id,
    NULL,
    NULL,
    NULL,
    card_candidates.first_seen_at,
    card_candidates.last_seen_at,
    card_candidates.total_orders,
    card_candidates.total_spend_paise,
    card_candidates.first_ingestion_run_id
  FROM card_candidates
  RETURNING id
)
INSERT INTO public.customer_identities (
  customer_id,
  kind,
  value,
  display_value,
  first_seen_at,
  last_seen_at,
  observation_count
)
SELECT
  card_candidates.customer_id,
  'card_fingerprint',
  card_candidates.fingerprint,
  card_candidates.display_value,
  card_candidates.first_seen_at,
  card_candidates.last_seen_at,
  card_candidates.total_orders
FROM card_candidates;

UPDATE public.payment_transactions
SET customer_id = customer_identities.customer_id
FROM public.customer_identities
WHERE payment_transactions.customer_id IS NULL
  AND payment_transactions.card_last_4 IS NOT NULL
  AND customer_identities.kind = 'card_fingerprint'
  AND customer_identities.value = public.hash_card_fingerprint(payment_transactions.card_last_4, payment_transactions.card_issuer, payment_transactions.card_network);

SELECT public.refresh_customer_aggregates(NULL);
