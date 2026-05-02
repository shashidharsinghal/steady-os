# Feature: Petpooja Daily Ingestion (Item + Payment Reports)

**Status:** Draft
**Last updated:** 2026-04-29
**Related:** `ingestion-framework.md`, `sales-ingestion.md`, `gmail-auto-ingest.md`
**Depends on:** Ingestion framework; existing `sales_orders` and `sales_line_items`
tables from sales-ingestion.md
**Supersedes:** The Petpooja Orders Master Report parser for daily ingestion.
Orders Master remains usable for historical backfill only.

---

## Context and Motivation

Petpooja sends two scheduled email reports daily at approximately 22:30 IST
covering the previous day's trading:

1. **Item Wise Report With Bill No.** — one row per line item per invoice.
   Full item-level detail: category, item name, variation, quantity, price,
   discount, tax, total. Successful orders only.

2. **Payment Wise Summary** — one row per invoice. Per-payment-method amounts
   (Cash, Card, UPI, Online, Wallet, Due). Includes both successful AND
   cancelled orders. The authoritative source for cancellation tracking.

These two reports together are richer than the Orders Master Report:

- ✅ Full item-level data (Orders Master has only order totals)
- ✅ Exact per-payment-method amounts (Orders Master has one "Payment Type" field)
- ✅ Cancelled orders (Orders Master default export filters them out)

