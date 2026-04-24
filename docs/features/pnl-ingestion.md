# Feature: P&L Ingestion

**Status:** Draft
**Last updated:** 2026-04-19
**Related:** `ingestion-framework.md`, `sales-ingestion.md`, `dashboard-v2.md`
**Depends on:** Ingestion framework shipped; outlets table exists

---

## Purpose

Ingest the monthly franchise P&L PDF into structured canonical tables.
This gives partners a queryable, historically comparable financial picture
that goes beyond what the sales ingestion provides — it includes COGS,
rent, management fees, marketing, and other expense categories that only
appear in the franchisor's monthly report.

Combined with sales ingestion, this is the foundation for a real P&L
view that doesn't require opening a PDF and doing mental arithmetic.

---

## Source File Analysis

Based on real file: `Elan_Miracle_Gur_Mar2026_P_L.pdf`

**Format:** 2-page text-based PDF (not scanned — fully extractable via
`pdftotext`). pdfplumber table extraction is unreliable on this format
due to the indented hierarchy — `pdftotext -layout` is the right tool.

**Structure:**

```
Header:
  Entity:   Hor Kiddaan Foods Pvt Ltd
  Period:   from 1-Mar-26 to 31-Mar-26  (messy multi-line in raw PDF)
  Store:    Store_FOCO_H_Gurgaon_Elan Miracle Mall

Trading Account:
  Gross Sales                    193837.00
  Less: Trade Discount            30866.88
  Sales Accounts                 162970.12
    Dine In                      149026.67
      B2C Sales                  149026.67
    Online Sales                  13943.45
      Swiggy Online Sales         13942.45
      Zomato Online Sales             1.00
  Cost of Sales:
    Add: Purchase Accounts        71719.69
  Gross Profit:                  122117.31

Income Statement:
  Total Expenses                 132137.75
    Miscellaneous                  1315.00
      India_Rapido                 1315.00
    Online Aggregator Charges      7100.53
      Adjustments                  -294.00
      Online Refund                 622.00
      Swiggy Service Fees          6772.53
    Salaries                           0    Paid by Franchise
    Total Rent Cost                86092
      Fixed Rent / License Fees   86092
    Utilities                          0    Paid by Franchise
      Electricity                      0    Paid by Franchise
      Gas Charges                      0    Paid by Franchise
    Marketing Fees                 10000
    Management Fees                11630
    Logistic cost                  16000

  Nett Profit:                   -10020.44
  GST 18%                         -1803.68
  Invoice Value                  -11824.12
```

**Parsing challenges:**

- Period header is mangled across lines with garbled text — regex needed
- "Paid by Franchise" appears as an inline note next to zero-value items
- Indented hierarchy maps to category → subcategory → line item
- Some line items have values; many are blank/zero — both are meaningful
- Negative values appear (net loss, adjustments, refunds)

**Known March 2026 values (for test assertions):**

- Gross Sales: ₹1,93,837 → 19383700 paise
- Net Sales: ₹1,62,970.12 → 16297012 paise
- COGS: ₹71,719.69 → 7171969 paise
- Gross Profit: ₹1,22,117.31 → 12211731 paise
- Total Expenses: ₹1,32,137.75 → 13213775 paise
- Net Profit: -₹10,020.44 → -1002044 paise
- Rent: ₹86,092 → 8609200 paise
- Management Fees: ₹11,630 → 1163000 paise

---

## Scope

### In scope

- PDF parser for franchise P&L format
- Two canonical tables: `pnl_reports` + `pnl_expense_lines`
- `/pnl` list page and `/pnl/[id]` detail page
- Soft delete (same pattern as ingestion runs)
- Sidebar navigation link
- Month-over-month comparison once 2+ reports exist
- Hooks for future dashboard integration

### Out of scope

- P&L dashboard card (deferred — needs 3+ months of data to be useful)
- Budget vs actual tracking
- Multi-outlet P&L consolidation
- Export to Excel/CSV
- Automated PDF fetching from email (future Gmail auto-ingest)
- Editing P&L line items manually

