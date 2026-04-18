# Ingestion Analysis — Source File Assessment

**Status:** Analysis (pre-spec)
**Date:** 2026-04-18
**Purpose:** Ground the ingestion specs in real data from the four sample files,
before writing `ingestion-framework.md` and `sales-ingestion.md`.

This document is the output of inspecting actual sample exports from Petpooja,
Pine Labs, and Swiggy. Once reviewed and accepted, it drives the canonical
schema and parser design in the feature specs.

---

## The Five Files and What They Actually Are

| #   | File                               | True Nature                                                  | Feature Module                   |
| --- | ---------------------------------- | ------------------------------------------------------------ | -------------------------------- |
| 1   | `Orders_Master_Report_...xlsx`     | **Petpooja order-level transactions** (Mar 2026, 431 orders) | Sales Ingestion                  |
| 2   | `Elan_Miracle_Mar_2026.xlsx`       | **Petpooja day-wise summary** (Mar 2026, 29 days)            | Sales Ingestion                  |
| 3   | `Pinelab_data_Elan_Miracle.xlsx`   | **Pine Labs POS card/UPI transactions** (303 txns)           | Sales Ingestion                  |
| 4   | `invoice_Annexure_...xlsx`         | **Swiggy weekly payout annexure** (18 orders, 22–28 Mar)     | Sales Ingestion _and_ P&L        |
| 5   | `EGS_COM_2526_961_Gas.pdf`         | LPG gas bill (vendor invoice)                                | Expenses (future feature)        |
| 6   | `Elan_Miracle_Gur_Mar2026_P_L.pdf` | **Monthly franchise P&L summary**                            | P&L Ingestion (separate feature) |

Files 1–4 are sales-domain and belong to the Ingestion v1 scope.
File 5 is an expense invoice and should wait for the Expenses/Gmail pipeline.
File 6 is a monthly financial summary — separate feature.

---

## File 1 — Petpooja Orders Master Report

**The most important file. This is the ground truth for every transaction.**

### Structure

- Single sheet, 441 rows including metadata
- Rows 0–4: metadata (date range, report name, restaurant name, blank)
- Row 5: column headers (43 columns)
- Rows 6–9: summary aggregates (Total / Min / Max / Avg) — **must be skipped by the parser**
- Rows 10+: actual order data (431 orders)

### Columns (43)

Operational identity: `Invoice No.`, `Date`, `Biller`, `KOT No.`

Classification: `Payment Type`, `Payment Description`, `Order Type`, `Status`,
`Area`, `Sub Order Type`, `Group Name`, `Brand Name`, `GSTIN`, `Assign To`

Customer: `Phone`, `Name`, `Address`, `Locality`, `Persons`, `Order Cancel Reason`

Amounts: `My Amount`, `Discount`, `Net Sales (M.A - D)`, `Delivery Charge`,
`Container Charge`, `Service Charge`, `Additional Charge`, `Deduction Charge`,
`Total Tax`, `Round Off`, `Waived off`, `Total`

Tax breakdown: `Online Tax Calculated`, `GST Paid by Merchant`,
`GST Paid by Ecommerce`, `Tip`, `Non Taxable`, `Amount (CGST@2.5)`,
`CGST@2.5`, `Amount (SGST@2.5)`, `SGST@2.5`, `Amount (Unknown Tax)`,
`Unknown Tax`

### Observed Values (from 431 orders)

- **Payment Types:** `CARD`, `Online`, `UPI`, `Part Payment`, `Cash`, `Not Paid`
- **Order Types:** `Dine In`, `Delivery(Parcel)`, `Pick Up`
- **Statuses:** `Success` only (all orders shown are successful — cancelled/failed
  orders are apparently filtered out of this export)
- **Areas:** null, `Zomato`, `Swiggy`, `Parcel`
- **Sub Order Types:** `Dine In`, `Zomato`, `Swiggy`, `Pick Up`

### Critical observations

1. **Aggregator orders appear here too.** Swiggy and Zomato orders show up
   with `Sub Order Type = Swiggy/Zomato` and `Payment Type = Online`. This is
   Petpooja's view of the aggregator order. The aggregator also produces its
   own report with different numbers — that's the reconciliation problem.

2. **Only successful orders in this export.** If you want cancellations and
   refunds, you need a different Petpooja report.

