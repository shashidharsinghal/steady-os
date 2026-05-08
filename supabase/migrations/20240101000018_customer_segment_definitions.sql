CREATE TABLE public.customer_segment_definitions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id     uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  slot          integer NOT NULL CHECK (slot BETWEEN 1 AND 4),
  name          text NOT NULL,
  color_token   text NOT NULL,
  rule_type     text NOT NULL,
  rule_params   jsonb NOT NULL DEFAULT '{}'::jsonb,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outlet_id, slot)
);

CREATE INDEX idx_customer_segment_definitions_outlet
  ON public.customer_segment_definitions (outlet_id, display_order, slot);

CREATE TRIGGER set_customer_segment_definitions_updated_at
  BEFORE UPDATE ON public.customer_segment_definitions
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE FUNCTION public.seed_customer_segment_definitions_for_outlet(target_outlet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.customer_segment_definitions (
    outlet_id,
    slot,
    name,
    color_token,
    rule_type,
    rule_params,
    display_order
  )
  VALUES
    (
      target_outlet_id,
      1,
      'New customers',
      'blue',
      'first_seen_within_days',
      '{"days":30}'::jsonb,
      1
    ),
    (
      target_outlet_id,
      2,
      'Returning',
      'green',
      'returning_at_least_n',
      '{"min_orders":2,"last_seen_within_days":30}'::jsonb,
      2
    ),
    (
      target_outlet_id,
      3,
      'Lapsed regulars',
      'red',
      'lapsed_from_segment',
      '{"previously_in_slot":4,"silent_for_days":30}'::jsonb,
      3
    ),
    (
      target_outlet_id,
      4,
      'Champions',
      'accent',
      'order_count_in_window',
      '{"min_orders":5,"window_days":90}'::jsonb,
      4
    )
  ON CONFLICT (outlet_id, slot) DO NOTHING;
END;
$$;

SELECT public.seed_customer_segment_definitions_for_outlet(id)
FROM public.outlets;

CREATE OR REPLACE FUNCTION public.handle_new_outlet_segment_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_customer_segment_definitions_for_outlet(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_segment_defaults_on_outlet_insert ON public.outlets;
CREATE TRIGGER customer_segment_defaults_on_outlet_insert
  AFTER INSERT ON public.outlets
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_outlet_segment_defaults();

ALTER TABLE public.customer_segment_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customer_segment_definitions_select_members"
  ON public.customer_segment_definitions FOR SELECT
  USING (
    public.is_partner()
    OR EXISTS (
      SELECT 1
      FROM public.outlet_members
      WHERE outlet_members.outlet_id = customer_segment_definitions.outlet_id
        AND outlet_members.user_id = auth.uid()
    )
  );

CREATE POLICY "customer_segment_definitions_all_partners"
  ON public.customer_segment_definitions FOR ALL
  USING (public.is_partner());