---

## Canonical Schema

### `pnl_reports` table

One row per uploaded P&L file. All monetary values in paise (bigint).

```sql
CREATE TABLE pnl_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  outlet_id uuid NOT NULL REFERENCES outlets(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  UNIQUE (outlet_id, period_start, period_end),

  -- Header metadata
  entity_name text,
  store_name text,

  -- Trading Account
  gross_sales_paise bigint NOT NULL DEFAULT 0,
  trade_discount_paise bigint NOT NULL DEFAULT 0,
  net_sales_paise bigint NOT NULL DEFAULT 0,
  dine_in_sales_paise bigint NOT NULL DEFAULT 0,
  swiggy_sales_paise bigint NOT NULL DEFAULT 0,
  zomato_sales_paise bigint NOT NULL DEFAULT 0,
  other_online_sales_paise bigint NOT NULL DEFAULT 0,

  -- Cost of Sales
  opening_stock_paise bigint NOT NULL DEFAULT 0,
  purchases_paise bigint NOT NULL DEFAULT 0,
  closing_stock_paise bigint NOT NULL DEFAULT 0,
  cogs_paise bigint NOT NULL DEFAULT 0,
  gross_profit_paise bigint NOT NULL DEFAULT 0,

  -- Expenses (top-level categories)
  total_expenses_paise bigint NOT NULL DEFAULT 0,
  miscellaneous_paise bigint NOT NULL DEFAULT 0,
  online_aggregator_charges_paise bigint NOT NULL DEFAULT 0,
  salaries_paise bigint NOT NULL DEFAULT 0,
  rent_total_paise bigint NOT NULL DEFAULT 0,
  utilities_paise bigint NOT NULL DEFAULT 0,
  marketing_fees_paise bigint NOT NULL DEFAULT 0,
  management_fees_paise bigint NOT NULL DEFAULT 0,
  logistic_cost_paise bigint NOT NULL DEFAULT 0,
  corporate_expenses_paise bigint NOT NULL DEFAULT 0,
  maintenance_paise bigint NOT NULL DEFAULT 0,

  -- Bottom line
  net_profit_paise bigint NOT NULL DEFAULT 0,
  gst_amount_paise bigint NOT NULL DEFAULT 0,
  invoice_value_paise bigint NOT NULL DEFAULT 0,

  -- Audit
  paid_by_franchise_items jsonb,   -- array of {label, category} objects
  raw_text text NOT NULL,           -- full pdftotext output for re-parsing
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id),

  -- Soft delete
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id),
  purge_scheduled_at timestamptz
    GENERATED ALWAYS AS (deleted_at + INTERVAL '30 days') STORED,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pnl_reports_outlet_period
  ON pnl_reports (outlet_id, period_start DESC)
  WHERE deleted_at IS NULL;
```

### `pnl_expense_lines` table

Granular sub-items from the Income Statement. Every indented line
item with a non-null label gets a row here, even if amount is zero.

```sql
CREATE TABLE pnl_expense_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES pnl_reports(id) ON DELETE CASCADE,

  category text NOT NULL,        -- top-level: "Online Aggregator Charges"
  subcategory text,              -- mid-level if applicable
  label text NOT NULL,           -- the line item name from the PDF
  amount_paise bigint NOT NULL DEFAULT 0,
  paid_by_franchise boolean NOT NULL DEFAULT false,
  notes text,                    -- any inline annotation from the PDF

  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pnl_expense_lines_report
  ON pnl_expense_lines (report_id);
```

---

## Parser

### Registration

```typescript
// packages/sales-ingestion/src/parsers/pnl-pdf.ts
// Registered in packages/sales-ingestion/index.ts alongside other parsers
```

**Source type:** `franchise_pnl_pdf`
**Display name:** Franchise P&L Report
**Accepted extensions:** `['pdf']`

### Detection

Waterfall, first match wins:

