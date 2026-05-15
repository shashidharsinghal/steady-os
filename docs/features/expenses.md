# Feature: Expenses

**Status:** Final draft — for v3
**Module priority:** #4
**Who uses it:** partners (full), managers (read-only)
**Last updated:** 2026-05-08
**Related:** gmail-auto-ingest.md (Phase 2 invoice scanning), pnl-ingestion.md, dashboard-v3.md, admin.md
**Visual reference:** `docs/design-exports/expenses.jsx`

---

## Overview

Central place to track operating spend with **per-outlet configurable categories** and **monthly budgets per category**. Two tabs:

1. **Spend overview** — budget vs actual + ledger
2. **Pending bills** — auto-scanned from Gmail or manually added, with approval workflow

Categories are configurable per outlet (see Admin spec). Budgets per category.

---

## User Stories

- As a partner, I see how much I've spent this month against budget
- As a partner, I see per-category budget vs actual progress bars
- As a partner, I review Gmail-detected bills with extraction confidence and approve with one click
- As a partner, I see Horkiddan raw-material purchase orders from Gmail under expenses so monthly raw material cost is traceable
- As a partner, I manually add a one-off expense without waiting for invoice email
- As a partner, I configure auto-approval threshold so small recurring bills don't need babysitting
- As a partner, I view full expense ledger filtered by recurring vs one-off

---

## Tab 1 — Spend Overview

### Top row — Budget summary (5/12) + By category (7/12)

**Left card — May spend so far:**

- Card title: `{Month} spend so far`
- Big number (36px mono bold): `₹X,XX,XXX`
- Sub: `of ₹Y,YY,YYY monthly budget · NN.N% used`
- Progress bar (8px tall):
  - `> 95%` → `--red`
  - `80-95%` → `--amber`
  - `< 80%` → `--ink`
- 3-stat strip:
  - `Days into month` · `5 of 31`
  - `Pace` · `+12% over budget`
  - `Recurring (auto)` · `87%`

**Right card — By category:**

- For each ACTIVE category, a row:
  - Color square + name
  - Spent (mono bold)
  - "of ₹{budget}" muted
  - %: red if > 100, muted otherwise
  - Progress bar — fills to actual%, overflow shown in red if > 100%

If category has no budget set: row appears showing only spent amount with link "Set budget →".

### Below — Expense Ledger card

- Card title: `Expense ledger`
- Action (top-right): segmented `All | Recurring | One-off`
- Table columns:
  - **Date** (mono small)
  - **Category** (color dot + name)
  - **Vendor**
  - **Outlet** (muted)
  - **Note**
  - **Type** — `Recurring` (blue pill) or `One-off`
  - **Source** — `Manual · {user}` or `Gmail · {sender}` muted
  - **Amount** (mono right-aligned, bold)
- Pagination: 25 per page

---

## Tab 2 — Pending Bills

### Top row — 3 summary cards

| Card                   | Value                      | Sub                                  |
| ---------------------- | -------------------------- | ------------------------------------ |
| Total pending          | ₹X,XX,XXX (28px mono bold) | "{N} bills awaiting approval"        |
| Overdue                | N (28px in `--red`)        | "Past their due date"                |
| Auto-scanned this week | N (28px in `--green`)      | "From Gmail · last sync {N} min ago" |

### Gmail Scan banner

If Gmail connected — blue-tinted banner:

> **Gmail scan active** · Watching billing@, accounts@, invoice@ aliases on rohan@steadystride.in
> [Sync now] [Add manually]

If Gmail not connected — amber:

> Connect Gmail to auto-detect bills [Connect →]

### Horkiddan raw-material purchase orders

- Gmail expense scanning treats Horkiddan purchase order PDFs as expense source documents.
- Matching subjects include `PO`, `Purchase Order`, `Raw material`, and `Horkiddan`.
- Extracted rows use the active `Supplies` category when available, with `Raw material` as the item fallback.
- PO records should stay in review unless extraction confidence is high enough for the standard auto-scan rules; purchase order heuristics intentionally cap confidence below auto-approval.
- The description includes the PO number when present, so raw-material cost can be audited by month from the expense ledger.

### Pending bills table

- **Checkbox** (multi-select header)
- **Vendor / For** — vendor bold, "for" item muted small
- **Period** ("May 2026")
- **Due** (mono small)
- **Amount** (mono bold, right-aligned)
- **Status** — colored pill:
  - `Auto-scanned` (blue) — confidence ≥ 90, partner hasn't approved
  - `Needs review` (amber) — confidence < 90 or fields missing
  - `Approved` (green)
  - `Overdue` (red)