3. **`Phone` is `0000000000` for dine-in orders**, suggesting Petpooja uses
   a placeholder rather than null. `Name` is often `Abc`. Customer tracking
   from Petpooja alone will be almost useless for dine-in.

4. **Customer data is real for aggregator orders** (`Vathsal Sharma`,
   `praveen`, `arzoo`) — these are names passed through from Swiggy/Zomato.
   Still usually no phone.

5. **`My Amount = Net Sales + Discount` holds** (verified across 431 orders).
   So the math is consistent.

### Primary key

`Invoice No.` appears unique within the file (numeric, sequential). Globally
unique key should be `(outlet_id, invoice_no, date)` since Petpooja invoice
numbers reset or could collide across outlets.

### Recommended handling

- Parser skips rows 0–9 (metadata + aggregates)
- Columns 0 (Invoice No.) must match `^\d+$` — any other value means it's a
  summary row or empty row; skip
- Parse `Date` as IST timestamp
- Coerce phone `0000000000` to NULL in canonical schema
- Coerce name `Abc` to NULL in canonical schema (too generic to be useful)
- Store the `Sub Order Type` as the **channel** (Dine In / Swiggy / Zomato / Pick Up)
- Store `Area` as a secondary signal — sometimes it clarifies ambiguous rows

---

## File 2 — Petpooja Day-Wise Summary

### Structure

- Single sheet, 40 rows
- Rows 0–3: metadata
- Row 4: column headers (27 columns)
- Rows 5–8: aggregates (Total / Min / Max / Avg) — skip
- Rows 9+: one row per day (29 days)

### Columns

`Restaurants`, `Date`, `Invoice Nos.`, `Total no. of bills`, `My Amount`,
`Total Discount`, `Net Sales`, `Delivery Charge`, `Container Charge`,
`Service Charge`, `Total Tax`, `Waived off`, `Round Off`, `Total Sales`,
`Not Paid`, `Cash`, `Card`, `Due Payment`, `Other`, `Wallet`, `UPI`, `Online`,
`Pax`, and 4 trailing unnamed columns with derived tax math.

### Critical observations

1. **This file is fully derivable from the Orders Master Report.** Every field
   here is a SUM/COUNT over orders in File 1.

2. **Therefore: we do not need to ingest this file separately.** If File 1 is
   ingested correctly, your dashboards can compute everything here via a
   `SELECT ... GROUP BY date` query.

3. **One exception:** this file is useful as a **reconciliation check** —
   upload it occasionally to verify your computed daily totals match
   Petpooja's own summary. A drift indicates a parsing bug.

### Recommended handling

- **Not ingested as primary data.** Do not write day-wise rows to canonical tables.
- **Optional: validation pass** — if uploaded, compare to our computed
  aggregates from File 1 and surface any mismatches as a reconciliation report.

---

## File 3 — Pine Labs POS Transactions

### Structure

- Single sheet, header at row 0, 303 data rows
- Clean — no metadata rows, no summary rows

### Columns (28)

Identity: `Report Type`, `Sub Report Type`, `System`, `Zone`, `Store Name`,
`Store Address`, `City`, `POS`, `Hardware Model`, `Hardware ID`

Transaction: `Acquirer`, `TID`, `MID`, `Batch No`, `Customer Payment Mode ID`,
`Name`, `Card Issuer`, `Card Type`, `Card Network`, `Transaction Id`,
`Transaction Amount`, `Currency`, `Transaction Date`, `Time`,
`Transaction Status`, `Batch Status`, `Is Emi`, `Contactless`

### Observed values

- **Report Types:** `UPI`, `Card`, `PAPER POS`
- **Card Types:** null, `CREDIT`, `DEBIT`
- **Statuses:** `Success` only
- **Batch Status:** `Settled` only
- **Store Name:** `GABRU DI CHAAPROHINI DELHI RV1HTIAR` — ⚠️ this says Rohini
  Delhi but the file is named `Elan_Miracle` — confirm with Shashi whether
  this is mislabeled or the terminal is physically shared

### Critical observations