**Decision:** Replace the Orders Master Report as the daily ingestion source.
Keep Orders Master for historical backfill only (it has customer name/phone
for aggregator orders which the new reports don't have).

### Email Subject Lines (used for Gmail auto-detection)

```
Item report:    "Report Notification: Item Wise Report With Bill No. : GABRU DI CHAPP (Miracle Mall, Gurugram)"
Payment report: "Report Notification: Payment Wise Summary : GABRU DI CHAPP (Miracle Mall, Gurugram)"
```

### File Naming Pattern

```
Item:    Item_bill_report_YYYY_MM_DD_HH_MM_SS.xlsx
Payment: payment_wise_summary_YYYY_MM_DD_HH_MM_SS.xls
```

Note: `.xls` extension on the payment file is misleading — it is actually
an HTML file. Parser must handle this; do NOT use xlrd engine.

### Date Coverage

Both reports cover the **previous calendar day** (the date in the filename
and in the report header row). A report received at 22:30 on 29 Apr covers
28 Apr orders. Parser must extract the covered date from the file header,
not from the filename timestamp.

---

## Data Analysis (from real 28 Apr 2026 files)

### Item Wise Bill Report structure

- Single sheet named `Report`
- Rows 0–2: metadata (Date, Name, Restaurant Name)
- Row 3: blank
- Row 4: column headers (16 columns)
- Row 5+: data rows
- No summary/total row at bottom (clean termination)

**Columns:**
Date, Timestamp, Server Name, Table No., Covers, Invoice No., hsn_code,
Category, Item, Variation, Price, Qty., Sub Total, Discount, Tax, Final Total

**Key observations:**

- `Date` column is always the business date (e.g., `2026-04-28 00:00:00`)
- `Timestamp` is the actual order time (e.g., `2026-04-28 21:28:00`) — use this
- `Server Name` is `'biller'` for dine-in/pickup and `'Autoaccept'` for online orders
- `Table No.` is blank for Parcel/Delivery orders
- `Covers` is always 0 in the sample (Petpooja may not use it)
- `Variation` is `'Half'` or `'Full'` for items that have variants
- `Discount` is per-line-item (e.g., ₹232 on a Saver Combo)
- Only **successful** orders appear here; cancelled orders are absent
- Multiple rows share the same `Invoice No.` (one per item in the order)

### Payment Wise Summary structure

- `.xls` file is actually HTML — read with `pd.read_html()`
- Returns a single table with 19 rows for the sample day
- Rows 0–3: metadata (Date, Name, Restaurant Name, blank)
- Row 4: column headers
- Rows 5–17: invoice data rows
- Row 18: totals row (label = `Total`) — skip this

**Columns:**
Invoice No., Date, Payment Type, Order Type, Status, Persons, Area,
Assign To, Not Paid, Cash, Card, Due Payment, Other, Wallet, UPI, Online

**Key observations:**

- Contains **ALL invoices including Cancelled** (e.g., Invoice 816 Zomato
  Cancelled, Invoice 809 UPI Dine-in Cancelled)
- `Area` = `'Zomato'` for Zomato orders, `'Parcel'` for pick-up,
  blank for dine-in — this is the channel signal
- `Order Type` = `'Dine In'` | `'Delivery(Parcel)'` | `'Pick Up'`
- Payment columns are amounts in rupees (floats, stored as paise × 100)
- For cancelled orders: payment method columns show the attempted amounts
- Amounts are rounded to nearest rupee (expect ₹0.14 rounding diff vs item report)

### Cross-Reference (28 Apr 2026)

- 13 invoices in Payment report (11 success + 2 cancelled)
- 11 invoices in Item report (successful only)
- ₹6,801.08 item report total vs ₹6,905.00 payment report total
  — difference is normal rounding (Petpooja rounds payment to whole rupees)
- Join key: `Invoice No.` (integer, unique per day per outlet)

### Payment mix (28 Apr 2026 — successful orders)

| Method                 | Amount |
| ---------------------- | ------ |
| UPI                    | ₹3,285 |
| Online (Zomato/Swiggy) | ₹2,152 |
| Cash                   | ₹1,219 |
| Card                   | ₹249   |

### Channel identification

`Area` field in Payment report maps to channel:

- `'Zomato'` → `channel = 'zomato'`
- `'Swiggy'` (if present) → `channel = 'swiggy'`
- `'Parcel'` → `channel = 'takeaway'`
- blank + `Order Type = 'Dine In'` → `channel = 'dine_in'`
- blank + `Order Type = 'Delivery(Parcel)'` → `channel = 'other'`
  (could be a third-party aggregator we haven't seen yet)

---

## Schema Changes

### New table: `sales_payment_splits`

Stores per-payment-method breakdown per order. Previously we guessed this
from Pine Labs; now we have it directly from Petpooja.

```sql
CREATE TABLE sales_payment_splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  outlet_id uuid NOT NULL REFERENCES outlets(id),
  method text NOT NULL,       -- 'cash' | 'card' | 'upi' | 'online' | 'wallet' | 'due' | 'other'
  amount_paise bigint NOT NULL,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_splits_order   ON sales_payment_splits (order_id);
CREATE INDEX idx_payment_splits_outlet  ON sales_payment_splits (outlet_id, method);
CREATE INDEX idx_payment_splits_run     ON sales_payment_splits (ingestion_run_id);
```

### Additions to `sales_orders`

```sql
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS order_type text,    -- 'Dine In' | 'Delivery(Parcel)' | 'Pick Up'
  ADD COLUMN IF NOT EXISTS area_raw text,      -- raw Area field from Petpooja
  ADD COLUMN IF NOT EXISTS covers int,         -- number of guests
  ADD COLUMN IF NOT EXISTS server_name text,   -- 'biller' | 'Autoaccept' | etc.
  ADD COLUMN IF NOT EXISTS table_no text;      -- table number for dine-in
```

(Some of these columns may already exist from the Orders Master parser.
Apply `ADD COLUMN IF NOT EXISTS` idempotently.)

### `sales_line_items` — now populated for real

No schema changes needed. This table was created as a stub in the original
sales-ingestion spec. The Item report parser now populates it.

### `settlement_status` backfill

Orders ingested from the Payment report and identified as `Online/Zomato`
or `Online/Swiggy` should be marked `settlement_status = 'pending'` until
a Swiggy/Zomato annexure is uploaded. Dine-in/Cash/Card/UPI orders are
`settlement_status = 'settled'`.

---

## Parsers

### Parser A: `petpooja_item_bill`

**Source type:** `petpooja_item_bill`
**Display name:** Petpooja Item Wise Bill Report
**Accepted extensions:** `['xlsx']`

**Detection:**

- Filename matches `/item_bill_report/i` → confidence 0.90
- Row 1 cell B1 contains `'Item Wise Report With Bill No.'` → confidence 0.98

**Parse rules:**

```typescript
// Header is at row index 4 (0-based), data starts at row 5
const df = readExcel(file, { header: 4, sheetName: "Report" });

// Drop rows where Date doesn't match YYYY-MM-DD pattern (metadata rows)
const dataRows = df.filter((row) => /^\d{4}-\d{2}-\d{2}/.test(String(row.Date)));

// Extract business date from header row (row 0, col B)
// Value like "2026-04-28 to 2026-04-28"
const businessDate = parseBusinessDate(headerRow[1]);
```

**Field mapping → `sales_line_items`:**

| Item Report Column | Canonical Field         | Transform                                      |
| ------------------ | ----------------------- | ---------------------------------------------- |
| `Invoice No.`      | `order_id` (FK lookup)  | Join to sales_orders via invoice_no            |
| `Timestamp`        | —                       | Used for order creation if order doesn't exist |
| `Category`         | `category`              | verbatim                                       |
| `Item`             | `item_name`             | verbatim                                       |
| `Variation`        | appended to `item_name` | `"Kadhai Chaap (Full)"` if variation present   |
| `hsn_code`         | stored in `raw_data`    |                                                |
| `Price`            | `unit_price_paise`      | × 100, round                                   |
| `Qty.`             | `quantity`              | numeric                                        |
| `Sub Total`        | `sub_total_paise`       | × 100, round                                   |
| `Discount`         | `discount_paise`        | × 100, round                                   |
| `Tax`              | `tax_paise`             | × 100, round                                   |
| `Final Total`      | `line_total_paise`      | × 100, round                                   |

**Lookup behavior for `order_id`:**
When writing a line item, look up the parent `sales_orders` row using:
`(outlet_id, source = 'petpooja_daily', source_order_id = invoice_no)`.

If the order doesn't exist yet (item file processed before payment file),
**do not create a partial order** — instead, queue the line items and
write them after the payment file is processed in the same ingestion session.

This is why both files must be ingested together as a paired run (see
"Paired Ingestion" section below).

**Dedup:**
`(order_id, item_name, quantity, unit_price_paise)` should be unique within
an order. If a duplicate is detected (re-upload of same day), skip the row.

---

### Parser B: `petpooja_payment_summary`

**Source type:** `petpooja_payment_summary`
**Display name:** Petpooja Payment Wise Summary
**Accepted extensions:** `['xls']`

**File format note:** Despite the `.xls` extension, this file is HTML.
Read with `pd.read_html()` or equivalent. Do NOT use xlrd.

```typescript
// Node.js: use cheerio or node-html-parser to extract the table
// OR: rename .xls to .html in memory and use a HTML table parser
// OR: use python subprocess for parsing during development
```

**Detection:**

- Filename matches `/payment_wise_summary/i` → confidence 0.90
- File begins with `<html` when read as bytes → switch to HTML parser
- HTML table contains columns `Invoice No.` + `Payment Type` + `UPI` + `Online` → confidence 0.98

**Parse rules:**

```typescript
// Header is at table row index 4, data from row 5
// Skip the last row where Invoice No. === 'Total'
const rows = parseHtmlTable(file).slice(5, -1); // skip header rows + total row

// Convert all payment columns to numbers (they may be strings due to HTML)
const paymentCols = ["Not Paid", "Cash", "Card", "Due Payment", "Other", "Wallet", "UPI", "Online"];
```

**Field mapping → `sales_orders`:**

| Payment Column  | Canonical Field               | Transform                                                                      |
| --------------- | ----------------------------- | ------------------------------------------------------------------------------ |
| `Invoice No.`   | `source_order_id`             | String                                                                         |
| `Date`          | `ordered_at`                  | Parse as IST date (28-04-2026 format) + use Item report timestamp if available |
| `Payment Type`  | `payment_method_raw`          | verbatim                                                                       |
| `Order Type`    | `order_type`                  | verbatim                                                                       |
| `Status`        | `status`                      | `'Success'` → `'success'`, `'Cancelled'` → `'cancelled'`                       |
| `Area`          | `area_raw` + derive `channel` | See channel mapping above                                                      |
| `Persons`       | `covers`                      | int                                                                            |
| Payment columns | → `sales_payment_splits`      | One row per non-zero method                                                    |

**Payment method normalization:**

```typescript
const methodMap = {
  "Not Paid": "not_paid",
  Cash: "cash",
  Card: "card",
  "Due Payment": "due",
  Other: "other",
  Wallet: "wallet",
  UPI: "upi",
  Online: "online_aggregator",
};
```

**For each non-zero payment column, create one `sales_payment_splits` row.**

Example: Invoice 808 has Cash ₹1,219 → one split row with method='cash',
amount_paise=121900.

Split payments: if an order has both Card ₹200 and UPI ₹300, create two
split rows. This handles part-payments correctly.

**`settlement_status` assignment:**

```typescript
function deriveSettlementStatus(area: string, orderType: string): SettlementStatus {
  if (area === "Zomato" || area === "Swiggy") return "pending";
  return "settled"; // Cash, Card, UPI are immediately settled
}
```

**Dedup:**
`(outlet_id, source = 'petpooja_daily', source_order_id)` unique index.
If order already exists (re-upload), skip the order row but still process
payment splits (idempotent via the same unique key on splits).

---

## Paired Ingestion

These two files **must be ingested together** for a complete picture.
A day's data is only complete when both the Item report and Payment report
for the same business date are present.

### UI change in `/ingest`

Add a "Paired upload" mode specifically for Petpooja daily reports:

```
┌──────────────────────────────────────────────────────────┐
│  Petpooja Daily Reports                                   │
│  Drop both files together for a complete day             │
│                                                          │
│  [ Item Wise Bill Report  ← drop here ]  ✓ Detected     │
│  [ Payment Wise Summary   ← drop here ]  ✓ Detected     │
│                                                          │
│  Business date: 28 Apr 2026                              │
│  [Parse together →]                                      │
└──────────────────────────────────────────────────────────┘
```

This is offered as a convenience, not a requirement. Each file can still
be uploaded independently — but the preview screen will warn if only one
of the pair is present for a given date:

> "⚠ Payment report for 28 Apr uploaded. Item report for 28 Apr not yet
> ingested. Line items will not be available for this day."

### Atomic commit

When both files are uploaded together:

1. Parse both files in memory
2. Create `sales_orders` rows from Payment report (all invoices)
3. Create `sales_line_items` from Item report (linked to the orders)
4. Create `sales_payment_splits` from Payment report
5. Commit everything in a single transaction
6. Both ingestion runs are committed atomically (both succeed or both fail)

---

## What Happens to Existing Orders Master Data

Existing `sales_orders` rows ingested from the Orders Master Report are
**kept as-is**. They have `source = 'petpooja'`. New rows from these parsers
use `source = 'petpooja_daily'`.

The `(outlet_id, source, source_order_id)` unique constraint means the same
invoice number can exist twice — once as `source='petpooja'` and once as
`source='petpooja_daily'`. This is intentional: we don't auto-merge.

**Recommendation for partners:** After this feature ships, use the ingestion
delete feature to remove old Orders Master runs and re-ingest the same
period using the new daily reports. This gives you item-level data for
historical periods. The re-ingestion of old periods is manual but
straightforward since the files are in your Gmail.

**Dashboard query changes:** All canonical dashboard queries must add
`OR source = 'petpooja_daily'` to the existing `source = 'petpooja'` filter.
Or better: remove the source filter entirely and let the unique constraint
prevent doubles.

---

## Preview Components

### `PetpoojaItemBillPreview`

```
┌──────────────────────────────────────────────────────────────┐
│  Petpooja Item Wise Bill — 28 Apr 2026                       │
│  Gabru Di Chaap, Elan Miracle Mall                           │
│                                                              │
│  11 invoices · 33 line items                                 │
│                                                              │
│  Top categories:                                             │
│    Tandoori Starters  14 qty  ₹3,501                         │
│    Beverages           8 qty  ₹947                           │
│    Breads & Extras    15 qty  ₹635                           │
│    Main Course         2 qty  ₹607                           │
│                                                              │
│  Top items:                                                  │
│    Maharaja Malai Chaap (Full)  2×  ₹859                     │
│    Kamaal Di Amritsari Chaap   4×  ₹699                      │
│    Roomali Roti               15×  ₹635                      │
│                                                              │
│  [Commit →]                                                  │
└──────────────────────────────────────────────────────────────┘
```

### `PetpoojaPaymentSummaryPreview`

```
┌──────────────────────────────────────────────────────────────┐
│  Petpooja Payment Summary — 28 Apr 2026                      │
│  Gabru Di Chaap, Elan Miracle Mall                           │
│                                                              │
│  13 invoices: 11 successful · 2 cancelled                    │
│                                                              │
│  Revenue: ₹6,905  Payment mix:                               │
│    UPI    ₹3,285  ████████████████████░░░  47%               │
│    Online ₹2,152  █████████████░░░░░░░░░░  31%               │
│    Cash   ₹1,219  ████████░░░░░░░░░░░░░░░  18%               │
│    Card     ₹249  ██░░░░░░░░░░░░░░░░░░░░░   4%               │
│                                                              │
│  Cancelled: Invoice 809 (UPI ₹230), Invoice 816 (Zomato ₹272)│
│                                                              │
│  settlement_status: 7 settled · 4 pending (Zomato)          │
│                                                              │
│  [Commit →]                                                  │
└──────────────────────────────────────────────────────────────┘
```

---

## Dashboard Implications

With these reports ingested, the following dashboard sections become real:

### Now Possible (was not possible with Orders Master)

**Item Performance section (new):**

- Top 10 items by revenue this period
- Top 5 items by quantity
- Revenue by menu category (Tandoori Starters, Beverages, etc.)
- Best-selling variation (Half vs Full)

**Accurate payment mix:**

- Exact UPI / Cash / Card / Online split from Petpooja's own records
- No longer dependent on Pine Labs cross-matching

**Cancellation tracking:**

- Cancelled orders now appear in dashboard
- Cancellation rate = cancelled / (success + cancelled) per day

### Channel Economics improvement

Online orders with `Area = 'Zomato'` are marked `settlement_status = 'pending'`
until the Zomato annexure is uploaded. The dashboard's honest "—" treatment
for unsettled commission data remains correct.

---

## Server Actions

```typescript
// New actions in apps/web/app/(app)/ingest/actions.ts

// Upload both files together as a paired run
uploadPairedPetpoojaReports(
  itemFile: File,
  paymentFile: File,
  outletId: string
): Promise<{ itemRunId: string; paymentRunId: string }>

// Get item performance for dashboard
getItemPerformance(
  outletId: string,
  period: { start: Date; end: Date }
): Promise<{
  byCategory: Array<{ category: string; qty: number; revenuePaise: bigint }>;
  byItem: Array<{ item: string; category: string; qty: number; revenuePaise: bigint }>;
  topItems: Array<{ item: string; qty: number; revenuePaise: bigint }>;
}>

// Get payment method breakdown (from sales_payment_splits)
getPaymentMethodBreakdown(
  outletId: string,
  period: { start: Date; end: Date }
): Promise<Array<{
  method: string;
  totalPaise: bigint;
  orderCount: number;
  pct: number;
}>>
```

---

## RLS

- `sales_payment_splits`: partner sees all; manager sees only their outlet's rows
- No new routes — all accessed via existing dashboard and ingest pages

---

## Testing

Fixture files: copy both sample files to:

```
packages/sales-ingestion/__fixtures__/petpooja-daily/
  Item_bill_report_2026_04_28.xlsx
  payment_wise_summary_2026_04_28.xls
```

Integration test assertions (from real 28 Apr 2026 data):

```typescript
// After ingesting both fixtures:

// Payment report creates 13 sales_orders (11 success + 2 cancelled)
expect(orderCount).toBe(13);

// Item report creates 33 line items
expect(lineItemCount).toBe(33);

// Payment splits: 11 successful orders × their payment methods
// Each successful order has at least one non-zero payment column
expect(paymentSplitCount).toBeGreaterThanOrEqual(11);

// UPI total for the day
expect(upiTotal).toBe(328500); // ₹3,285 in paise

// Top item by revenue: Maharaja Malai Chaap (Full)
const topItem = await getItemPerformance(...);
expect(topItem.byItem[0].item).toContain('Maharaja Malai Chaap');

// 2 cancelled orders
const cancelled = orders.filter(o => o.status === 'cancelled');
expect(cancelled).toHaveLength(2);

// Settlement status: Zomato orders are pending
const zomatoPending = orders.filter(o => o.channel === 'zomato' && o.settlement_status === 'pending');
expect(zomatoPending.length).toBeGreaterThan(0);
```

---

## Definition of Done

- Upload Item + Payment files for 28 Apr via `/ingest` → both detected,
  previewed, committed
- `sales_orders` has 13 rows for 28 Apr (11 success + 2 cancelled)
- `sales_line_items` has 33 rows linking to the 11 successful orders
- `sales_payment_splits` has correct method breakdown per order
- Dashboard payment mix shows UPI ₹3,285 / Cash ₹1,219 / Card ₹249 / Online ₹2,152
- Dashboard item performance section shows top items from the day
- Re-uploading the same files produces no duplicate rows
- Paired upload UI shows both files with business date confirmation
- `pnpm typecheck && pnpm build` clean
- Integration tests pass against fixture files
- CLAUDE.md updated with Petpooja Daily Ingestion in Implemented Features

---

## Manual Upload Path Preserved

This feature provides parsers that work whether the file arrived via Gmail
auto-ingest or via manual upload. The existing `/ingest` drag-drop UI
detects these file types based on filename and content patterns:

- `Item_bill_report_*.xlsx` → `petpooja_item_bill` parser
- `payment_wise_summary_*.xls` → `petpooja_payment_summary` parser

A partner uploading either file via drag-drop sees the same preview UI
and follows the same paired-ingestion flow as auto-ingest. The only
difference is that `trigger_source = 'manual_upload'` is recorded on the
run.

This is critical for:

- Historical backfill before Gmail was connected
- Re-uploads after deletion
- Files received outside of Gmail
- Other-source files (Pine Labs, Swiggy annexure)

The manual upload UI remains the primary entry point for non-Petpooja
sources.