- **Initiated from** — Gmail logo or paper square icon + sender + extraction confidence % muted
- **Actions** — `Approve` button (or `View` if approved)

---

## Data Model

### Expense categories (configurable per outlet)

```sql
CREATE TABLE public.expense_categories (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id       uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  name            text NOT NULL,
  color_token     text NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  display_order   int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (outlet_id, name)
);

CREATE INDEX idx_expense_categories_outlet ON expense_categories (outlet_id, is_active, display_order);
```

**Default seed values per outlet** (partner can edit):
| Order | Name | Color |
|---|---|---|
| 1 | Rent | `--accent` |
| 2 | Salaries | `--blue` |
| 3 | Utilities | `--violet` |
| 4 | Supplies | `--green` |
| 5 | Marketing | `--amber` |
| 6 | Repairs | `--red` |

### Budgets

```sql
CREATE TABLE public.expense_budgets (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id            uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  category_id          uuid NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  monthly_budget_paise bigint NOT NULL CHECK (monthly_budget_paise >= 0),
  effective_from       date NOT NULL,
  effective_to         date,
  created_at           timestamptz DEFAULT now(),
  UNIQUE (outlet_id, category_id, effective_from)
);

CREATE INDEX idx_budgets_active ON expense_budgets (outlet_id, category_id)
  WHERE effective_to IS NULL;
```

### Expenses

```sql
CREATE TYPE expense_status AS ENUM (
  'auto_scanned', 'needs_review', 'approved', 'paid',
  'overdue', 'rejected', 'cancelled'
);

CREATE TYPE expense_source AS ENUM (
  'manual', 'gmail_scan', 'petpooja_pnl', 'recurring_auto'
);

CREATE TABLE public.expenses (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id             uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  category_id           uuid NOT NULL REFERENCES expense_categories(id),
  subcategory           text,
  vendor_name           text,
  description           text NOT NULL,
  for_item              text,
  period_label          text,
  amount_paise          bigint NOT NULL,
  tax_paise             bigint NOT NULL DEFAULT 0,
  total_paise           bigint NOT NULL,
  status                expense_status NOT NULL DEFAULT 'auto_scanned',
  invoice_date          date,
  due_date              date,
  paid_date             date,
  paid_via              text,
  paid_reference        text,
  source                expense_source NOT NULL DEFAULT 'manual',
  source_email_id       text,
  source_email_addr     text,
  attachment_url        text,
  extraction_confidence numeric(5,2),
  is_recurring          boolean DEFAULT false,
  recurrence_period     text,
  recurring_parent_id   uuid REFERENCES expenses(id),
  next_due_date         date,
  approved_at           timestamptz,
  approved_by           uuid REFERENCES auth.users(id),
  created_by            uuid REFERENCES auth.users(id),
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  deleted_at            timestamptz,
  CHECK (total_paise = amount_paise + tax_paise)
);

CREATE INDEX idx_expenses_outlet_status_due ON expenses (outlet_id, status, due_date)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_expenses_outlet_category ON expenses (outlet_id, category_id)
  WHERE deleted_at IS NULL;
```

### Auto-approve threshold

```sql
ALTER TABLE outlets
  ADD COLUMN IF NOT EXISTS auto_approve_under_paise BIGINT DEFAULT 500000;
```

### Budget summary view

```sql
CREATE OR REPLACE VIEW expense_budget_summary AS
SELECT
  c.outlet_id,
  c.id AS category_id,
  c.name AS category_name,
  c.color_token,
  c.display_order,
  COALESCE(b.monthly_budget_paise, 0) AS monthly_budget_paise,
  COALESCE(spent.spent_paise, 0) AS spent_paise,
  CASE
    WHEN b.monthly_budget_paise IS NULL OR b.monthly_budget_paise = 0 THEN NULL
    ELSE (COALESCE(spent.spent_paise, 0)::numeric / b.monthly_budget_paise) * 100
  END AS pct_used
FROM expense_categories c
LEFT JOIN expense_budgets b
  ON b.category_id = c.id AND b.effective_to IS NULL
LEFT JOIN LATERAL (
  SELECT SUM(total_paise) AS spent_paise
  FROM expenses e
  WHERE e.outlet_id = c.outlet_id
    AND e.category_id = c.id
    AND e.status IN ('paid', 'approved')
    AND date_trunc('month', COALESCE(e.paid_date, e.due_date)) = date_trunc('month', current_date)
    AND e.deleted_at IS NULL
) spent ON TRUE
WHERE c.is_active = true
ORDER BY c.outlet_id, c.display_order;
```

---

## Server Actions