1. **`Transaction Id` has a leading backtick** (`` `1219779573 ``) — Pine Labs
   adds this to prevent Excel from interpreting long numbers as scientific
   notation. **Parser must strip this.**

2. **`Transaction Amount` is in rupees, not paise** (e.g., 511, 793, 323).
   Canonical storage should still be in minor units (paise) for precision.

3. **`Time` column is in format `T14:02:12`** (with leading `T`). Must
   combine with `Transaction Date` to produce a full timestamp, stripping
   the `T`.

4. **This file represents a different data domain than Petpooja orders.**
   Petpooja tells you what was ordered + billed. Pine Labs tells you what
   money the POS actually received. They should reconcile daily but
   frequently won't because:
   - Some Petpooja orders are UPI direct to merchant QR (bypass Pine Labs)
   - Pine Labs transactions might have no matching Petpooja order (test
     transactions, refunds initiated from POS)
   - Timing differences (late-night orders settle next day)

5. **No link back to a Petpooja invoice.** Matching Pine Labs → Petpooja
   can only be done by (date + amount) heuristic, and will be lossy.

### Primary key

`Transaction Id` is unique per Pine Labs transaction. Globally:
`(outlet_id, pine_labs_txn_id)`.

### Recommended handling

- **Treat as a parallel data stream**, not as a replacement or merge target
  for Petpooja orders
- Store in a separate canonical table (`payment_transactions` or similar —
  see Canonical Schema below)
- Offer a "reconciliation" view later that attempts (date + amount) matching
  and flags drift

---

## File 4 — Swiggy Weekly Payout Annexure

### Structure (the messiest of the four)

**Seven sheets**, each with different purposes:

| Sheet                              | Content                                     | Rows                | Value for ingestion                  |
| ---------------------------------- | ------------------------------------------- | ------------------- | ------------------------------------ |
| **Summary**                        | High-level payout metadata                  | 28                  | Metadata only — period, total payout |
| **Payout Breakup**                 | Line-item calculation of the payout         | 36                  | Important: weekly aggregate totals   |
| **Order Level**                    | One row per order, full financial breakdown | 18 orders + headers | **Primary data**                     |
| **Unresolved Customer Complaints** | Complaint tracking                          | 13                  | Low priority for v1                  |
| **Other charges and deductions**   | Ads, adjustments                            | 20                  | Expenses/P&L                         |
| **Discount Summary**               | Coupon-level aggregates                     | 7                   | Useful for marketing analytics       |
| **Glossary**                       | Field definitions                           | 29                  | Reference only                       |

### Order Level sheet — 50 columns

Every Swiggy order has:

- Identifiers: `Order ID`, `Parent Order ID`, `Order Date`, `Order Status`,
  `Order Category`, `Order Payment Type`, `Cancelled By?`, `Coupon type...`
- Gross amounts: `Item Total`, `Packaging Charges`, `Restaurant Discounts`,
  `Swiggy One Exclusive Offer Discount`, `Restaurant Discount Share`,
  `Net Bill Value`, `GST Collected`, `Total Customer Paid`
- Fees (all negative from restaurant's perspective): `Commission charged on`,
  `Service Fees %`, `Commission`, `Long Distance Charges`,
  `Discount on Long Distance Fee`, `Pocket Hero Fees`, `Swiggy One Fees`,
  `Payment Collection Charges`, `Restaurant Cancellation Charges`,
  `Call Center Charges`, `Delivery Fee sponsored by Restaurant`, `Bolt Fees`,
  `GST on Service Fee @18%`, `Total Swiggy Fees`
- Complaint/cancellation deductions: `Customer Cancellations`,
  `Customer Complaints`, `Complaint & Cancellation Charges`
- Taxes: `GST Deduction`, `TCS`, `TDS`, `Total Taxes`
- Net: `Net Payout for Order (after taxes)`
- Logistics: `Long Distance Order`, `Last Mile (in km)`, `MFR Accurate?`,
  `MFR Pressed?`, `Coupon Code Sourced`, `Discount Campaign ID`,
  `Replicated Order`, `Base order ID`, `Cancellation time`, `Pick Up Status`,
  `Swiggy One Customer?`, `Pocket Hero Order?`

### Critical observations

1. **Some column names contain newlines** (`Long Distance Charges\n`,
   `Net Payout for Order (after taxes)\n[A-B-C-D]`). Parser must normalize
   column names by stripping newlines and trailing whitespace before matching.

2. **Column names include formulas in brackets** (`Total Customer Paid [4+5]`).
   These are Swiggy's own reference labels. Strip them for canonical field
   names.

3. **Sheet "Order Level" has a three-row header**: row 0 is a title,
   row 1 is a reference numbering scheme (`(1)`, `(2)`, `(3a)`, etc.),
   row 2 is the actual column names. **Parser must skip rows 0–1, use row 2.**

4. **This is a weekly payout, not a daily/monthly transaction log.** It
   covers exactly 7 days: 22 Mar – 28 Mar. To get a full month you'd need
   4–5 of these files.

5. **Order Payment Type is blank** in all sample rows — Swiggy doesn't
   expose this to restaurants.

### The Critical Reconciliation Finding

**I cross-checked Petpooja vs Swiggy annexure for the same week (22–28 Mar):**

| Source                             | Order count | Gross orders (₹)    | What it represents                 |
| ---------------------------------- | ----------- | ------------------- | ---------------------------------- |
| Petpooja (Swiggy orders 22–28 Mar) | **17**      | ₹5,411 (My Amount)  | What Petpooja received from Swiggy |
| Swiggy annexure                    | **18**      | ₹5,969 (Item Total) | What Swiggy shows in weekly payout |

**They don't match.** One order is in Swiggy's annexure but not in Petpooja —
likely processed differently, edge case, or the export date cutoffs differ.
And the gross amounts differ because Petpooja's "My Amount" is post-item-
discount whereas Swiggy's "Item Total" is pre-discount.

**Implication for the feature:** sales reconciliation is a first-class
concern, not an afterthought. We ingest both, we don't force them to match,
we surface the drift. Partners want to see: "Petpooja recorded 17 Swiggy
orders worth ₹5,411 but Swiggy paid out for 18 orders with item total ₹5,969,
net payout ₹3,083." That's the business question — "where did my money go?"

### Primary key

`Order ID` (e.g. `233075699468862`). Globally: `(outlet_id, channel='swiggy', order_id)`.

### Recommended handling

- Parse Order Level sheet as primary sales data (same canonical tables as Petpooja)
- Parse Summary + Payout Breakup sheet for **payout-level financials**
  (separate table — these are weekly aggregates with commission/tax breakdown
  that matters for P&L, not for sales)
- Parse Discount Summary for coupon analytics (nice-to-have later)
- Skip Complaints, Glossary, Other charges for v1

---

## File 5 — LPG Gas Bill (PDF)

A single-page PDF invoice: ₹7,581.15 for March gas consumption.

**Not in scope for Sales Ingestion v1.** This is an expense invoice. It
belongs to the future **Expenses** feature which will ingest invoices from
Gmail using LLM-based extraction (vendor, amount, invoice number, due date,
category, tax breakdown).

Noted for future: this is a recurring monthly invoice from the same vendor
(Embrace Gas Services Pvt Ltd). A pattern-match + LLM fallback extraction
would handle it cleanly.

---

## File 6 — Franchise P&L (PDF)

Month: Mar 2026, Elan Miracle Mall, Gurgaon.

### Structure (what the PDF reveals)

- **Trading Account:** Gross Sales (₹193,837), Trade Discount (₹30,866.88),
  Sales Accounts broken down: Dine In / B2C / Online / Swiggy / Zomato
- **Cost of Sales:** Purchase Accounts (₹71,719.69), Gross Profit (₹122,117.31)
- **Income Statement:** Expenses including Miscellaneous (Rapido ₹1,315),
  Online Aggregator Charges (₹7,100.53), Rent (₹86,092), Marketing (₹10,000),
  Management Fees (₹11,630), Logistics (₹16,000)
- **Net Profit:** **-₹10,020.44** (loss) pre-GST, net **-₹11,824.12** after GST

### Critical observations

1. **This is a franchise-provided summary, not a system-generated one.**
   It's the authoritative view of your profitability per the franchisor.

2. **Several line items say "Paid by Franchise":** Salaries, Electricity,
   Gas Charges. These are costs that _we_ pay but get accounted for by the
   franchise structure separately.

3. **Gross Sales here (₹193,837) matches the Petpooja `My Amount` total
   from File 1 exactly.** This is a fantastic cross-check — it means the
   franchise P&L revenue figures come straight from Petpooja.

4. **Some line items are reconcilable to Swiggy annexure data:** "Online
   Aggregator Charges" (₹7,100.53) should equal the sum of Swiggy + Zomato
   commissions + fees for the month. This is the kind of validation our
   system can provide automatically.

### Implication

**P&L ingestion is a separate feature** with a different parser (PDF table
extraction + LLM cleanup), different canonical tables (`financial_periods`,
`pnl_line_items`), and different UI (period-over-period comparison, not
transaction list).

It's valuable but it's not in Sales Ingestion v1. We'll build it as
`docs/features/pnl-ingestion.md` later.

---

## Answers to the Three Deferred Questions (now, grounded in data)

### 1. Granularity — **Order-level, not item-level**

**Recommendation:** Order-level in v1. Upgrade to item-level later if needed.

**Why:** None of the four files contain item-level data. Petpooja's orders
report has amounts per order but not line items — that requires a separate
"Item Wise Sale Summary" report. Swiggy's annexure is order-level.
Pine Labs is transaction-level.

If we design the canonical schema to support future item-level data without
requiring it in v1, we get the right trade-off:

- `sales_records` table → order-level (what we ingest today)
- `sales_line_items` table → schema exists, populated only when Petpooja's
  item-wise report is ingested (future)

This way, v1 ingests everything we currently have access to, and the schema
doesn't need to change when item-level gets added.

### 2. Customer tracking — **Yes, but only where real data exists**

**Recommendation:** Track customers where the data is meaningful; skip
placeholder data.

**Why:** Dine-in orders have `phone='0000000000'` and `name='Abc'` — tracking
these is useless noise. Aggregator orders have real names (and some have
phone numbers passed through). Phone-based aggregator orders could be
cross-referenced.

**Proposed rule in normalizer:**

- Drop phone if it's `0000000000`, `9999999999`, or any obvious placeholder
- Drop name if it's `Abc`, `Customer`, or < 3 chars
- Only create/link a `customers` row when we have a real phone OR a real
  name with non-dine-in channel

**DPDP implication:** Since we're storing real phone numbers, we need:

- Clear privacy notice in the employee/manager onboarding
- RLS ensuring only authorized users see phone numbers
- Ability to delete a customer's records on request
- **Option: hash the phone number and store both hash + last-4 digits.** This
  lets us do repeat-customer detection without storing retrievable phones.
  Worth discussing — meaningful for future marketing/win-back.

### 3. Historical backfill — **Yes, 60+ days, designed robustly**

**Recommendation:** Backfill is a first-class concern, not a bolt-on.

**Why:** The March 2026 Petpooja report covers a full month (431 orders).
That's not "small." The Swiggy annexure is weekly, so 8–10 weeks of backfill
means 8–10 files to upload.

**Design implications:**

- Upload must handle files with data back to any arbitrary date
- Dedup logic must be bulletproof — uploading the same file twice is a
  common user mistake
- Preview step must clearly show "X new rows, Y duplicates skipped, Z errors"
  before commit
- Progress indication matters — a 431-row file parses fast, but if someone
  uploads a full-year dump that's 5000+ rows, we need streaming/chunked
  processing

---

## Recommended Canonical Schema (preview)

This is what I'm proposing the feature spec should formalize. Shown here
so you can push back before I write it formally.

### `sales_orders` (one row per order — the core table)

```sql
CREATE TABLE sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES outlets(id),

  -- Identity
  source text NOT NULL,              -- 'petpooja' | 'swiggy' | 'zomato'
  source_order_id text NOT NULL,     -- Petpooja invoice_no, Swiggy order_id, etc.
  UNIQUE (outlet_id, source, source_order_id),

  -- Classification
  channel text NOT NULL,             -- 'dine_in' | 'takeaway' | 'swiggy' | 'zomato' | 'other'
  order_type text,                   -- raw from source for audit
  status text NOT NULL,              -- 'success' | 'cancelled' | 'refunded' | 'partial'

  -- Timing (always IST-localized timestamptz)
  ordered_at timestamptz NOT NULL,

  -- Money (always in paise, integer)
  gross_amount_paise bigint NOT NULL,          -- before discount
  discount_amount_paise bigint NOT NULL DEFAULT 0,
  net_amount_paise bigint NOT NULL,            -- gross - discount
  tax_amount_paise bigint NOT NULL DEFAULT 0,
  total_amount_paise bigint NOT NULL,          -- what customer paid

  -- Channel-specific (aggregators only)
  aggregator_commission_paise bigint,          -- for swiggy/zomato
  aggregator_net_payout_paise bigint,

  -- Payment
  payment_method text,               -- 'cash' | 'card' | 'upi' | 'wallet' | 'online' | 'not_paid' | 'part'

  -- Customer (nullable; only populated when real)
  customer_id uuid REFERENCES customers(id),

  -- Provenance
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id),
  raw_data jsonb NOT NULL,           -- full original row for audit
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON sales_orders (outlet_id, ordered_at DESC);
CREATE INDEX ON sales_orders (outlet_id, channel, ordered_at DESC);
CREATE INDEX ON sales_orders (customer_id) WHERE customer_id IS NOT NULL;
```

### `sales_line_items` (future; schema present, unused in v1)

```sql
CREATE TABLE sales_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  quantity numeric(10,3) NOT NULL,
  unit_price_paise bigint NOT NULL,
  line_total_paise bigint NOT NULL,
  -- ...
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### `customers`