1. Filename matches `/P[_&]L/i` or `/profit.*loss/i` → confidence 0.80
2. `pdftotext` output contains `'Trading Account'` AND `'Gross Profit'`
   AND `'Nett Profit'` → confidence 0.98

### Extraction Strategy

Use `pdftotext -layout` (shell out via Node `child_process.execSync`).
Do NOT use pdfplumber table extraction — the indented hierarchy breaks it.

```typescript
const rawText = execSync(`pdftotext -layout "${filePath}" -`, { encoding: "utf8" });
```

Store `rawText` in `pnl_reports.raw_text` for audit and re-parsing.

### Period Extraction

The PDF header is messy. Sample raw text:

```
Hor Kiddaan Foods Pvt Ltd - (from 1-Apr-
1-Mar-26 25)
to 31-Mar-26
Store_FOCO_H_Gurgaon_Elan Miracle Mall
```

Strategy:

1. Join first 10 lines into a single string (strip newlines)
2. Apply regex: `/from\s+(\d{1,2}[-\/]\w{3}[-\/]\d{2,4})\s*.*?to\s+(\d{1,2}[-\/]\w{3}[-\/]\d{2,4})/i`
3. Parse matched date strings — support formats:
   - `1-Mar-26` → `2026-03-01`
   - `31-Mar-26` → `2026-03-31`
   - `01-03-2026` → `2026-03-01`
4. If extraction fails → set `period_start` and `period_end` to null;
   surface a validation error requiring user to confirm period manually
   via override fields in the preview UI

### Line Item Parsing

Process `rawText` line by line:

```typescript
interface ParsedLine {
  indent: number; // number of leading spaces (determines hierarchy)
  label: string; // trimmed label text
  amount: number | null; // parsed float, null if no amount found
  paidByFranchise: boolean;
  notes: string | null;
}
```

Rules:

- Skip blank lines and page-break artifacts (`\f`)
- Detect `Paid by Franchise` anywhere on the line → `paidByFranchise = true`
- Amount: rightmost decimal number on the line (regex `/[-]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g`, take last match)
- Indent: count leading spaces; 0 = top-level, 1–4 = subcategory, 5+ = line item
- Build a stack-based hierarchy tracker to assign category/subcategory

### Field Mapping (label → canonical field)

Exact string match after trimming:

| PDF Label                   | Canonical Field                   |
| --------------------------- | --------------------------------- |
| `Gross Sales`               | `gross_sales_paise`               |
| `Less : Trade Discount`     | `trade_discount_paise`            |
| `Sales Accounts`            | `net_sales_paise`                 |
| `Dine In`                   | `dine_in_sales_paise`             |
| `Swiggy Online Sales`       | `swiggy_sales_paise`              |
| `Zomato Online Sales`       | `zomato_sales_paise`              |
| `Add: Purchase Accounts`    | `purchases_paise`                 |
| `Gross Profit :`            | `gross_profit_paise`              |
| `Total Expenses`            | `total_expenses_paise`            |
| `Miscellaneous`             | `miscellaneous_paise`             |
| `Online Aggregator Charges` | `online_aggregator_charges_paise` |
| `Salaries`                  | `salaries_paise`                  |
| `Total Rent Cost`           | `rent_total_paise`                |
| `Utilities`                 | `utilities_paise`                 |
| `Marketing Fees`            | `marketing_fees_paise`            |
| `Management Fees`           | `management_fees_paise`           |
| `Logistic cost`             | `logistic_cost_paise`             |
| `Nett Profit:`              | `net_profit_paise`                |
| `GST 18%`                   | `gst_amount_paise`                |
| `Invoice Value`             | `invoice_value_paise`             |

All other labeled lines with amounts → insert into `pnl_expense_lines`
with appropriate `category`, `subcategory`, `label`.

Amount conversion: `paise = Math.round(parseFloat(amountStr.replace(/,/g, '')) * 100)`

### Validation Checks

Run after parsing, before preview:

```
1. net_sales ≈ gross_sales - trade_discount          (±100 paise tolerance)
2. gross_profit ≈ net_sales - cogs                   (±100 paise tolerance)
3. net_profit ≈ gross_profit - total_expenses        (±100 paise tolerance)
```

