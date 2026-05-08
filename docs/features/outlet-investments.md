# Feature: Outlet Investment Tracking

**Status:** Final draft — for v3
**Module priority:** #2 (small, ships before Dashboard sub-phase 3)
**Who uses it:** partners only
**Last updated:** 2026-05-08
**Related:** Dashboard v3 Section 4 consumer, Outlets, Admin

---

## Overview

Track each outlet's initial investment and recovery progress. Powers the dashboard's Investment Recovery card. Configured by partners in `/admin/outlets`.

For franchise operators this is the most important question: **when do I break even?**

---

## Data Model

```sql
ALTER TABLE outlets
  ADD COLUMN IF NOT EXISTS opened_on DATE,
  ADD COLUMN IF NOT EXISTS total_invested_paise BIGINT,
  ADD COLUMN IF NOT EXISTS projected_breakeven_date DATE;
```

That's it. No new tables. The "recovered" amount is computed on-demand from monthly profit.

---

## Computed View

```sql
-- Monthly net profit per outlet — used by recovery tracking
-- Pulls from sales_orders (revenue), inventory_items (cost-to-prepare for COGS),
-- and expenses (operating spend)
CREATE OR REPLACE VIEW outlet_monthly_profit AS
WITH monthly_revenue AS (
  SELECT
    outlet_id,
    date_trunc('month', ordered_at)::date AS month,
    SUM(net_to_us_paise) AS revenue_paise
  FROM sales_orders
  WHERE status = 'success' AND deleted_at IS NULL
  GROUP BY outlet_id, date_trunc('month', ordered_at)
),
monthly_cogs AS (
  SELECT
    so.outlet_id,
    date_trunc('month', so.ordered_at)::date AS month,
    SUM(li.qty * COALESCE(ii.cost_to_prepare_paise, 0)) AS cogs_paise
  FROM sales_orders so
  JOIN sales_line_items li ON li.order_id = so.id
  LEFT JOIN inventory_items ii
    ON ii.outlet_id = so.outlet_id
    AND ii.item_name = li.item_name
    AND COALESCE(ii.variation, '') = COALESCE(li.variation, '')
  WHERE so.status = 'success' AND so.deleted_at IS NULL
  GROUP BY so.outlet_id, date_trunc('month', so.ordered_at)
),
monthly_expenses AS (
  SELECT
    outlet_id,
    date_trunc('month', COALESCE(paid_date, due_date))::date AS month,
    SUM(total_paise) AS expenses_paise
  FROM expenses
  WHERE status IN ('paid', 'approved') AND deleted_at IS NULL
  GROUP BY outlet_id, date_trunc('month', COALESCE(paid_date, due_date))
)
SELECT
  COALESCE(r.outlet_id, c.outlet_id, e.outlet_id) AS outlet_id,
  COALESCE(r.month, c.month, e.month) AS month,
  COALESCE(r.revenue_paise, 0) AS revenue_paise,
  COALESCE(c.cogs_paise, 0) AS cogs_paise,
  COALESCE(e.expenses_paise, 0) AS expenses_paise,
  COALESCE(r.revenue_paise, 0) - COALESCE(c.cogs_paise, 0) - COALESCE(e.expenses_paise, 0) AS net_profit_paise
FROM monthly_revenue r
FULL OUTER JOIN monthly_cogs c ON c.outlet_id = r.outlet_id AND c.month = r.month
FULL OUTER JOIN monthly_expenses e ON e.outlet_id = COALESCE(r.outlet_id, c.outlet_id) AND e.month = COALESCE(r.month, c.month);
```

---

## Server Actions

```typescript
// apps/web/app/(app)/admin/outlets/actions.ts

getInvestmentRecovery(outletId: string): Promise<{
  configured: boolean;
  openedOn: string | null;
  investedPaise: bigint | null;
  recoveredPaise: bigint;
  remainingPaise: bigint | null;
  recoveredPct: number | null;
  monthsToBreakEven: number | null;
  last30dProfitPaise: bigint;
  projectedBreakevenDate: string | null;
  paceVsPlanMonths: number | null;
  monthlyHistory: Array<{
    month: string;
    profitPaise: bigint;
    cumulativePaise: bigint;
  }>;
  bestMonth: { month: string; profitPaise: bigint } | null;
  avgMonthlyPaise: bigint | null;
}>;

configureInvestment(outletId: string, input: {
  openedOn: Date;
  totalInvestedPaise: bigint;
  projectedBreakevenDate?: Date;
}): Promise<void>;

clearInvestment(outletId: string): Promise<void>;
```

---

## Edge Cases

- **Outlet just opened, < 1 month of data** — `monthsToBreakEven` is null. Card shows "Building profit history."
- **Outlet running at a loss** — `monthsToBreakEven` is null. Card shows "Currently running at a loss." in red.
- **No `projected_breakeven_date` set** — pace stat shows "—" with "Set target →" link.
- **No data at all** — 12 empty grey bars with "Add sales data to see history."

---

## RLS

Same as outlets table — partners read+write all; managers read their outlet only.

---

## Definition of Done

- Outlets have `opened_on`, `total_invested_paise`, `projected_breakeven_date` columns
- `outlet_monthly_profit` view returns correct numbers
- `getInvestmentRecovery` returns all required fields
- Dashboard Section 4 renders correctly
- Admin UI lets partner configure / edit / clear investment fields
- Edge cases handled

```

---
```