```sql
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES outlets(id),    -- nullable: customer might span outlets
  phone_hash text,                           -- hash of phone, for dedup
  phone_last_4 text,                         -- display only
  name text,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  total_orders int NOT NULL DEFAULT 0,
  total_spend_paise bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (phone_hash)
);
```

### `payment_transactions` (Pine Labs-style POS transactions)

```sql
CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES outlets(id),
  source text NOT NULL,              -- 'pine_labs' | 'petpooja' | future
  source_transaction_id text NOT NULL,
  UNIQUE (outlet_id, source, source_transaction_id),

  transaction_type text NOT NULL,    -- 'card' | 'upi' | 'wallet' | 'cash'
  amount_paise bigint NOT NULL,
  transacted_at timestamptz NOT NULL,
  status text NOT NULL,              -- 'success' | 'failed' | 'pending'

  -- Attempted link back to sales_order via reconciliation
  matched_order_id uuid REFERENCES sales_orders(id),
  match_confidence text,             -- 'exact' | 'heuristic' | 'unmatched'

  raw_data jsonb NOT NULL,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### `aggregator_payouts` (Swiggy weekly/Zomato weekly etc.)

```sql
CREATE TABLE aggregator_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES outlets(id),
  source text NOT NULL,              -- 'swiggy' | 'zomato'
  period_start date NOT NULL,
  period_end date NOT NULL,
  UNIQUE (outlet_id, source, period_start, period_end),

  -- High-level numbers
  total_orders int NOT NULL,
  item_total_paise bigint NOT NULL,
  packaging_charges_paise bigint NOT NULL DEFAULT 0,
  restaurant_discount_share_paise bigint NOT NULL DEFAULT 0,
  gst_collected_paise bigint NOT NULL DEFAULT 0,

  -- Fees
  commission_paise bigint NOT NULL DEFAULT 0,
  payment_collection_paise bigint NOT NULL DEFAULT 0,
  long_distance_paise bigint NOT NULL DEFAULT 0,
  other_fees_paise bigint NOT NULL DEFAULT 0,
  gst_on_fees_paise bigint NOT NULL DEFAULT 0,

  -- Deductions
  customer_cancellations_paise bigint NOT NULL DEFAULT 0,
  customer_complaints_paise bigint NOT NULL DEFAULT 0,
  tcs_paise bigint NOT NULL DEFAULT 0,
  tds_paise bigint NOT NULL DEFAULT 0,

  net_payout_paise bigint NOT NULL,
  settlement_date date,

  raw_data jsonb NOT NULL,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### `ingestion_runs` (the audit log of every upload)