Failures → add to `ingestion_row_errors` with clear message, e.g.:
`"Gross Profit check failed: expected ₹1,22,117 (net_sales - COGS) but PDF shows ₹1,22,500. Possible parsing error."`

Validation failures do NOT block commit — they surface as warnings in the
preview UI. Partner can still commit while acknowledging the discrepancy.

---

## Preview Component

`PnlPreviewComponent` renders on `/ingest/[runId]` when status is `preview_ready`.

Layout: three-column summary card

```
┌────────────────────────────────────────────────────────────────┐
│  Franchise P&L Report — March 2026 (1 Mar – 31 Mar)           │
│  Hor Kiddaan Foods · Elan Miracle Mall                         │
├────────────────┬────────────────────┬──────────────────────────┤
│  REVENUE       │  TOP EXPENSES      │  BOTTOM LINE             │
│                │                    │                          │
│  Gross ₹1.94L  │  Rent    ₹86,092   │  Gross Profit ₹1.22L    │
│  Discount ₹31K │  Mgmt    ₹11,630   │  Total Expenses ₹1.32L  │
│  Net    ₹1.63L │  Logist  ₹16,000   │                          │
│  COGS   ₹71K   │  Aggr    ₹7,101    │  Net Profit              │
│                │  Misc    ₹1,315    │  -₹10,020  ←  (red)     │
│                │                    │                          │
│  Gross Margin  │  Paid by Franchise:│  -₹11,824 incl GST      │
│  63.0%         │  Salary, Elec, Gas │                          │
└────────────────┴────────────────────┴──────────────────────────┘

⚠ 15 expense line items will be created
✓ All 3 validation checks passed

Period: 1 Mar 2026 → 31 Mar 2026  [Override dates if incorrect]
```

Period override: two date inputs shown if auto-detection failed or if
user wants to correct. Editable before commit.

---

## Routes

### `/pnl` — List page

```
┌────────────────────────────────────────────────────┐
│  P&L Reports                          [Upload →]   │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │ March 2026          Net Loss: -₹10,020  ☑  │  │
│  │ 1 Mar – 31 Mar      Sales: ₹1.94L            │  │
│  │ Elan Miracle Mall   Rent dominant expense     │  │
│  └──────────────────────────────────────────────┘  │
│                                                    │
│  ▼ Deleted reports (0)                             │
└────────────────────────────────────────────────────┘
```

- One card per report (most recent first)
- Net profit colored: green if positive, red if negative
- Checkbox on each card for bulk soft-delete
- "Upload →" links to `/ingest` (Stride OS detects PDF type automatically)
- Sticky delete action bar when checkboxes selected (same pattern as /ingest)
- "Deleted reports" expandable section at bottom

### `/pnl/[id]` — Detail page

Four sections:

**1. Header**

- Period, entity, store name
- Download original PDF button (signed URL, 1h expiry)

**2. Trading Account**

- Table: Gross Sales → Trade Discount → Net Sales → COGS → Gross Profit
- Gross margin % prominently shown

**3. Expense Breakdown**

- Horizontal stacked bar chart (Recharts) — each category as % of Gross Sales
- Table below: category, amount, % of gross sales, % of total expenses
- "Paid by Franchise" items shown with a distinct muted style + tooltip
  explaining they're tracked but not included in our actual expense total

**4. Bottom Line**

- Net Profit (large, colored)
- GST impact
- Invoice Value
- Month-over-month comparison card:
  - Shown only when 2+ reports exist for the same outlet
  - "vs Feb 2026: Net profit ↑ ₹3,200 (+22%)"
  - Revenue, expenses, and profit delta

---

## Soft Delete

Same pattern as ingestion runs and same pg_cron purge function.

### Server actions

```typescript
softDeletePnlReport(id: string): Promise<void>
// Sets deleted_at, deleted_by on pnl_reports row
// Does NOT delete pnl_expense_lines yet (cascade on purge)
// revalidatePath('/pnl')

undoDeletePnlReport(id: string): Promise<void>
// Clears deleted_at, deleted_by
// revalidatePath('/pnl')
```

