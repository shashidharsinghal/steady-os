# Stride OS v3 — Complete Spec Set

**Generated:** 2026-05-08
**Status:** Final, complete, self-contained
**Use:** Single source for Codex implementation. Every spec is inline; no external file references needed.

---

# Table Of Contents

1. [Overview & Decisions](#overview--decisions)
2. [Implementation Phases (17 phases, ~28-30 days)](#implementation-phases)
3. [Spec — `design-system.md`](#spec--design-systemmd)
4. [Spec — `outlet-investments.md`](#spec--outlet-investmentsmd)
5. [Spec — `inventory.md`](#spec--inventorymd)
6. [Spec — `expenses.md`](#spec--expensesmd)
7. [Spec — `dashboard-v3.md`](#spec--dashboard-v3md)
8. [Spec — `sales-analytics.md`](#spec--sales-analyticsmd)
9. [Spec — `admin.md`](#spec--adminmd)
10. [Spec — `ingest-ux-v3.md`](#spec--ingest-ux-v3md)
11. [Patches To Existing Specs](#patches-to-existing-specs)
12. [`CLAUDE.md` v3 Status Block](#claudemd-v3-status-block)
13. [Codex Phase Prompts](#codex-phase-prompts)

---

# Overview & Decisions

Stride OS v3 rebuilds the dashboard, adds 4 new modules (Inventory, Expenses, Sales Analytics deep-dive, Admin), polishes the Ingest page UX, and applies a fresh design system based on the Claude Design prototype.

The existing v2.1 features (Outlets, Outlet Photos, Employees, Contractors, Sales ingestion, Petpooja daily ingestion, Gmail auto-ingest Phase 1, P&L ingestion, Customer intelligence) all continue working — v3 adds on top.

### Locked Decisions

| #   | Decision                                               | Implication                                                                               |
| --- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 1   | Investment Recovery tracker is critical                | New `outlet-investments.md` spec; dashboard Section 4 dedicated to it; new admin sub-page |
| 2   | Profit margin tile shows "—" until inventory has costs | Stat strip degrades gracefully; no broken state                                           |
| 3   | No LLM narrative for v3                                | Morning Check sub-paragraph uses templated SQL phrases; LLM deferred to v3.1              |
| 4   | Customer segments configurable in `/admin`             | New `customer_segment_definitions` table per outlet; admin sub-page                       |
| 5   | Expense categories configurable per outlet             | New `expense_categories` table per outlet; admin sub-page                                 |

### Tech Patterns (Unchanged From v2.1)

- Next.js 15 (App Router) + TypeScript strict + React 19
- Supabase (Postgres + Auth + Storage + RLS) using `@supabase/ssr`
- Tailwind CSS + shadcn/ui (new-york style, neutral base)
- Vercel hosting
- Turborepo monorepo: `apps/web/`, `packages/{db,ui,shared,config}/`
- Money in paise (bigint everywhere)
- Soft delete + 30-day purge cron
- `active_*` views to filter soft-deleted rows
- Server actions for all canonical writes
- `requirePartner()` helper in `apps/web/lib/auth.ts`
- RLS uses `is_partner()` SQL helper
- Conventional commits

### File Operations Summary

```
docs/features/
├── dashboard-v3.md            ← NEW (replaces v2)
├── expenses.md                 ← NEW
├── inventory.md                ← NEW
├── sales-analytics.md          ← NEW
├── tasks.md                    ← NEW (post-v3 candidate)
├── admin.md                    ← NEW
├── ingest-ux-v3.md             ← NEW
├── outlet-investments.md       ← NEW
├── design-system.md            ← REPLACE existing
├── outlets.md                  ← keep, add status note
├── outlet-photos.md            ← keep, add status note
├── employees.md                ← keep, add status note
├── contractors.md              ← keep, add status note
├── ingestion-framework.md      ← surgical patch
├── sales-ingestion.md          ← surgical patch
├── customer-intelligence.md    ← surgical patch
├── pnl-ingestion.md            ← surgical patch
├── gmail-auto-ingest.md        ← surgical patch (adds Phase 2)
├── petpooja-daily-ingestion.md ← surgical patch (nav update)
└── _archive/
    ├── sales-dashboard.md      ← MOVE here (v1)
    └── sales-dashboard-v2.md   ← MOVE here (v2)

docs/design-exports/
└── (all JSX + HTML files from Claude Design)
```

### Post-v3 Candidate

After the current v3 scope, the next clean operating module is a lightweight **Tasks Panel**:

- dedicated `/tasks` route
- quick capture for pending work
- task criticality
- task area (`operations`, `food`, `accounts`, etc.)
- assign to named teammate or role (`store_manager`)
- status tracking until closure

Canonical spec path:

`docs/features/tasks.md`

---

# Implementation Phases

17 phases, ~28-30 days. Order matters — schema migrations come before consumers.

| #   | Phase                                                      | Effort | Spec section                               |
| --- | ---------------------------------------------------------- | ------ | ------------------------------------------ |
| 1   | Design System v3                                           | 1 d    | § Spec — `design-system.md`                |
| 2   | Outlet Investments schema + Admin UI                       | 1 d    | § Spec — `outlet-investments.md` + § Admin |
| 3   | Customer segments schema + Admin UI                        | 1 d    | § Dashboard data model + § Admin           |
| 4   | Expense categories schema + Admin UI                       | 1 d    | § Expenses data model + § Admin            |
| 5   | Inventory module                                           | 3-4 d  | § Spec — `inventory.md`                    |
| 6   | Dashboard sub-phase 1 — Frame + Morning Check              | 1.5 d  | § Dashboard Sections 1, 2                  |
| 7   | Dashboard sub-phase 2 — Stat strip + Trend chart           | 1.5 d  | § Dashboard Sections 3, 5                  |
| 8   | Expenses sub-phase 1 — Schema + Spend Overview             | 1.5 d  | § Expenses Tab 1                           |
| 9   | Expenses sub-phase 2 — Manual + Recurring                  | 1 d    | § Expenses Sub-phase 2                     |
| 10  | Dashboard sub-phase 3 — Investment Recovery + DoW + Hourly | 1.5 d  | § Dashboard Sections 4, 6                  |
| 11  | Dashboard sub-phase 4 — Channels + Items + Customers       | 1 d    | § Dashboard Sections 7, 8                  |
| 12  | Dashboard sub-phase 5 — Discount + Payment                 | 1 d    | § Dashboard Section 9                      |
| 13  | Sales Analytics deep-dive                                  | 3 d    | § Spec — `sales-analytics.md`              |
| 14  | Expenses sub-phase 3 — Pending Bills UI                    | 1 d    | § Expenses Tab 2                           |
| 15  | Admin module                                               | 3 d    | § Spec — `admin.md`                        |
| 16  | Ingest UX v3                                               | 2 d    | § Spec — `ingest-ux-v3.md`                 |
| 17  | Expenses sub-phase 4 — Gmail invoice scanning              | 2 d    | § Patches — `gmail-auto-ingest.md` Phase 2 |

**Critical path constraints:**

- Phase 1 first — every other phase depends on the design tokens
- Phases 2-4 (small migrations) before phases that consume them
- Phase 5 (Inventory) before Phase 7 (so profit margin can render)
- Phases 8-9 (Expenses Spend Overview) before Phase 10 (so profit calc has expenses)

---

# Spec — `design-system.md`

````markdown
# Feature: Design System v3

**Status:** Final — for v3 implementation
**Last updated:** 2026-05-08
**Supersedes:** earlier abstract design-system.md
**Visual reference:** `docs/design-exports/SteadyStrideOS_Redesign.html`

This is the canonical visual language for Stride OS. Every component and page must use these tokens. Values come directly from the Claude Design prototype.

---

## Tokens — Light Mode (default)

```css
:root {
  /* Paper / Ink palette */
  --paper: #f6f3ec;
  --paper-2: #efeae0;
  --ink: #14171c;
  --ink-2: #2a2f38;
  --muted: #6c7280;
  --line: #e2dccf;
  --line-strong: #cfc6b3;
  --card: #ffffff;

  /* Accent — coral */
  --accent: #ff5b3a;
  --accent-soft: #ffe4dc;

  /* Semantic */
  --green: #3a7d4e;
  --green-soft: #d8ecdc;
  --amber: #b8862c;
  --amber-soft: #f4e7c1;
  --red: #c83a2c;
  --red-soft: #f6dbd5;
  --blue: #2a5cd6;
  --blue-soft: #dbe4f7;
  --violet: #5b3a9e;
  --violet-soft: #e4dbf3;

  /* Geometry */
  --radius: 10px;
  --pad: 16px;

  /* Elevation */
  --shadow: 0 1px 0 rgba(20, 23, 28, 0.04), 0 0 0 1px var(--line);
  --shadow-elev: 0 12px 32px -16px rgba(20, 23, 28, 0.18), 0 1px 0 rgba(20, 23, 28, 0.05);
}
```
````

## Tokens — Dark Mode

```css
[data-theme="dark"] {
  --paper: #0e1014;
  --paper-2: #14171c;
  --ink: #f1ece1;
  --ink-2: #c9c2b1;
  --muted: #8a8f9a;
  --line: #23272f;
  --line-strong: #2f343d;
  --card: #14171c;

  --accent: #ff7a5c;
  --accent-soft: #3a1d15;

  --green: #6dc188;
  --green-soft: #16291c;
  --amber: #e0b35a;
  --amber-soft: #2c2412;
  --red: #ed6e60;
  --red-soft: #2c1612;
  --blue: #6e94f0;
  --blue-soft: #161e34;
  --violet: #a48de0;
  --violet-soft: #1f1830;

  --shadow: 0 1px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px var(--line);
  --shadow-elev: 0 16px 36px -18px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--line);
}
```

---

## Typography

Three families:

- **Inter** — body, UI text, numbers (with `tabular-nums`)
- **Instrument Serif** (italic) — page titles only, large display
- **JetBrains Mono** — numeric values where consistency matters (table numbers, IDs, amounts)

Sizes: 10 / 11 / 12 / 13 / 14 / 16 / 18 / 24 / 32 / 44px.

Headings:

- **Page title:** 44px Instrument Serif italic, weight 400, letter-spacing -0.02em
- **Page eyebrow:** 11px Inter, uppercase, letter-spacing 0.18em, color `--accent`, weight 600
- **Card title:** 12px Inter, uppercase, letter-spacing 0.12em, color `--muted`, weight 600

Body: 14px Inter, weight 400, line-height 1.4.

Add via `next/font` (Inter is already present):

```typescript
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
const serif = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  variable: "--font-serif",
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
```

---

## Layout

- App grid: `grid-template-columns: 248px 1fr` (sidebar + main)
- Sidebar collapsed (rail) variant: 64px wide
- Top bar height: 64px, sticky, blurred background
- Page content max-width: 1480px
- Page padding: 24px 28px

---

## Components

### Card

```css
.card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: var(--pad);
}
.card.elev {
  box-shadow: var(--shadow-elev);
}
```

### Buttons

- `.btn` — default, white background, line border
- `.btn.primary` — ink background, paper text
- `.btn.accent` — coral background, white text
- `.btn.ghost` — transparent
- `.btn.sm` — smaller padding
- `.btn.danger` — soft-red background, red text

### Pills

- `.pill` — neutral default
- `.pill.green` / `.red` / `.amber` / `.blue` / `.violet` — semantic colors using soft backgrounds

### Stats

```css
.stat-num {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.stat-num.lg {
  font-size: 44px;
}
.stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
  font-weight: 600;
}
.delta {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.delta.up {
  color: var(--green);
}
.delta.down {
  color: var(--red);
}
```

### Sparkline

40px tall, full card width. Use Recharts `<AreaChart>` with no axes, no grid, accent color fill.

### Density tokens

```css
[data-density="compact"] {
  --pad: 12px;
}
[data-density="cozy"] {
  --pad: 16px;
} /* default */
[data-density="comfy"] {
  --pad: 22px;
}
```

---

## Sidebar Structure (v3)

Three sections:

```
MAIN
  Dashboard
  Sales            (Sales Analytics deep-dive)
  Expenses         ← new
  Inventory        ← new
  Customers

MANAGE
  Outlets
  Employees
  P&L Reports

SYSTEM
  Ingest
  Admin            ← new
```

Active item: `--ink` background, `--paper` text. Hover: `--paper-2` background.

---

## Navigation Icons (lucide-react)

- Dashboard → `LayoutDashboard`
- Sales → `TrendingUp`
- Expenses → `Receipt` (or `Wallet`)
- Inventory → `Package` (or `Box`)
- Customers → `Users`
- Outlets → `Store`
- Employees → `UserCog`
- P&L Reports → `FileText`
- Ingest → `Upload`
- Admin → `Settings`

---

## Implementation Checklist

- [ ] Replace `globals.css` token block with values above (light + dark)
- [ ] Update Tailwind config to expose all tokens via `theme.extend.colors`
- [ ] Add Instrument Serif and JetBrains Mono via `next/font`
- [ ] Update `<PageHeader>` component to use the eyebrow + serif title pattern
- [ ] Update sidebar component to use the three-section structure
- [ ] Add density token support (default `cozy`)
- [ ] Audit every page — no hardcoded colors, all via tokens
- [ ] Ensure dark mode toggle works flawlessly with no flash on reload

````

---

# Spec — `outlet-investments.md`

```markdown
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
````

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

````

---

# Spec — `inventory.md`

```markdown
# Feature: Inventory Items

**Status:** Final draft — for v3
**Module priority:** #5
**Who uses it:** partners (full), managers (read-only on costs)
**Last updated:** 2026-05-08
**Related:** Dashboard v3 (profit card uses this), Sales Analytics (margin column), Sales ingestion (item-level feed)

---

## Overview

A simple master list of menu items with their selling price, cost-to-prepare, and margin. Once configured, the dashboard can compute estimated COGS and profit per period, and the Sales deep-dive page can rank items by margin.

This is intentionally minimal — not a full inventory/stock management system. The MVP tracks unit economics, not stock movements.

---

## User Stories

- As a partner, I see every menu item with its margin so I know which dishes are most profitable
- As a partner, I edit cost-to-prepare for any item so margin numbers stay accurate as ingredient costs change
- As a partner, I mark items inactive when removed from the menu
- As a partner, I optionally track stock levels and reorder thresholds (Phase 2 fields)

---

## Scope

### In scope (v3 launch)

- Item list: name, category, variation, selling price, cost-to-prepare, margin %, active flag
- Add / edit / soft-delete items
- Auto-derive items from `sales_line_items` for fast initial setup ("import from sales history")
- Margin auto-computed and displayed live as user types
- Color-coded margin badge (green > 60%, amber 40–60%, red < 40%)
- Filter by category; search by name

### Out of scope (Phase 2)

- Stock level tracking with movements
- Reorder alerts
- Recipe / BOM (bill of materials)
- Multi-unit conversions
- Vendor linking

---

## Data Model

```sql
CREATE TABLE public.inventory_items (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id                uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,

  item_name                text NOT NULL,
  category                 text,
  variation                text,                       -- 'Half' | 'Full' | NULL

  selling_price_paise      bigint NOT NULL CHECK (selling_price_paise >= 0),
  cost_to_prepare_paise    bigint CHECK (cost_to_prepare_paise IS NULL OR cost_to_prepare_paise >= 0),

  -- Phase 2 fields, nullable in v3
  current_stock            int,
  reorder_level            int,
  unit                     text DEFAULT 'pieces',

  is_active                boolean NOT NULL DEFAULT true,

  created_by               uuid REFERENCES auth.users(id),
  updated_by               uuid REFERENCES auth.users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz,

  UNIQUE (outlet_id, item_name, variation, deleted_at)
);

CREATE INDEX idx_inventory_outlet_active ON public.inventory_items (outlet_id, is_active)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_outlet_category ON public.inventory_items (outlet_id, category)
  WHERE deleted_at IS NULL;

CREATE VIEW public.active_inventory_items AS
  SELECT
    *,
    CASE
      WHEN cost_to_prepare_paise IS NULL OR selling_price_paise = 0 THEN NULL
      ELSE ROUND(
        ((selling_price_paise - cost_to_prepare_paise)::numeric / selling_price_paise) * 100,
        2
      )
    END AS profit_margin_pct
  FROM public.inventory_items
  WHERE deleted_at IS NULL;
````

**RLS:** Partners read+write; managers read-only.

---

## Pages & Routes

| Route               | Component                             | Auth                |
| ------------------- | ------------------------------------- | ------------------- |
| `/inventory`        | `app/(app)/inventory/page.tsx`        | partner+manager     |
| `/inventory/new`    | dialog                                | partner only        |
| `/inventory/[id]`   | dialog or page                        | partner only (edit) |
| `/inventory/import` | `app/(app)/inventory/import/page.tsx` | partner only        |

---

## UI Layout

**Page header:** standard design system header.

**Top toolbar:**

- Search input (cmd-K hint)
- Category dropdown filter
- "Show inactive" toggle (default off)
- "+ Add item" primary button
- "Import from sales" secondary button (visible if any sales data exists)

**Main area — table:**
| Column | Width | Notes |
|---|---|---|
| Item | flex | Name + variation as small muted suffix |
| Category | 140px | Pill style |
| Selling price | 120px | mono right-aligned |
| Cost | 120px | mono right-aligned; "—" if null with edit pencil |
| Margin | 100px | Color-coded pill (green/amber/red) |
| Status | 80px | LED dot + Active/Inactive |
| Actions | 60px | Edit / Archive icon buttons |

**Empty state:** "No items yet. Either [+ Add item] manually, or [Import from sales history] to bootstrap from your past orders."

**Add/Edit form:**

- Item name \* (text)
- Category (text or dropdown if existing values)
- Variation (text, optional)
- Selling price \* (₹, paise validated)
- Cost to prepare (₹, optional)
- **Live margin display** below cost field — updates as user types
- Active toggle (default on)
- Stock fields (collapsed under "Advanced")
- Submit / Cancel

---

## Import-From-Sales Flow

When `inventory_items` is empty for an outlet:

1. Query `DISTINCT item_name, variation FROM sales_line_items WHERE outlet_id = $1`
2. Show a table preview: each unique item with most recent selling price found in sales
3. Partner can deselect any rows
4. Partner clicks "Import N items" → bulk insert with `cost_to_prepare_paise = NULL`
5. Partner is taken to inventory list with all items present, costs blank, ready to fill in

---

## Server Actions

```typescript
createInventoryItem(input: CreateInventoryInput): Promise<InventoryItem>;
updateInventoryItem(id: string, input: UpdateInventoryInput): Promise<InventoryItem>;
deleteInventoryItem(id: string): Promise<void>;
toggleActive(id: string): Promise<InventoryItem>;
listInventoryItems(outletId: string, filters: InventoryFilters): Promise<InventoryItem[]>;

importFromSalesHistory(outletId: string, selections: Array<{
  itemName: string;
  variation: string | null;
  category: string | null;
  sellingPricePaise: bigint;
}>): Promise<{ created: number; skipped: number }>;

getCogsForPeriod(outletId: string, start: Date, end: Date): Promise<{
  cogsPaise: bigint;
  itemsCovered: number;
  itemsMissingCost: number;
  coveragePct: number;
}>;
```

---

## Open Questions

- [ ] Track historical costs? Recommend: NO in v3. When cost is updated, all historical COGS calcs use current cost. Add `cost_history` only if partners ask.
- [ ] How do variations interact (Half vs Full)? `(item_name, variation)` is the unique key — each variation has its own cost.
- [ ] Combo / meal items? Out of scope for v3. Treat as single line item with single cost.

---

## Definition of Done

- Items page accessible from sidebar
- Add / edit / delete works
- Import from sales history works
- Margin computed live and displayed correctly
- Profit card on dashboard reads `getCogsForPeriod` correctly
- Sales Analytics page shows margin column when data exists
- Empty state designed

````

---

# Spec — `expenses.md`

```markdown
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

| Card | Value | Sub |
|---|---|---|
| Total pending | ₹X,XX,XXX (28px mono bold) | "{N} bills awaiting approval" |
| Overdue | N (28px in `--red`) | "Past their due date" |
| Auto-scanned this week | N (28px in `--green`) | "From Gmail · last sync {N} min ago" |

### Gmail Scan banner

If Gmail connected — blue-tinted banner:
> **Gmail scan active** · Watching billing@, accounts@, invoice@ aliases on rohan@steadystride.in
> [Sync now] [Add manually]

If Gmail not connected — amber:
> Connect Gmail to auto-detect bills [Connect →]

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
````

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

````

---

# Spec — `dashboard-v3.md`

```markdown
# Feature: Dashboard v3

**Status:** Final draft — for v3 implementation
**Module priority:** #1 (rebuild)
**Who uses it:** partners (full), managers (own outlet)
**Last updated:** 2026-05-08
**Supersedes:** sales-dashboard.md (v1, archived), sales-dashboard-v2.md (v2, archived)
**Visual reference:** `docs/design-exports/dashboard.jsx`

---

## Why v3 Exists

v2 was thoughtful but didn't earn daily use. The walkthrough surfaced that partners want a **morning briefing** more than a data console — opening with a clear narrative of yesterday vs typical, then drilling down with metrics that tie to investor-relevant numbers (profit, ROI, recovery pace).

v3 redesigns around this narrative arc and adds three things v2 didn't have:
- **Morning Check hero** with templated narrative
- **Investment Recovery tracker** (critical for franchise operators)
- **Profit / margin** as first-class metrics throughout

---

## Layout — 9 Sections, Top To Bottom

Single scrollable page, desktop-first (max-width 1480px). Mobile responsive at 375px stacks vertically.

### Section 1 — Page Header

Standard design-system page header:
- **Eyebrow:** `MAY 5, 2026 · TUESDAY MORNING` (uppercase, accent color, dynamic to current date)
- **Title:** `Good morning, {first_name}.` (Instrument Serif italic, 44px)
- **Subtitle:** "Here's how {outlet_name} is moving versus its own day-of-week baseline. {alert_count} things need a look."
- **Actions (top-right):** Outlet selector dropdown · Export button · "Open ingest" primary button

### Section 2 — Morning Check Hero Card

Two-column dark card (`--ink` background, `--paper` text, `--accent` for emphasis).

**Left column (1.6fr):**
- Eyebrow with accent dot: `● Morning check · Yesterday vs typical {DOW}`
- Big serif headline (Instrument Serif italic, 46px):
  > "Yesterday landed **{deltaPct}%** above your average {DOW}."
- **Sub-paragraph (templated SQL — NO LLM in v3):**

  Template: `"₹{yesterday_sales} on {yesterday_orders} orders. {top_channel_phrase}; {bottom_channel_phrase}. {aov_phrase}."`

  Where:
  - `top_channel_phrase` — "{Channel} carried the day" if it had > 40% share; else "Even split across channels"
  - `bottom_channel_phrase` — "{Channel} take-home was thin again" if a channel's net% < 80; else "All channels reconciled clean"
  - `aov_phrase` — "AOV is up" / "AOV is flat" / "AOV is soft" based on vs-DOW delta

- 4-metric strip separated by vertical lines:
  - **Sales** · ₹14,235 · "+12.4% vs DoW avg"
  - **Orders** · 27 · "{dine_in} dine-in · {delivery} delivery"
  - **AOV** · ₹527 · "+₹42 vs typical"
  - **Repeat** · 23% · "{N} returning"

**Right column (1fr) — "Three things to look at":**

A list of up to 3 alerts:
- Two-digit mono number (`01`, `02`, `03`)
- Bold title + one-sentence body
- Right-arrow icon
- Tone color (`--red` or `--amber`)
- Click → navigate to relevant page

**Alert detection rules (deterministic, evaluated server-side, ranked by severity):**

| Type | Condition | Tone |
|---|---|---|
| Inventory critical | `inventory_items.current_stock <= reorder_level` AND used in past 7 days | red |
| Inventory low | Same with `current_stock <= reorder_level * 1.5` | amber |
| Item trend dropping | Top-10 item with 7d sales < 0.85 × prior 7d sales | red |
| Ingest failed | Any run in `failed` state in last 24h | red |
| Ingest needs review | Any run in `partial` or `needs_review` state | amber |
| Channel anomaly | Any channel > 30% deviation from DoW baseline | amber |
| Bills overdue | `expenses.status = 'overdue'` | red |

If 0 alerts: "Nothing urgent. ✓" with checkmark in `--green`.

### Section 3 — Top Stat Strip (5 tiles)

Horizontal row of 5 cards. Each:
- Stat label (uppercase, muted, small)
- Value (26px, mono, tabular-nums, weight 600)
- Delta chip (green ▴ or red ▾)
- Comparison subtitle ("vs prior 30-day window") muted small
- Sparkline (36px tall, full card width, color matches delta)

| # | Label | Value | Empty state |
|---|---|---|---|
| 1 | Sales · {period} | ₹X,XX,XXX | always available |
| 2 | Net profit | ₹X,XX,XXX | "—" if inventory or expenses missing |
| 3 | Profit margin · daily | XX.X% | **"—" if no inventory costs** |
| 4 | Orders | N | always available |
| 5 | Avg order value | ₹XXX | always available |

**Profit margin tile empty state:**
- Value: `—`
- Sparkline: hidden
- Below: small inline link `Configure inventory →` linking to `/inventory`
- Comparison subtitle: "Add cost-to-prepare to see margin"

**Period selector** lives in page-header actions row. Quick picks: `7d | 30d | 90d | YTD`. Default: `30d`.

### Section 4 — Investment Recovery Tracker

(See `outlet-investments.md` spec above for the data model.)

Two-column card:

**Left (1.4fr):**
- Eyebrow: `INVESTMENT RECOVERY`
- Pill on right: `Opened {opened_on}`
- Big serif headline:
  > "**{recoveredPct}%** recovered. **{months}** months to break even at this pace."
- Sub-line: `₹{invested} invested · ₹{recovered} recovered · ₹{remaining} to go.`
- Progress bar (14px), gradient `--ink → --accent`, with tick marks at 0/50%/100%
- 3-stat strip: `Last 30d profit` · `Projected break-even` · `Pace vs plan`

**Right (1fr) — Monthly recovery chart:**
- 12 vertical bars — `--ink` for positive, `--red` for negative
- Overlay accent line connecting cumulative-recovery dots
- Footer: `Best month` · `Avg / month`

**Empty state:** "Set up investment tracking to see your break-even timeline. [Configure →]" linking to `/admin/outlets`.

### Section 5 — Big Trend Chart

Single full-width card with rich controls.

**Top control bar:**
- Left: `Trend` card title + larger title showing current selection
- Right (segmented controls):
  - **Metric:** `Sales | Profit | Orders | AOV | Repeat`
  - vertical divider
  - **Breakdown:** `All days | Weekdays | Weekends`
  - vertical divider
  - **Period:** `7d | 30d | 90d | YTD`

**Below controls:**
- Legend: `▬ This period` · `┄ Previous period` · `┄ Profit % (right axis)` · `■ Weekend`
- Right side: Compare segmented `Prev period | Prev year | Off`

**The chart (260px):**
- Sales / AOV / Profit → bar chart
- Orders / Repeat → line/area chart
- Weekend bars get `--accent` tint
- Compare on → faded prior-period overlay
- Profit % overlay → accent dashed line on right Y-axis (only when metric ∈ {Sales, Orders})

### Section 6 — DoW Pattern + Hourly Rush

**Left card (5/12) — Day-of-week pattern:**
- Title: `Day-of-week pattern`
- Sub: "Average sales per weekday across the last 30 days"
- 7 vertical bars (Sun-Sat), height ∝ avg sales
  - Best DoW = `--accent`
  - Other weekdays = `--ink`
  - Weekends (non-best) = `--ink-2`
- Above each bar: amount in lakhs ("₹1.4L")
- Insight banner: "**{best_day}s** are your strongest day, averaging **+{pct}%** over {worst_day}s."

**Right card (7/12) — Hourly rush — yesterday vs typical:**
- Title: `Hourly rush — yesterday vs typical`
- Sub: "Order density by hour. Red dots mark unusually quiet hours."
- Custom SVG (180px): vertical line + dot per hour for yesterday; dashed horizontal at typical-DoW; red dot if value < typical × 0.85
- Top-right overlay: "Peak: {peak_label} · {peak_orders}/hr"

### Section 7 — Channel Mix + Channel Trend

**Left card (5/12) — Channel mix · take-home:**
- Donut (180px) with center label: total sales + sub `LAST 30 DAYS`
- Right of donut: list of channels:
  - Color square + name + `XX%` share + **`XX% net`** color-coded (green ≥95, amber 80-94, red <80, "—" if no settlement)

**Right card (7/12) — Channel trend:**
- Stacked bar chart (200px) — daily sales by channel
- Below: 4 mini-cards (one per channel) with name, % share, sparkline (20px)

### Section 8 — Top Items + Customer Movement

**Left card (7/12) — Sales by item · top 8:**
- Action button: `All items →` (links to `/sales`)
- Columns: Item · Units · Revenue · Profit · vs prev · Trend
- **Profit logic:** revenue − (qty × cost_to_prepare); shows "—" with "Set cost" link if cost not configured

**Right card (5/12) — Customer movement:**
- 2×2 grid of mini-tiles (4 segments — names from `customer_segment_definitions`):
  - {Segment 1} · count · delta (color: `--blue`)
  - {Segment 2} · count · delta (color: `--green`)
  - {Segment 3} · count · delta this week (color: `--red`)
  - {Segment 4} · count · delta (color: `--accent`)
- Divider
- 30-day repeat heatmap (custom SVG, 120px) — rows = weeks, cols = days, cell darkness = repeat count

### Section 9 — Discount Performance + Payment Methods

**Left card (6/12) — Discount performance:**
- Top stats: `Discount cost` · ₹X.XL · "{pct}% of gross" + `Incremental orders` · +N
- List of coupons (4 max) with name, uses, cost, order lift %

**Right card (6/12) — Payment methods · yesterday:**
- Donut (150px) — center: yesterday's gross + sub `GROSS`
- Right: methods list (UPI / Card / Cash / Wallet) with %, abs amount
- Insight banner: "{method} share is up **{pct}pp** month-over-month."

---

## Data Model Changes

### Customer segment definitions (configurable per outlet)

```sql
CREATE TABLE public.customer_segment_definitions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id       uuid NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  slot            int NOT NULL CHECK (slot BETWEEN 1 AND 4),
  name            text NOT NULL,
  color_token     text NOT NULL,
  rule_type       text NOT NULL,
  rule_params     jsonb NOT NULL,
  display_order   int NOT NULL DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (outlet_id, slot)
);
````

**Rule types and params:**

- `first_seen_within_days` — `{ "days": 30 }`
- `order_count_in_window` — `{ "min_orders": 5, "window_days": 90 }`
- `lapsed_from_segment` — `{ "previously_in_slot": 4, "silent_for_days": 30 }`
- `returning_at_least_n` — `{ "min_orders": 2, "last_seen_within_days": 30 }`

**Default seed values per outlet:**
| Slot | Name | Color | Rule |
|---|---|---|---|
| 1 | New customers | `--blue` | `first_seen_within_days {days: 30}` |
| 2 | Returning | `--green` | `returning_at_least_n {min: 2, window: 30}` |
| 3 | Lapsed regulars | `--red` | `lapsed_from_segment {previously_in_slot: 4, silent_for_days: 30}` |
| 4 | Champions | `--accent` | `order_count_in_window {min: 5, window: 90}` |

---

## Server Actions

```typescript
// Section 1
getDashboardHeader(outletId: string): Promise<{
  asOf: Date;
  outletName: string;
  partnerFirstName: string;
  alertCount: number;
}>;

// Section 2
getMorningCheck(outletId: string): Promise<{
  yesterday: {
    date: string; dowLabel: string;
    salesPaise: bigint; orders: number; aovPaise: bigint;
    repeatPct: number; dineInOrders: number; deliveryOrders: number;
  };
  dowAvg: { salesPaise: bigint; orders: number; aovPaise: bigint; weeksOfHistory: number };
  deltaPct: number;
  narrativeSentence: string;          // SQL-templated
  alerts: Array<{
    id: string;
    tone: 'red' | 'amber';
    title: string;
    body: string;
    ctaPath: string;
    severity: number;
  }>;
}>;

// Section 3
getStatStrip(outletId: string, period: '7d' | '30d' | '90d' | 'ytd'): Promise<{
  sales: StatTile;
  netProfit: StatTile | null;
  profitMarginPct: StatTile | null;
  orders: StatTile;
  aov: StatTile;
}>;

type StatTile = {
  value: number;
  deltaPct: number;
  deltaDir: 'up' | 'down' | 'flat';
  comparisonLabel: string;
  sparkline: number[];
};

// Section 4 — see outlet-investments.md
getInvestmentRecovery(outletId: string): Promise<...>;

// Section 5
getTrend(outletId: string, opts: {
  metric: 'sales' | 'profit' | 'orders' | 'aov' | 'repeat';
  breakdown: 'all' | 'weekday' | 'weekend';
  period: '7d' | '30d' | '90d' | 'ytd';
  compare: 'prev_period' | 'prev_year' | 'none';
}): Promise<{
  primary: TrendPoint[];
  comparison: TrendPoint[] | null;
  profitPctOverlay: number[] | null;
}>;

// Section 6
getDowPattern(outletId: string, period: Period): Promise<{
  bars: Array<{ dow: number; label: string; avgSalesPaise: bigint }>;
  insight: string;
}>;
getHourlyRush(outletId: string, dayDate: string): Promise<{
  hours: Array<{ hour: number; label: string; yesterdayValue: number; typicalValue: number; isBelowBaseline: boolean }>;
  peakHourLabel: string;
  peakOrdersPerHour: number;
}>;

// Section 7
getChannelMix(outletId: string, period: Period): Promise<Array<{
  channel: string; sharePct: number; takeHomePct: number | null; salesPaise: bigint; color: string;
}>>;
getChannelTrend(outletId: string, period: Period): Promise<{
  daily: Array<{ date: string; segments: Array<{ channel: string; salesPaise: bigint }> }>;
  perChannel: Array<{ channel: string; sharePct: number; sparkline: number[] }>;
}>;

// Section 8
getTopItems(outletId: string, period: Period, limit: number): Promise<Array<{
  itemName: string; category: string; units: number; revenuePaise: bigint;
  profitPaise: bigint | null; marginPct: number | null;
  changePct: number; sparkline: number[];
}>>;
getCustomerMovement(outletId: string, period: Period): Promise<{
  segments: Array<{
    slot: number; name: string; colorToken: string;
    count: number; deltaLabel: string; deltaDir: 'up' | 'down' | 'flat';
  }>;
  repeatHeatmap: Array<{ date: string; dow: number; repeatCount: number }>;
  insightSentence: string;
}>;

// Section 9
getDiscountPerformance(outletId: string, period: Period): Promise<{
  totalDiscountPaise: bigint;
  pctOfGross: number;
  incrementalOrders: number;
  topCoupons: Array<{ name: string; uses: number; costPaise: bigint; orderLiftPct: number; isActive: boolean }>;
}>;
getPaymentMix(outletId: string, dayDate: string): Promise<{
  totalGrossPaise: bigint;
  methods: Array<{ name: string; sharePct: number; absPaise: bigint; color: string }>;
  insight: string;
}>;
```

---

## UI Component Tree

```
apps/web/app/(app)/dashboard/
├── page.tsx
├── loading.tsx
├── error.tsx
└── _components/
    ├── DashboardHeader.tsx
    ├── PeriodSelector.tsx
    ├── MorningCheckHero.tsx                 ← Section 2
    │   ├── MorningCheckHeadline.tsx
    │   ├── MorningCheckMetricStrip.tsx
    │   └── MorningCheckAlerts.tsx
    ├── StatStrip.tsx                        ← Section 3
    │   ├── StatTile.tsx
    │   └── Sparkline.tsx
    ├── InvestmentRecoveryCard.tsx           ← Section 4
    ├── TrendChart.tsx                       ← Section 5
    │   ├── TrendControls.tsx
    │   ├── TrendBarChart.tsx
    │   └── TrendLineChart.tsx
    ├── DowPatternCard.tsx                   ← Section 6 left
    ├── HourlyRushCard.tsx                   ← Section 6 right
    ├── ChannelMixCard.tsx                   ← Section 7 left
    ├── ChannelTrendCard.tsx                 ← Section 7 right
    ├── TopItemsCard.tsx                     ← Section 8 left
    ├── CustomerMovementCard.tsx             ← Section 8 right
    │   ├── SegmentTile.tsx
    │   └── RepeatHeatmap.tsx
    ├── DiscountPerformanceCard.tsx          ← Section 9 left
    └── PaymentMixCard.tsx                   ← Section 9 right
```

---

## Sub-Phases

| #                                      | Sections | Effort |
| -------------------------------------- | -------- | ------ |
| 1 — Frame + Morning Check              | 1, 2     | 1.5 d  |
| 2 — Stat strip + Trend chart           | 3, 5     | 1.5 d  |
| 3 — Investment Recovery + DoW + Hourly | 4, 6     | 1.5 d  |
| 4 — Channels + Items + Customers       | 7, 8     | 1 d    |
| 5 — Discount + Payment                 | 9        | 1 d    |

---

## Empty States

| Section                | When                       | What renders                                                                    |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------- |
| 2                      | No data                    | "Connect your data to see your morning check. [Go to Ingest →]"                 |
| 2                      | < 4 weeks history          | "Building DOW baseline (X of 4 weeks)."                                         |
| 3 — Profit margin tile | No inventory costs         | "—" + "Configure inventory →"                                                   |
| 3 — Net profit tile    | No expenses + no inventory | "—" + "Track expenses →"                                                        |
| 4                      | No investment configured   | "Set up investment tracking [Configure →]"                                      |
| 5                      | No data in period          | Empty chart with "No data for selected period"                                  |
| 6 — Hourly rush        | < 2 weeks of same DoW      | "Building rush pattern. {N} of 4 weeks of {DOW} history."                       |
| 8 — Top items          | No `sales_line_items`      | "Item-level data not available. Upload Item Wise Bill Report. [Go to Ingest →]" |
| 9 — Discount           | No coupon data             | "No discounts ran in this period."                                              |

---

## Definition of Done

- All 9 sections render with real data
- Mobile responsive at 375px
- Period selector controls all relevant sections
- Empty states designed for each
- Profit margin tile gracefully shows "—" until inventory configured
- Customer segments use values from `customer_segment_definitions` table
- p50 dashboard load < 2.5s with 90 days of data

````

---

# Spec — `sales-analytics.md`

```markdown
# Feature: Sales Analytics (Deep-Dive Page)

**Status:** Final draft — for v3
**Module priority:** #2 (after dashboard-v3)
**Who uses it:** partners (full), managers (own outlet)
**Last updated:** 2026-05-08
**Related:** dashboard-v3 (entry points), customer-intelligence, inventory

---

## Overview

A dedicated `/sales` page for deep sales analytics. Where the dashboard is for the 30-second answer, this is for the 5-minute investigation. Linked from every dashboard tile and item bar.

---

## User Stories

- As a partner, I drill into the dashboard's "Revenue" tile and see daily revenue table with new vs returning customer split
- As a partner, I click any item on the dashboard's item chart and see that item's daily trend, channel mix, and margin contribution
- As a partner, I see an hourly heatmap of revenue by day-of-week to plan staffing
- As a partner, I see channel economics in full detail (gross / commission / fees / promo / net)

---

## Scope

### In scope

- **Section 1 — Daily summary table:** one row per day with revenue, orders, AOV, new/repeat split, discount %
- **Section 2 — Item analysis:** filterable, sortable item table with sparklines and margin column
- **Section 3 — Hourly heatmap:** rows = hours, columns = DoW, color = revenue intensity
- **Section 4 — Channel economics:** full per-channel table
- Same period selector + comparison toggle as dashboard
- URL-based filters (`?metric=revenue&item=Tandoori+Chicken`) for deep-link

### Out of scope

- Customer-level drill-down (lives on `/customers`)
- Forecasting / predictions
- Cohort analysis (deferred)

---

## Pages & Routes

| Route | Component | Auth |
|---|---|---|
| `/sales` | `app/(app)/sales/page.tsx` | partner+manager |

URL params:
- `?period=7d` (or `30d`, `mtd`, `custom&start=...&end=...`)
- `?compare=true`
- `?metric=revenue|orders|aov|repeat`
- `?item=ItemName`

---

## UI Layout

**Page header:** Period selector + Compare toggle in top-right.

**Section 1 — Daily Summary:**
- Table: Date · DoW · Revenue · Orders · AOV · New customers · Repeat customers · Discount %
- Sortable columns
- Best day highlighted green, worst day red
- Footer row: totals + averages

**Section 2 — Item Performance:**
- Filter row: Category dropdown · Channel dropdown · Search
- Table: Item · Category · Qty · Revenue · Avg price · % of total · Margin (if inventory data) · 7-day sparkline
- Click any row → expands inline to show daily trend chart
- Sortable

**Section 3 — Hourly Heatmap (full width):**
- Grid: 13 rows (11:00 to 23:00) × 7 columns (Mon-Sun)
- Cell shows revenue (color intensity scaled to max in grid)
- Hover: exact revenue, order count, AOV
- Toggle: Revenue / Order count / AOV

**Section 4 — Channel Economics:**
- Table: Channel · Orders · Gross · Commission · Fees · Promo · Net · Net per ₹100 · Settlement status
- Unsettled rows show `—`
- Footer: totals + weighted average net per ₹100
- "Take-home leak" callout — channel with biggest gross→net delta

---

## Server Actions

```typescript
getDailySummary(outletId: string, period: Period): Promise<DailySummaryRow[]>;

getItemPerformance(
  outletId: string,
  period: Period,
  filters: { category?: string; channel?: string; search?: string }
): Promise<ItemPerformanceRow[]>;

getItemDailyTrend(outletId: string, period: Period, itemName: string): Promise<DailyItemRow[]>;

getHourlyHeatmap(
  outletId: string,
  period: Period,
  metric: 'revenue' | 'orders' | 'aov'
): Promise<HeatmapCell[]>;

getChannelEconomicsDetail(outletId: string, period: Period): Promise<ChannelEconomicsRow[]>;
````

---

## UI Components

```
apps/web/app/(app)/sales/
├── page.tsx
├── _components/
│   ├── DailySummaryTable.tsx
│   ├── ItemPerformanceTable.tsx
│   ├── ItemTrendInline.tsx
│   ├── HourlyHeatmap.tsx           ← custom SVG
│   └── ChannelEconomicsTable.tsx
```

---

## Open Questions

- [ ] Heatmap color scale — relative (% of max in this view), with the max value labeled
- [ ] Item drill-down — inline expansion to keep context

---

## Definition of Done

- Page renders all four sections
- Period selector works and persists in URL
- Dashboard click-throughs deep-link correctly
- Compare mode overlays prior period
- Heatmap is readable on a 13" laptop (no horizontal scroll)

````

---

# Spec — `admin.md`

```markdown
# Feature: Admin

**Status:** Final draft — for v3
**Module priority:** #6
**Who uses it:** partners only
**Last updated:** 2026-05-08
**Related:** gmail-auto-ingest (Gmail config moves here), outlets, expenses, dashboard-v3
**Visual reference:** `docs/design-exports/admin.jsx`

---

## Overview

A consolidated admin panel for system configuration. Centralizes Gmail config, partner management, outlet config (incl. investment tracking), customer segment definitions, expense category definitions, data export, and activity log.

---

## User Stories

- As a partner, I connect/reconnect/disconnect Gmail for any outlet
- As a partner, I see Gmail sync history and any errors
- As a partner, I invite a new partner or manager via email
- As a partner, I change someone's role or remove access
- As a partner, I configure each outlet's Petpooja code, timezone, hours, AND investment data
- As a partner, I configure customer segments (the 4 tiles on the dashboard)
- As a partner, I configure expense categories per outlet
- As a partner, I export all of an outlet's data to CSV

---

## Pages & Routes

| Route | Component | Auth |
|---|---|---|
| `/admin` | redirects to `/admin/integrations` | partner only |
| `/admin/integrations` | `app/(app)/admin/integrations/page.tsx` | partner only |
| `/admin/team` | `app/(app)/admin/team/page.tsx` | partner only |
| `/admin/outlets` | `app/(app)/admin/outlets/page.tsx` | partner only |
| `/admin/customer-segments` | `app/(app)/admin/customer-segments/page.tsx` | partner only |
| `/admin/expense-categories` | `app/(app)/admin/expense-categories/page.tsx` | partner only |
| `/admin/data` | `app/(app)/admin/data/page.tsx` | partner only |
| `/admin/activity` | `app/(app)/admin/activity/page.tsx` | partner only |

Sub-navigation tabs: `Integrations · Team · Outlets · Segments · Categories · Data · Activity`

---

## Tab — Integrations

For each outlet:
- **Gmail card:**
  - Status: Connected (green) / Needs reconnect (amber) / Not connected (grey)
  - Connected email address
  - Last sync: relative time + result
  - Token expiry warning if < 7 days
  - Watched aliases (pills, editable)
  - Auto-approve threshold setting (₹ input)
  - Sync frequency dropdown (Every 15min / Hourly / Daily)
  - Buttons: Connect / Reconnect / Disconnect · Test connection · Re-scan last 30 days

- **Petpooja card:**
  - Mapping code (read-only display + Edit button)
  - API status: not configured / configured / error

---

## Tab — Team

Table: Avatar · Name · Email · Role · Outlets · Last login · Actions
- "+ Invite member" button → modal with email + role + outlet selection
- Per-row actions: Change role · Remove access (with confirmation)

---

## Tab — Outlets

For each outlet, a card with:
- Name, brand, address, phone, hours, timezone, mapping code
- **Investment tracking sub-section:**
  - `Opened on` — date picker
  - `Total invested` — currency input (₹)
  - `Projected break-even date` — date picker (optional)
  - "Save" button → calls `configureInvestment`
  - "Clear" link → calls `clearInvestment`
  - Live preview: "If you save this, your investment recovery card will show: {recoveredPct}% recovered, {months} months to break even."

---

## Tab — Customer Segments (`/admin/customer-segments`)

Per-outlet configuration of the 4 segment tiles shown on Dashboard Section 8.

UI:
- Outlet selector at top
- 4 segment cards in a row (Slot 1-4), each:
  - Color picker (token list: accent, blue, green, red, violet, amber)
  - Name (text input)
  - Rule type dropdown (4 options)
  - Rule param fields (change based on rule type)
  - Live preview: "{count} customers currently match this rule"

Rule types:
1. `first_seen_within_days` — params: `days`
2. `order_count_in_window` — params: `min_orders`, `window_days`
3. `lapsed_from_segment` — params: `previously_in_slot`, `silent_for_days`
4. `returning_at_least_n` — params: `min_orders`, `last_seen_within_days`

Server actions:
- `listSegmentDefinitions(outletId)`
- `updateSegmentDefinition(id, input)`
- `previewSegmentMatchCount(outletId, ruleType, params)` → number

---

## Tab — Expense Categories (`/admin/expense-categories`)

Per-outlet configuration of categories shown on `/expenses`.

UI:
- Outlet selector at top
- Drag-to-reorder list of active categories
- Each row: color picker, name input, "Active" toggle, "Set budget" link
- "+ Add category" button at bottom
- Inactive categories shown in collapsed section below

---

## Tab — Data

- "Export sales data" button → date range picker → downloads CSV
- "Export expenses" / "Export customers" / "Export inventory" buttons
- **Danger zone** (collapsed):
  - "Reset all data for outlet X" — multi-step confirmation, requires typing outlet name

---

## Tab — Activity

- Table: Timestamp · User · Action · Target · Details
- Filterable by user, action type, date range
- Last 90 days only

---

## Data Model

```sql
CREATE TABLE public.activity_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id   uuid REFERENCES public.outlets(id),
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  action      text NOT NULL,
  target_type text,
  target_id   uuid,
  details     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_outlet_time ON public.activity_log (outlet_id, created_at DESC);
CREATE INDEX idx_activity_user_time ON public.activity_log (user_id, created_at DESC);

-- Daily purge cron deletes rows older than 90 days
````

---

## Server Actions

```typescript
// Integrations
connectGmail(outletId: string): Promise<{ authUrl: string }>;
disconnectGmail(outletId: string): Promise<void>;
syncGmailNow(outletId: string): Promise<{ jobId: string }>;
getGmailSyncHistory(outletId: string, limit: number): Promise<SyncHistoryRow[]>;

// Team
inviteMember(email: string, role: 'partner' | 'manager', outletIds: string[]): Promise<void>;
changeRole(userId: string, role: 'partner' | 'manager'): Promise<void>;
removeAccess(userId: string): Promise<void>;

// Outlets
updateOutletConfig(outletId: string, config: OutletConfigInput): Promise<Outlet>;
configureInvestment(outletId: string, input: { openedOn: Date; totalInvestedPaise: bigint; projectedBreakevenDate?: Date }): Promise<void>;
clearInvestment(outletId: string): Promise<void>;

// Customer segments
listSegmentDefinitions(outletId: string): Promise<SegmentDefinition[]>;
updateSegmentDefinition(id: string, input: Partial<SegmentDefinition>): Promise<SegmentDefinition>;
previewSegmentMatchCount(outletId: string, ruleType: string, params: object): Promise<number>;

// Expense categories
listCategories(outletId: string): Promise<ExpenseCategory[]>;
createCategory(outletId: string, input: { name: string; colorToken: string }): Promise<ExpenseCategory>;
updateCategory(id: string, input: Partial<ExpenseCategory>): Promise<ExpenseCategory>;
deactivateCategory(id: string): Promise<void>;
reorderCategories(outletId: string, orderedIds: string[]): Promise<void>;

// Data
exportData(outletId: string, dataset: 'sales' | 'expenses' | 'customers' | 'inventory', period: Period): Promise<{ downloadUrl: string }>;
resetOutletData(outletId: string, confirmationName: string): Promise<void>;

// Activity
getActivityLog(filters: ActivityFilters, page: number): Promise<PaginatedActivity>;
```

---

## Open Questions

- [ ] Invite flow — Google SSO only (matches current auth)
- [ ] Activity log — log everything that mutates state
- [ ] Reset outlet data — clear data only; outlet remains

---

## Definition of Done

- All seven tabs accessible
- Gmail config moved from `/ingest` to `/admin/integrations`; old location redirects
- Member invite + role change works end-to-end
- Investment tracking configurable
- Customer segments and expense categories editable
- Activity log auto-populates on key actions
- Data export downloads valid CSVs

````

---

# Spec — `ingest-ux-v3.md`

```markdown
# Feature: Ingest Page UX v3

**Status:** Final draft — for v3
**Module priority:** #7 (parallel to other v3 work)
**Who uses it:** partners (full), managers (own outlet, manual upload)
**Last updated:** 2026-05-08
**Related:** ingestion-framework, gmail-auto-ingest, petpooja-daily-ingestion, admin

---

## Why

The ingest page works but feels untidy:
- No way to delete multiple runs at once
- No archive — runs accumulate forever
- No pagination — all runs render in DOM
- Gmail config mixed with run list (now moves to `/admin`)
- No way to see details of a specific run inline

Pure UX cleanup. No data model changes.

---

## User Stories

- As a partner, I select multiple ingest runs with checkboxes and delete in one action
- As a partner, I see a paginated run list (25/page) so the page loads fast
- As a partner, I archive old runs to clean up the default view
- As a partner, I click any run to see file details, parsed rows preview, and errors — without leaving the page
- As a partner or manager, I see a small Gmail status indicator on `/ingest` (read-only, link to `/admin`)

---

## Scope

### In scope

- Multi-select checkbox column on runs table
- "Delete selected" / "Archive selected" / "Re-ingest selected" bulk actions
- Pagination (25 per page) with page controls
- Archive tab alongside All / Manual / Auto-synced / Backfill
- Run detail panel (slide-out drawer or inline expansion)
- Gmail status pill on the page (read-only, link to `/admin`)

### Out of scope

- Schema changes (existing soft-delete pattern handles archive logically)
- Editing parsed data (still requires re-ingest)
- Partial re-ingest

---

## Data Model

Add a single column to existing `ingest_runs`:

```sql
ALTER TABLE public.ingest_runs
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX idx_ingest_runs_archived ON public.ingest_runs (outlet_id, archived_at)
  WHERE deleted_at IS NULL;

-- Update existing active_ingest_runs view to filter:
--   archived_at IS NULL by default
-- Add a separate archived_ingest_runs view for the Archive tab.
````

A daily cron archives runs where:

- `created_at < now() - interval '90 days'`
- `archived_at IS NULL`
- `status IN ('committed', 'failed')`

---

## UI Changes

### Page header

Standard design-system header. Subtitle: "Upload Petpooja, Pine Labs, aggregator reports, and franchise P&L PDFs."

### Gmail status strip (small, above tabs)

Single-line pill:

- `Gmail · Connected · Last sync 2h ago` (green dot) → click → `/admin/integrations#gmail`
- `Gmail · Needs reconnect` (amber dot) → click → reconnect flow

### Tabs row

`All · Manual · Auto-synced · Backfill · Archived`

Counts in pills next to each tab name.

### Toolbar (above table)

- Search input (filename)
- Source dropdown (filter by source type)
- Date range
- Right side: bulk actions appear when ≥1 row selected
  - `Re-ingest (N)` · `Archive (N)` · `Delete (N)` · `Clear selection`

### Runs table

| Column   | Width | Notes                                                   |
| -------- | ----- | ------------------------------------------------------- |
| Checkbox | 40px  | Header has "select all on page"                         |
| File     | flex  | Filename + small source-type pill below                 |
| Source   | 160px | e.g., `petpooja_item_bill`                              |
| Rows     | 80px  | mono right-aligned                                      |
| Trigger  | 140px | Pill: Manual / Auto-synced / Backfill                   |
| Status   | 140px | LED dot + status text                                   |
| Uploaded | 160px | Relative time, exact on hover                           |
| Actions  | 60px  | "..." menu: View details · Re-ingest · Archive · Delete |

### Pagination

Bottom of table: `Showing 1–25 of 147 runs · ◀ ▶` plus page jump.

### Run detail drawer

Click any row → right-side drawer slides in (50% width on desktop, full width on mobile):

- File header: filename, size, source type, uploaded by, uploaded at
- Status section: parsed rows count, errors count, commit status
- Preview section: first 10 parsed rows in compact table
- Errors section (if any): list of row errors with line numbers
- Actions: Re-ingest · Download original · Archive · Delete · Close

---

## Server Actions

```typescript
bulkDeleteRuns(runIds: string[]): Promise<{ success: number; failed: number }>;
bulkArchiveRuns(runIds: string[]): Promise<{ success: number; failed: number }>;
bulkUnarchiveRuns(runIds: string[]): Promise<{ success: number; failed: number }>;
bulkReingestRuns(runIds: string[]): Promise<{ jobIds: string[] }>;

listRuns(
  outletId: string,
  filters: { tab: 'all' | 'manual' | 'auto' | 'backfill' | 'archived'; source?: string; search?: string; dateRange?: [Date, Date] },
  page: number,
  pageSize: number
): Promise<PaginatedRuns>;

getRunDetail(runId: string): Promise<RunDetail>;
```

---

## Migration Note

When this ships:

1. Existing Gmail config UI on `/ingest` is removed
2. Redirect from any old Gmail-related sub-route → `/admin/integrations`
3. Small toast on first visit: "Gmail config moved to Admin → Integrations"

---

## Definition of Done

- Multi-select + bulk actions work
- Pagination works
- Archive tab works; daily cron archives 90+ day runs
- Run detail drawer renders correctly
- Gmail config redirected to `/admin`
- All on mobile at 375px+

````

---

# Patches To Existing Specs

These are surgical text additions to existing specs. Paste each block into the relevant existing file.

---

## Patch: Top of `outlets.md`, `outlet-photos.md`, `employees.md`, `contractors.md`

Add this single line right below the existing status header:

> **Status update (2026-05-08):** v2.1 shipped. Visual layer inherits from `design-system.md` v3 — no per-spec changes needed.

---

## Patch: Top of `sales-ingestion.md`

Add after Status header:

> **Status update (2026-05-08):** v2.1 shipped. Item-level ingestion is live.
> **Cross-references for v3:**
> - Per-item revenue feeds the `inventory.md` margin calculations.
> - P&L line items propagate to `expenses.md` (see "Integration with Expenses" in `pnl-ingestion.md`).

---

## Patch: Top of `customer-intelligence.md`

Add after Status header:

> **Status update (2026-05-08):** v2.1 shipped. Customer identity unification across Pine Labs UPI, aggregators, and Petpooja is live.
> **v3 visual update:** Customer detail page adopts the design-system v3 tokens. Customer list page sidebar nav remains in MAIN section.

---

## Patch: Add new section to `pnl-ingestion.md` (before Open Questions)

```markdown
## Integration with Expenses Module (v3)

When a P&L PDF is committed, line items mapped to operating-expense
categories propagate as rows in the `expenses` table:

- For each line item with category in {rent, salaries, utilities,
  marketing, logistics, maintenance, franchise_fee, other}:
  - Upsert an `expenses` row keyed by `(outlet_id, source_pnl_period, category, subcategory)`
  - `source = 'petpooja_pnl'`
  - `status = 'paid'`
  - `paid_date = pnl_period_end`
  - `description = "<category> · <pnl_period_label>"` (e.g., "Rent · Mar 2026")

This avoids partners manually re-entering rent, utilities, etc. that
already appear on the P&L. Manual entries with overlapping date ranges
are not affected — they coexist with the P&L-derived rows.

Implementation:
- `apps/web/app/api/pnl/commit/route.ts` calls `propagateToExpenses(pnlId)`
  after successful commit
- `propagateToExpenses` is idempotent — re-running on the same P&L
  upserts the same rows
````

---

## Patch: Add new section to `gmail-auto-ingest.md` (after existing Phase 1 content)

````markdown
## Phase 2 — Invoice Scanning (v3)

The same Gmail watch that pulls Petpooja reports also scans incoming
emails for vendor invoices. Detected invoices create rows in the
`expenses` table with `status='auto_scanned'` (or `needs_review` if
extraction confidence is low). Partners review and confirm in the
"Pending bills" tab on `/expenses`.

### Detection rules

An email is a candidate invoice if:

1. Subject contains any of: `invoice`, `bill`, `payment due`, `receipt`, `tax invoice`
2. AND has a PDF or image attachment
3. AND was not already processed (dedupe by Gmail message id)

#### LPG / commercial gas bills

Commercial LPG / gas billing emails are explicitly in scope for v3. A
message should be treated as a gas-bill candidate when either:

1. The subject contains terms like `lpg`, `gas`, `commercial bill`, or
   `gas invoice`
2. OR the attachment text contains signals such as `LPG COMMERCIAL GAS
INVOICE`, `Bill Due Date`, `Meter No`, `Monthly Consumption`, or
   `NET PAYABLE AMOUNT`

Example subject:

`LPG commercial bill for Gabru Di Chaap`

For text-based PDFs, extraction should read the attachment contents
directly before falling back to subject-only heuristics.

### Extraction (OCR + LLM-assisted)

For each candidate:

1. Download the attachment to Supabase Storage
2. If the PDF already contains machine-readable text, extract that text
   directly first
3. Otherwise, or for image/photo uploads, run multimodal OCR-style
   extraction using an OpenAI vision-capable model
4. Ask for strict structured JSON with: vendor_name, total_amount,
   tax_amount, invoice_date, due_date, period_label, for_item,
   description
5. Persist the original document path so the same extraction helper can
   later be reused for manual bill-photo uploads
6. If extraction is high-confidence (all required fields parseable),
   create the `expenses` row directly with `extraction_confidence` recorded
7. If extraction fails or has missing fields, create a minimal row
   with vendor_name=email_sender, total_amount=null,
   description=email_subject, needs_review=true

#### Structured fields for gas bills

When the attachment is a gas bill, the extractor should attempt to fill:

- `vendor_name`
- `total_amount`
- `tax_amount`
- `invoice_date`
- `due_date`
- `period_label`
- `for_item` (brand / unit / outlet hint from the bill)
- `description` (human-readable summary including bill number or meter)

If present, these details are also useful to derive:

- bill number / invoice reference
- meter number
- reading period
- disconnection date

These do not require new schema columns in v3; they may be folded into
`description`, `period_label`, and `for_item`.

### Auto-approve threshold

If `extraction_confidence >= 90` AND `total_paise <= outlets.auto_approve_under_paise`:

- Status = `approved`

Else if `extraction_confidence >= 90`:

- Status = `auto_scanned` (needs partner click)

Else:

- Status = `needs_review` (low confidence, partner must edit)

### Server actions

```typescript
async function scanForInvoices(
  messageId: string,
  outletId: string
): Promise<{
  candidate: boolean;
  expenseId?: string;
  reason?: string;
}>;

async function extractInvoiceFields(attachmentUrl: string): Promise<InvoiceExtractionResult>;
```
````

### Limits

- Max 50 invoice candidates per sync run (avoid budget blowups)
- LLM extraction only on first attempt; partner edits in Needs Review
  if extraction is wrong

### UI surface

- New tab on `/expenses` called "Pending bills" with badge count
- Banner on `/expenses` if ≥5 invoices need review
- Gas bills should appear in Pending bills with amount, period, due
  date, vendor, and source-confidence visible without opening the row

````

---

## Patch: Top of `petpooja-daily-ingestion.md`

Add after Status header:

> **Status update (2026-05-08):** v2.1 shipped. Daily Petpooja ingestion via Gmail is live.
> **v3 navigation update:** Manual upload UI stays at `/ingest`. Gmail connection management moves to `/admin/integrations`. Internal API endpoints unchanged.

---

## Patch: Add new entries to `ingestion-framework.md` doctype registry

```markdown
| Doctype | Trigger | Source | Notes |
|---|---|---|---|
| `expense_propagation` | `pnl_committed` event | `petpooja_pnl` | Auto-creates expenses rows from P&L line items. See `pnl-ingestion.md` § "Integration with Expenses Module". |
| `gmail_invoice` | `gmail_message_received` | `gmail_scan` | LLM-extracted invoice → expenses row with `extraction_confidence`. See `gmail-auto-ingest.md` § "Phase 2 — Invoice Scanning". |
````

---

# `CLAUDE.md` v3 Status Block

Add this to your top-level `CLAUDE.md` (replacing any existing v3 status block):

```markdown
## v3 Status (as of 2026-05-08)

**Shipped (v2.1):**
Outlets, Outlet photos, Employees, Contractors, Sales ingestion (Petpooja, Pine Labs, Swiggy), Petpooja daily ingestion, Gmail auto-ingest Phase 1 (Petpooja reports), P&L ingestion, Customer intelligence, Dashboard v2 (being replaced).

**v3 in progress — implementation order:**

| #   | Phase                                                      | Spec                                          | Effort |
| --- | ---------------------------------------------------------- | --------------------------------------------- | ------ |
| 1   | Design System v3                                           | `design-system.md`                            | 1 d    |
| 2   | Outlet Investments schema + Admin UI                       | `outlet-investments.md`, `admin.md` § Outlets | 1 d    |
| 3   | Customer segment definitions schema + Admin UI             | `dashboard-v3.md`, `admin.md` § Segments      | 1 d    |
| 4   | Expense categories schema + Admin UI                       | `expenses.md`, `admin.md` § Categories        | 1 d    |
| 5   | Inventory module                                           | `inventory.md`                                | 3-4 d  |
| 6   | Dashboard sub-phase 1 — Frame + Morning Check              | `dashboard-v3.md` Sec 1, 2                    | 1.5 d  |
| 7   | Dashboard sub-phase 2 — Stat strip + Trend chart           | `dashboard-v3.md` Sec 3, 5                    | 1.5 d  |
| 8   | Expenses sub-phase 1 — Schema + Spend Overview             | `expenses.md` Tab 1                           | 1.5 d  |
| 9   | Expenses sub-phase 2 — Manual + Recurring                  | `expenses.md` Sub-phase 2                     | 1 d    |
| 10  | Dashboard sub-phase 3 — Investment Recovery + DoW + Hourly | `dashboard-v3.md` Sec 4, 6                    | 1.5 d  |
| 11  | Dashboard sub-phase 4 — Channels + Items + Customers       | `dashboard-v3.md` Sec 7, 8                    | 1 d    |
| 12  | Dashboard sub-phase 5 — Discount + Payment                 | `dashboard-v3.md` Sec 9                       | 1 d    |
| 13  | Sales Analytics deep-dive                                  | `sales-analytics.md`                          | 3 d    |
| 14  | Expenses sub-phase 3 — Pending Bills UI                    | `expenses.md` Tab 2                           | 1 d    |
| 15  | Admin module                                               | `admin.md`                                    | 3 d    |
| 16  | Ingest UX v3                                               | `ingest-ux-v3.md`                             | 2 d    |
| 17  | Expenses sub-phase 4 — Gmail invoice scanning              | `gmail-auto-ingest.md` Phase 2                | 2 d    |

**Total: ~28-30 days of Codex work across 17 phases.**

**Critical path notes:**

- Phases 2-4 (small schema migrations) MUST happen before phases that consume them.
- Phase 5 (Inventory) before Phase 7 (so profit margin renders).
- Phase 8 (Expenses Spend Overview) before Phase 10 (so profit calc has expenses).

**Build patterns (unchanged from v2.1):**

- One feature per Codex session
- Server actions for all data fetching
- RLS via `is_partner()` SQL helper
- Money in paise (bigint)
- Soft delete + 30-day purge
- Conventional commits
- Update CLAUDE.md after each merge

**Design language:** see `docs/features/design-system.md` v3 — coral accent `#ff5b3a`, paper/ink palette, Instrument Serif italic page titles, JetBrains Mono for numbers. Visual reference at `docs/design-exports/SteadyStrideOS_Redesign.html` and the JSX files alongside.
```

---

# Codex Phase Prompts

Paste these to Codex one phase at a time, in order.

### Phase 1 — Design System

```
Read docs/features/design-system.md and the CSS in docs/design-exports/SteadyStrideOS_Redesign.html.

Apply the v3 token set:
- Update globals.css with all CSS variables from the spec (light + dark)
- Update Tailwind config to expose tokens via theme.extend.colors
- Add Instrument Serif and JetBrains Mono via next/font (Inter is already present)
- Restructure sidebar into MAIN / MANAGE / SYSTEM sections per the spec
- Update PageHeader component to use eyebrow + serif title pattern
- Audit every existing page — replace any hardcoded colors with token references

Stop after the design system is applied — don't touch any feature pages yet.
Commit as `feat(design): v3 design system + sidebar restructure`.
```

### Phase 2 — Outlet Investments

```
Read docs/features/outlet-investments.md.

Implement:
- Add columns to outlets table: opened_on, total_invested_paise, projected_breakeven_date
- Create outlet_monthly_profit view per the spec (joins sales_orders, inventory_items, expenses)
- Implement getInvestmentRecovery server action — handle empty states (no config, < 1 month data, currently in loss)
- Implement configureInvestment and clearInvestment server actions
- Build the admin UI section in /admin/outlets for editing investment fields

Stop. Don't render anything on the dashboard yet — that comes in phase 10.
Commit as `feat(investments): outlet investment tracking schema + admin UI`.
```

### Phase 3 — Customer Segment Definitions

```
Read docs/features/dashboard-v3.md § Data Model — Customer segment definitions, and docs/features/admin.md § Tab — Customer Segments.

Implement:
- Create customer_segment_definitions table with the schema from the spec
- Seed default values for each existing outlet (4 segments per outlet) per the table in the spec
- Implement listSegmentDefinitions, updateSegmentDefinition, previewSegmentMatchCount server actions
- Build /admin/customer-segments page with the 4 cards layout, rule-type dropdown, params fields, and live count preview

Stop. Don't wire to dashboard yet — that comes in phase 11.
Commit as `feat(segments): configurable customer segments + admin UI`.
```

### Phase 4 — Expense Categories

```
Read docs/features/expenses.md § Data Model and docs/features/admin.md § Tab — Expense Categories.

Implement:
- Create expense_categories table with the schema from the spec
- Seed the 6 default categories for each existing outlet (Rent, Salaries, Utilities, Supplies, Marketing, Repairs)
- Implement listCategories, createCategory, updateCategory, deactivateCategory, reorderCategories server actions
- Build /admin/expense-categories page with drag-to-reorder list

Stop. Expenses module proper comes in phase 8.
Commit as `feat(expenses): configurable expense categories + admin UI`.
```

### Phase 5 — Inventory Module

```
Read docs/features/inventory.md.

Implement everything in the spec:
- inventory_items table + active_inventory_items view
- All routes (/inventory list, /inventory/new dialog, edit dialog, /inventory/import flow)
- All server actions including importFromSalesHistory and getCogsForPeriod
- Empty state designed
- Mobile responsive

Stop after inventory works end-to-end.
Commit as `feat(inventory): items master + cogs computation`.
```

### Phase 6 — Dashboard sub-phase 1 (Frame + Morning Check)

```
Read docs/features/dashboard-v3.md sections 1 and 2.

Implement:
- Page shell with header (eyebrow + serif title + outlet selector)
- Period selector (placeholder for now — wire in phase 7)
- MorningCheckHero card (dark ink card, two-column)
  - Left: serif headline with delta, templated narrative paragraph (NO LLM — use SQL templates), 4-metric strip
  - Right: "Three things to look at" alerts list
- Implement getDashboardHeader and getMorningCheck server actions
- Alert detection rules per the spec (deterministic SQL)
- Empty states (no data, < 4 weeks history)

Stop after this section ships. Other sections come in subsequent phases.
Commit as `feat(dashboard): v3 frame + morning check hero`.
```

### Phase 7 — Dashboard sub-phase 2 (Stat strip + Trend chart)

```
Read docs/features/dashboard-v3.md sections 3 and 5.

Implement:
- StatStrip with 5 tiles (Sales, Net profit, Profit margin %, Orders, AOV)
  - Each tile has value, delta, comparison label, sparkline (Recharts area mini-chart)
  - Profit margin tile shows "—" with "Configure inventory →" link if no inventory costs
- TrendChart card with all controls:
  - Metric segmented (5 options)
  - Breakdown segmented (3 options)
  - Period segmented (4 options)
  - Compare segmented (3 options)
  - Bar or line chart per metric type
  - Profit % overlay on right Y-axis when metric ∈ {Sales, Orders}
- getStatStrip and getTrend server actions

Stop. Investment Recovery comes next phase.
Commit as `feat(dashboard): v3 stat strip + trend chart`.
```

### Phase 8 — Expenses sub-phase 1 (Schema + Spend Overview)

```
Read docs/features/expenses.md, especially Data Model and Tab 1 — Spend Overview.

Implement:
- expenses, expense_budgets tables + expense_budget_summary view
- auto_approve_under_paise column on outlets
- /expenses page with Spend Overview tab as default
- Budget summary card (left) and By category card (right)
- Expense ledger card with All / Recurring / One-off filter
- listExpenses, getSpendOverview, listBudgets, upsertBudget server actions
- Read-only rendering (manual entry comes in next sub-phase)

Stop. Pending bills tab comes later.
Commit as `feat(expenses): schema + spend overview tab`.
```

### Phase 9 — Expenses sub-phase 2 (Manual + Recurring)

```
Read docs/features/expenses.md § Recurring Expense Logic and the addManualExpense / updateExpense / deleteExpense actions.

Implement:
- Add expense dialog (all fields per spec, validated with zod)
- Edit / delete actions
- Recurring expense template logic
- Daily cron (generateRecurringExpenses) that creates child rows from templates 7 days before due date

Stop.
Commit as `feat(expenses): manual entry + recurring expenses`.
```

### Phase 10 — Dashboard sub-phase 3 (Investment Recovery + DoW + Hourly)

```
Read docs/features/dashboard-v3.md sections 4 and 6.

Implement:
- InvestmentRecoveryCard (Section 4)
  - Two-column card per spec
  - Calls getInvestmentRecovery (already implemented in Phase 2)
  - Empty state if outlet not configured ("Configure →" link to /admin/outlets)
- DowPatternCard (Section 6 left) — 7 vertical bars + insight banner
- HourlyRushCard (Section 6 right) — custom SVG with dots + dashed baseline
- getDowPattern and getHourlyRush server actions

Stop.
Commit as `feat(dashboard): v3 investment recovery + dow + hourly`.
```

### Phase 11 — Dashboard sub-phase 4 (Channels + Items + Customers)

```
Read docs/features/dashboard-v3.md sections 7 and 8.

Implement:
- ChannelMixCard (Section 7 left) — donut + channels list with take-home %
- ChannelTrendCard (Section 7 right) — stacked bars + 4 mini-cards with sparklines
- TopItemsCard (Section 8 left) — top 8 items table with profit column (uses inventory_items costs)
- CustomerMovementCard (Section 8 right) — 4 segment tiles using customer_segment_definitions (configured in Phase 3) + repeat heatmap
- All corresponding server actions

Stop.
Commit as `feat(dashboard): v3 channels + items + customers`.
```

### Phase 12 — Dashboard sub-phase 5 (Discount + Payment)

```
Read docs/features/dashboard-v3.md section 9.

Implement:
- DiscountPerformanceCard (Section 9 left) — top stats + coupons list
- PaymentMixCard (Section 9 right) — donut + methods list + insight banner
- getDiscountPerformance and getPaymentMix server actions

Dashboard is now complete. Test all 9 sections end-to-end with real data.
Commit as `feat(dashboard): v3 discount + payment + complete`.
```

### Phase 13 — Sales Analytics

```
Read docs/features/sales-analytics.md.

Implement:
- /sales page with all 4 sections
- DailySummaryTable, ItemPerformanceTable (with inline drill-down), HourlyHeatmap (custom SVG, 13×7 cells), ChannelEconomicsTable
- URL params for deep-linking from dashboard tile click-throughs
- Period selector + Compare toggle synced with URL

Stop.
Commit as `feat(sales): deep-dive analytics page`.
```

### Phase 14 — Expenses sub-phase 3 (Pending Bills UI)

```
Read docs/features/expenses.md Tab 2 — Pending Bills.

Implement:
- Pending Bills tab on /expenses
- 3 summary cards (Total pending, Overdue, Auto-scanned this week)
- Gmail scan banner (read-only — Gmail integration comes in phase 17)
- Pending bills table with checkboxes, status pills, source column with confidence %
- Approve / bulk approve / reject actions
- Add manually button (reuses Phase 9 dialog)

For now, populate with manual entries and Petpooja P&L propagation only. Gmail scanning is phase 17.
Commit as `feat(expenses): pending bills tab UI`.
```

### Phase 15 — Admin Module

```
Read docs/features/admin.md.

Implement (Customer segments and Expense categories tabs are already done from Phases 3 and 4 — just integrate them into the admin sub-nav):
- /admin redirects to /admin/integrations
- Integrations tab — Gmail config moves here from /ingest, plus Petpooja card
- Team tab — invite / role / remove
- Outlets tab — config + Investment tracking sub-section (already done in Phase 2 — integrate)
- Data tab — exports + danger zone
- Activity tab — activity_log table + UI
- Sub-navigation tabs across the top

Migrate /ingest's Gmail config to redirect to /admin/integrations#gmail.
Add a one-time toast on /ingest: "Gmail config moved to Admin → Integrations".

Stop.
Commit as `feat(admin): consolidated admin module`.
```

### Phase 16 — Ingest UX v3

```
Read docs/features/ingest-ux-v3.md.

Implement:
- archived_at column on ingest_runs + view updates
- Multi-select checkbox column on runs table
- Bulk actions (Re-ingest / Archive / Delete) — appear when ≥1 selected
- Pagination (25 per page)
- Archive tab alongside All / Manual / Auto-synced / Backfill
- Run detail drawer (right-side slide-out, 50% width desktop, full mobile)
- Gmail status pill at top of /ingest (read-only, links to /admin/integrations)
- Daily cron to archive runs older than 90 days

Stop.
Commit as `feat(ingest): v3 ux — pagination + multi-select + archive + drawer`.
```

### Phase 17 — Gmail Invoice Scanning

```
Read docs/features/gmail-auto-ingest.md § Phase 2 — Invoice Scanning, and docs/features/expenses.md § Auto-Approve Logic.

Implement:
- Detection rules in the existing Gmail sync job (subject keywords + PDF attachment + dedupe)
- Anthropic API call (haiku-tier) with strict JSON schema for extraction
- Confidence scoring (0-100 based on completeness)
- Auto-approve threshold logic per the spec
- Create expenses rows with appropriate status (auto_scanned / needs_review / approved)
- Limit: max 50 invoice candidates per sync run

The Pending Bills tab UI is already done — invoices will populate it automatically.

Stop. v3 is complete.
Commit as `feat(expenses): gmail invoice scanning`.
```

---

# What To Do Now

1. **Save this single file** to your repo at `docs/STRIDE_OS_V3_COMPLETE_SPEC.md`
2. **Split into individual files** in `docs/features/`:
   - Each `# Spec — \`X.md\`` heading marks a separate file
   - Copy the content between headings into that file path
3. **Apply the patches** — for each `## Patch:` section, paste the addition into the relevant existing spec file
4. **Move JSX exports** to `docs/design-exports/`
5. **Archive old dashboard specs** to `docs/features/_archive/`
6. **Update `CLAUDE.md`** with the v3 Status Block
7. **One commit:** `docs: v3 spec refresh complete — dashboard rebuild + 4 new modules + design system + investment tracking`
8. **Run Phase 1 in Codex** using the prompt above

This file is everything. No external references.
