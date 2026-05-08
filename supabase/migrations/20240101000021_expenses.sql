CREATE TYPE public.expense_status AS ENUM (
  'auto_scanned',
  'needs_review',
  'approved',
  'paid',
  'overdue',
  'rejected',
  'cancelled'
);

CREATE TYPE public.expense_source AS ENUM (
  'manual',
  'gmail_scan',
  'petpooja_pnl',
  'recurring_auto'
);

ALTER TABLE public.outlets
  ADD COLUMN IF NOT EXISTS auto_approve_under_paise bigint NOT NULL DEFAULT 500000;

CREATE TABLE public.expense_budgets (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id            uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  category_id          uuid NOT NULL REFERENCES public.expense_categories(id) ON DELETE CASCADE,
  monthly_budget_paise bigint NOT NULL CHECK (monthly_budget_paise >= 0),
  effective_from       date NOT NULL,
  effective_to         date,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outlet_id, category_id, effective_from)
);

CREATE INDEX idx_budgets_active
  ON public.expense_budgets (outlet_id, category_id)
  WHERE effective_to IS NULL;

CREATE TABLE public.expenses (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id             uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  category_id           uuid NOT NULL REFERENCES public.expense_categories(id),
  subcategory           text,
  vendor_name           text,
  description           text NOT NULL,
  for_item              text,
  period_label          text,
  amount_paise          bigint NOT NULL CHECK (amount_paise >= 0),
  tax_paise             bigint NOT NULL DEFAULT 0 CHECK (tax_paise >= 0),
  total_paise           bigint NOT NULL CHECK (total_paise >= 0),
  status                public.expense_status NOT NULL DEFAULT 'auto_scanned',
  invoice_date          date,
  due_date              date,
  paid_date             date,
  paid_via              text,
  paid_reference        text,
  source                public.expense_source NOT NULL DEFAULT 'manual',
  source_email_id       text,
  source_email_addr     text,
  attachment_url        text,
  extraction_confidence numeric(5,2),
  is_recurring          boolean NOT NULL DEFAULT false,
  recurrence_period     text,
  recurring_parent_id   uuid REFERENCES public.expenses(id),
  next_due_date         date,
  approved_at           timestamptz,
  approved_by           uuid REFERENCES auth.users(id),
  created_by            uuid REFERENCES auth.users(id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz,
  CHECK (total_paise = amount_paise + tax_paise)
);

CREATE INDEX idx_expenses_outlet_status_due
  ON public.expenses (outlet_id, status, due_date)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_expenses_outlet_category
  ON public.expenses (outlet_id, category_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_expenses_outlet_created
  ON public.expenses (outlet_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TRIGGER set_expense_budgets_updated_at
  BEFORE UPDATE ON public.expense_budgets
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER set_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

CREATE OR REPLACE VIEW public.expense_budget_summary AS
SELECT
  c.outlet_id,
  c.id AS category_id,
  c.name AS category_name,
  c.color_token,
  c.display_order,
  b.id AS budget_id,
  b.monthly_budget_paise,
  COALESCE(spent.spent_paise, 0)::bigint AS spent_paise,
  CASE
    WHEN b.monthly_budget_paise IS NULL OR b.monthly_budget_paise = 0 THEN NULL
    ELSE ROUND((COALESCE(spent.spent_paise, 0)::numeric / b.monthly_budget_paise) * 100, 2)
  END AS pct_used
FROM public.expense_categories c
LEFT JOIN public.expense_budgets b
  ON b.category_id = c.id
  AND b.outlet_id = c.outlet_id
  AND b.effective_to IS NULL
LEFT JOIN LATERAL (
  SELECT SUM(e.total_paise) AS spent_paise
  FROM public.expenses e
  WHERE e.outlet_id = c.outlet_id
    AND e.category_id = c.id
    AND e.status IN ('paid', 'approved')
    AND date_trunc('month', COALESCE(e.paid_date, e.due_date, e.invoice_date, e.created_at::date)) = date_trunc('month', current_date)
    AND e.deleted_at IS NULL
) spent ON TRUE
WHERE c.is_active = true
ORDER BY c.outlet_id, c.display_order;

GRANT SELECT ON public.expense_budget_summary TO authenticated;

ALTER TABLE public.expense_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expense_budgets_select_members"
  ON public.expense_budgets FOR SELECT
  USING (
    public.is_partner()
    OR EXISTS (
      SELECT 1
      FROM public.outlet_members
      WHERE outlet_members.outlet_id = expense_budgets.outlet_id
        AND outlet_members.user_id = auth.uid()
    )
  );

CREATE POLICY "expense_budgets_all_partners"
  ON public.expense_budgets FOR ALL
  USING (public.is_partner());

CREATE POLICY "expenses_select_members"
  ON public.expenses FOR SELECT
  USING (
    public.is_partner()
    OR EXISTS (
      SELECT 1
      FROM public.outlet_members
      WHERE outlet_members.outlet_id = expenses.outlet_id
        AND outlet_members.user_id = auth.uid()
    )
  );

CREATE POLICY "expenses_all_partners"
  ON public.expenses FOR ALL
  USING (public.is_partner());
