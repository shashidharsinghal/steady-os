CREATE TABLE public.expense_categories (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id     uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  name          text NOT NULL,
  color_token   text NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outlet_id, name)
);

CREATE INDEX idx_expense_categories_outlet
  ON public.expense_categories (outlet_id, is_active, display_order);

CREATE TRIGGER set_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE FUNCTION public.seed_expense_categories_for_outlet(target_outlet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.expense_categories (
    outlet_id,
    name,
    color_token,
    is_active,
    display_order
  )
  VALUES
    (target_outlet_id, 'Rent', 'accent', true, 1),
    (target_outlet_id, 'Salaries', 'blue', true, 2),
    (target_outlet_id, 'Utilities', 'violet', true, 3),
    (target_outlet_id, 'Supplies', 'green', true, 4),
    (target_outlet_id, 'Marketing', 'amber', true, 5),
    (target_outlet_id, 'Repairs', 'red', true, 6)
  ON CONFLICT (outlet_id, name) DO NOTHING;
END;
$$;

SELECT public.seed_expense_categories_for_outlet(id)
FROM public.outlets;

CREATE OR REPLACE FUNCTION public.handle_new_outlet_expense_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_expense_categories_for_outlet(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS expense_categories_on_outlet_insert ON public.outlets;
CREATE TRIGGER expense_categories_on_outlet_insert
  AFTER INSERT ON public.outlets
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_outlet_expense_categories();

ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_categories_select_members"
  ON public.expense_categories FOR SELECT
  USING (
    public.is_partner()
    OR EXISTS (
      SELECT 1
      FROM public.outlet_members
      WHERE outlet_members.outlet_id = expense_categories.outlet_id
        AND outlet_members.user_id = auth.uid()
    )
  );

CREATE POLICY "expense_categories_all_partners"
  ON public.expense_categories FOR ALL
  USING (public.is_partner());