```typescript
// Categories (managed in /admin)
listCategories(outletId: string): Promise<ExpenseCategory[]>;
createCategory(outletId: string, input: { name: string; colorToken: string }): Promise<ExpenseCategory>;
updateCategory(id: string, input: Partial<ExpenseCategory>): Promise<ExpenseCategory>;
deactivateCategory(id: string): Promise<void>;
reorderCategories(outletId: string, orderedIds: string[]): Promise<void>;

// Budgets
listBudgets(outletId: string): Promise<BudgetRow[]>;
upsertBudget(outletId: string, categoryId: string, monthlyBudgetPaise: bigint): Promise<void>;

// Spend overview
getSpendOverview(outletId: string, month: string): Promise<{
  totalSpentPaise: bigint;
  totalBudgetPaise: bigint;
  pctUsed: number;
  daysIntoMonth: number;
  daysInMonth: number;
  pacePct: number;
  recurringPct: number;
  byCategory: Array<{
    categoryId: string; name: string; colorToken: string;
    spentPaise: bigint; monthBudgetPaise: bigint | null; pctUsed: number | null;
  }>;
}>;

// Ledger
listExpenses(
  outletId: string,
  filters: { type?: 'all' | 'recurring' | 'oneoff'; categoryId?: string; vendor?: string; dateRange?: [Date, Date] },
  page: number
): Promise<PaginatedExpenses>;

// Pending bills
listPendingBills(outletId: string): Promise<{
  bills: Array<{
    id: string; vendor: string; forItem: string; period: string;
    amountPaise: bigint; due: string; status: ExpenseStatus;
    sourceLabel: string; sourceEmail: string | null;
    extractionConfidence: number | null;
  }>;
  totalPendingPaise: bigint;
  overdueCount: number;
  scannedThisWeekCount: number;
  gmailLastSync: string | null;
  gmailWatchedAliases: string[];
  gmailConnectedEmail: string | null;
}>;

approveBill(id: string): Promise<void>;
bulkApprove(ids: string[]): Promise<{ success: number; failed: number }>;
rejectBill(id: string): Promise<void>;
syncGmailNow(outletId: string): Promise<{ jobId: string }>;

addManualExpense(input: AddManualExpenseInput): Promise<Expense>;
updateExpense(id: string, input: UpdateExpenseInput): Promise<Expense>;
markPaid(id: string, paidVia: string, paidDate: Date, reference?: string): Promise<Expense>;
deleteExpense(id: string): Promise<void>;
```

---

## Auto-Approve Logic

When Gmail scan creates a new expense:

- If `extraction_confidence >= 90` AND `total_paise <= outlets.auto_approve_under_paise`:
  - Status = `approved`
- Else if `extraction_confidence >= 90`:
  - Status = `auto_scanned`
- Else:
  - Status = `needs_review`

---

## Recurring Expense Logic

When an expense is created with `is_recurring = true`:

- That row is the **template** (`recurring_parent_id` is null)
- Daily cron `generateRecurringExpenses` checks each template:
  - If `next_due_date <= today + 7` and no child exists with that `due_date`, create a child row with `recurring_parent_id` set, `is_recurring = false`, `status = 'pending'`
  - Update template's `next_due_date` to next period

---

## Implementation Sub-Phases

| Sub-phase                    | Scope                                                                               | Effort |
| ---------------------------- | ----------------------------------------------------------------------------------- | ------ |
| 1 — Schema + categories      | Tables, RLS, seed default categories per outlet                                     | 1 d    |
| 2 — Spend Overview tab       | Budget summary + By category + Expense ledger (read-only)                           | 1.5 d  |
| 3 — Manual entry + Recurring | Add expense dialog + recurring template + nightly cron                              | 1 d    |
| 4 — Pending Bills tab UI     | 3 summary cards + Gmail banner + table + approve actions (no Gmail integration yet) | 1 d    |
| 5 — Gmail invoice scanning   | Phase 2 of gmail-auto-ingest                                                        | 2 d    |

---

## Open Questions

- [ ] Budgets per-outlet (locked in)
- [ ] Mid-month budget changes — non-retroactive via `effective_from`
- [ ] Duplicate invoice — dedupe by `(vendor_name, period_label, amount_paise)` on insert
- [ ] Capex/investments — out of scope for v3; partner can create category called "Investment"

---

## Definition of Done

- 2 tabs work end-to-end
- Categories configurable per outlet via Admin
- Budgets editable per category via Admin
- Gmail bills appear with confidence scores (when Gmail integration ships)
- Approve / reject / bulk approve work
- Recurring expenses auto-generate via cron
- Soft delete + 30-day purge
- Mobile responsive

```

---
```