### Purge

Extend the existing `purge_deleted_runs()` pg_cron function to also
handle `pnl_reports`:

```sql
-- Add to purge_deleted_runs() function:
FOR report_id IN
  SELECT id FROM pnl_reports
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '30 days'
LOOP
  -- pnl_expense_lines cascade deletes automatically
  DELETE FROM pnl_reports WHERE id = report_id;
END LOOP;
```

### Queries

All queries on `/pnl` and `/pnl/[id]` filter `WHERE deleted_at IS NULL`.
Same `active_` view pattern as ingestion runs.

---

## Sidebar Navigation

Add to `apps/web/app/(app)/layout.tsx`:

```typescript
{ label: 'P&L', href: '/pnl', icon: TrendingUp }
```

Position: after Dashboard, before Outlets.

---

## RLS

```sql
-- pnl_reports
-- SELECT: partner (via is_partner()) OR manager of the outlet
-- INSERT/UPDATE: partner only
-- DELETE: never (soft delete only)

-- pnl_expense_lines
-- Same as parent pnl_reports via join
-- All mutations via server actions only
```

---

## Dashboard Integration (future hook)

Do not add P&L data to the dashboard in this feature.

Add this comment in `apps/web/app/(app)/dashboard/page.tsx`:

```typescript
// TODO: P&L summary card
// Show latest month net profit vs prior month once pnl_reports has 2+ entries.
// See docs/features/dashboard-v2.md — reserved slot at bottom of Morning Check section.
// Implement when: pnl_reports has >= 2 months of data for this outlet.
```

---

## Edge Cases

- **Period detection fails.** Surface a validation warning; show two
  date override inputs in the preview UI. Partner manually confirms
  period before committing.
- **Duplicate period.** `UNIQUE (outlet_id, period_start, period_end)`
  catches it. Surface as: "P&L for March 2026 already exists for this
  outlet. Delete the existing report first, or upload a different month."
- **Paid by Franchise items.** Store with `paid_by_franchise = true`,
  `amount_paise = 0`. Show in UI with a distinct style. Do not include
  in expense totals (franchise pays them, not us). Track them for
  awareness — they represent costs we bear indirectly.
- **Negative amounts.** Stored as negative bigint. Adjustments
  (-₹294), Online Refund (+₹622), Net Loss (-₹10,020) all valid.
- **Validation failures.** Warn but don't block. A rounding difference
  of ₹1–2 is common. A difference of ₹1,000+ suggests a parsing bug
  — flag prominently.
- **Different franchise formats.** This parser targets the specific
  format observed in the sample file. If Wafflesome uses a different
  P&L format, a new parser variant is needed (register separately under
  a different `sourceType`). The canonical schema is format-agnostic.
- **Missing line items.** If a category is absent from a month's P&L
  (e.g., Logistics is zero and omitted), store 0 for that field. Don't
  error.

---

## Definition of Done

- Upload `Elan_Miracle_Gur_Mar2026_P_L.pdf` via `/ingest` — detected
  as `franchise_pnl_pdf` with confidence ≥ 0.95
- Preview shows correct period (Mar 2026), three-column summary,
  validation checks all pass
- After commit: `pnl_reports` has one row, `pnl_expense_lines` has 15+
  rows
- Assert in Supabase Studio:
  `SELECT gross_sales_paise/100, net_profit_paise/100 FROM pnl_reports`
  → `193837.00` and `-10020.44`
- `/pnl` list shows the March 2026 card with net loss in red
- `/pnl/[id]` detail shows all four sections; expense chart renders
- Soft delete works: delete the report, it moves to "Deleted" section;
  Undo restores it
- Month-over-month comparison visible after uploading a second month
- `pnpm build && pnpm typecheck` clean
- Integration test passes against the real fixture file
- CLAUDE.md updated with P&L Ingestion in Implemented Features