```sql
CREATE TABLE ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid REFERENCES outlets(id),
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),

  source_type text NOT NULL,         -- 'petpooja_orders' | 'petpooja_day_wise' | 'pine_labs' | 'swiggy_annexure' | 'zomato_annexure' | 'unknown'
  detection_method text NOT NULL,    -- 'filename' | 'header_inspection' | 'user_override' | 'llm'

  file_name text NOT NULL,
  file_size_bytes bigint NOT NULL,
  file_storage_path text NOT NULL,   -- Supabase Storage

  status text NOT NULL,              -- 'pending' | 'parsing' | 'preview' | 'committed' | 'rolled_back' | 'failed'
  rows_parsed int,
  rows_inserted int,
  rows_duplicate int,
  rows_errored int,
  error_details jsonb,

  preview_payload jsonb,             -- what the user saw before committing
  committed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);
```

---

## Parser Complexity Estimate

| Source                            | Parser complexity | Reason                                                                                                                 |
| --------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Petpooja Orders Master            | **Low**           | Clean structure, just skip header/aggregate rows, 43 well-defined columns                                              |
| Petpooja Day-Wise                 | **Low**           | Same pattern — but we're not ingesting it as primary data                                                              |
| Pine Labs                         | **Low**           | Clean, one sheet, one header. Just strip backticks from IDs.                                                           |
| Swiggy Annexure                   | **High**          | 7 sheets, multi-row headers, newline-polluted column names, weekly period logic. Parser needs sheet-specific handlers. |
| Zomato Annexure                   | **Unknown**       | No sample provided. Plan: assume similar complexity to Swiggy, validate when sample arrives.                           |
| P&L PDF                           | **High**          | PDF table extraction + LLM cleanup. Separate feature.                                                                  |
| Vendor invoices (gas, rent, etc.) | **High**          | PDF + LLM extraction. Separate feature.                                                                                |

---

## What This Means for Scope

### Sales Ingestion v1 (this feature)

**In scope:**

- Parser for Petpooja Orders Master Report → `sales_orders`
- Parser for Pine Labs POS → `payment_transactions`
- Parser for Swiggy Annexure (Order Level sheet) → `sales_orders`
- Parser for Swiggy Annexure (Summary + Payout Breakup) → `aggregator_payouts`
- Canonical schema (above)
- Universal upload UI with preview/commit/rollback
- File type auto-detection (filename → header inspection → LLM fallback → user override)
- Ingestion runs audit log
- Partner-only access (managers don't ingest)
- Backfill support (handles files with any date range)
- Deduplication via composite unique keys
- Customer extraction where data is real

**Deferred to later features:**

- Zomato annexure parser (when you send a sample)
- Petpooja Item-Wise sales report (item-level granularity)
- Petpooja Day-Wise validation reports
- Cancelled/refunded orders (different Petpooja report)
- P&L PDF ingestion
- Vendor invoice ingestion
- Gmail auto-ingest
- Petpooja API integration
- Pine Labs ↔ Petpooja reconciliation UI
- Swiggy payout ↔ Swiggy orders reconciliation UI
- Customer analytics dashboards

### P&L Ingestion (separate future spec)

Different parser (PDF + LLM), different canonical tables, different UI
(period comparisons not transaction lists). Deferred.

### Expenses Ingestion (separate future spec)

Vendor invoices arriving via email. PDF/XLSX parsing with LLM-based
extraction. Includes utilities (gas, electricity), rent, management fees,
marketing, logistics. Builds on the same ingestion framework.

---

## Open Questions Before Spec

1. **Pine Labs file says "Rohini Delhi" but is labeled "Elan Miracle" —
   is this a mislabel or a shared POS terminal?** (Critical — changes how
   we attribute transactions to outlets.)

2. **Phone number privacy — plain vs hashed?** My recommendation: store
   `phone_hash` (for dedup) + `phone_last_4` (for display). Never store
   plaintext phone. This lets us do customer analytics without creating a
   liability. Worth a 2-minute discussion.

3. **Zomato annexure format** — please share a sample before we finalize
   the parser contract. I'm assuming it's similar to Swiggy but that's a
   guess.

4. **Cancelled/refunded orders** — do you care about them in v1? If yes,
   we need a different Petpooja report in the mix. If no (which is my
   default), the `status` field in `sales_orders` exists for when we do.

5. **Who uploads, how often?** Daily? Weekly? Just you, or all partners?
   This affects UI design (do we need bulk upload? scheduling? reminders?).

---

## Recommended Next Actions

1. You review this analysis
2. Answer the 5 open questions above
3. If analysis is accepted → I write `docs/features/ingestion-framework.md`
   and `docs/features/sales-ingestion.md` grounded in real data
4. Execute the feature build in phases as usual

Approving the schema now saves a migration later. The schema proposed above
is designed to accommodate Zomato, future item-level data, P&L cross-checks,
and customer analytics — without needing changes later.
