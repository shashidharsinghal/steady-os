# Feature: Sales Ingestion v1

**Status:** Draft
**Last updated:** 2026-04-18
**Related:** `ingestion-framework.md` (shared infrastructure this depends on),
`ingestion-analysis.md` (source-file analysis driving this spec),
`outlets.md`, `employees.md`
**Depends on:** ingestion-framework.md must ship first (or alongside)

---

## Purpose

Ingest sales-related operational and financial data from three sources —
Petpooja POS, Pine Labs POS, and Swiggy aggregator annexures — into a
canonical schema. This is the foundation for every downstream analytics
feature: dashboards, P&L reconciliation, customer insights, channel mix,
item performance (when item-level data is added later).

Zomato is stubbed with a placeholder parser pending a sample file.

This is the first concrete feature built on the ingestion framework. It
validates the framework's design and establishes patterns subsequent
data-domain features (P&L, expenses) will reuse.

---

## Scope

### In scope

- Four parsers:
  - **Petpooja Orders Master Report** → `sales_orders`
  - **Petpooja Day-Wise Summary** → validation-only (compared to computed aggregates)
  - **Pine Labs POS Export** → `payment_transactions`
  - **Swiggy Weekly Annexure** → `sales_orders` (Order Level sheet) + `aggregator_payouts` (Summary + Payout Breakup sheets)
- Canonical schema: `sales_orders`, `sales_line_items` (future-ready stub),
  `customers`, `payment_transactions`, `aggregator_payouts`
- Customer extraction with **hashed phone** (plain-text not stored)
- Preview UI per parser (renders the domain-specific summary)
- Reconciliation view (basic v1): Pine Labs vs Petpooja daily totals, Swiggy annexure vs Petpooja Swiggy orders
- Partner-only
- Backfill support (any date range)

### Out of scope (deferred)

- **Zomato parser** — stubbed; awaiting sample file
- **Petpooja Item-Wise sales report** — item-level granularity (schema has stub table, parser later)
- **Cancelled / refunded orders** — Petpooja's default export doesn't include them; if we want this later, ingest a different Petpooja report
- **Automatic reconciliation fixing** — v1 surfaces drift but doesn't auto-correct
- **Sales dashboards** — separate feature built on this data
- **Customer outreach / campaigns** — separate feature; enabled by customer table
- **Petpooja API integration** — future; plugs into same schema via new "input path"

---

## Canonical Schema

### `customers` table

Hashed-phone approach. See "Privacy & Hashing" section below for details.

```sql
CREATE TABLE customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity (hashed for privacy)
  phone_hash text UNIQUE,              -- SHA-256 of normalized E.164 phone, salted
  phone_last_4 text,                   -- last 4 digits, plain — display only
  name text,                           -- plain text, sometimes null

  -- Aggregates (maintained by triggers on sales_orders)
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  total_orders int NOT NULL DEFAULT 0,
  total_spend_paise bigint NOT NULL DEFAULT 0,

  -- Future-facing
  marketing_opt_in boolean NOT NULL DEFAULT false,
  marketing_opt_in_at timestamptz,
  marketing_opt_in_source text,        -- 'checkout' | 'sms_reply' | 'manual' | etc.

  -- Provenance
  first_ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_last_seen ON customers (last_seen_at DESC);
```

Notes:

- A customer exists only when there's meaningful identifying data: either a real phone (not placeholder like `0000000000`) or a real name (> 3 chars, not "Abc" / "Customer").
- `phone_hash` is unique — dedup via hash prevents duplicate customer rows for the same person.
- No row is ever hard-deleted; future "delete my data" support will either set fields to null or add an `archived_at` column (not needed in v1).

### `sales_orders` table

```sql
CREATE TYPE sales_channel AS ENUM (
  'dine_in',
  'takeaway',
  'swiggy',
  'zomato',
  'other'
);

CREATE TYPE sales_status AS ENUM (
  'success',
  'cancelled',
  'refunded',
  'partial'
);

CREATE TYPE payment_method AS ENUM (
  'cash',
  'card',
  'upi',
  'wallet',
  'online_aggregator',     -- paid through Swiggy/Zomato
  'not_paid',
  'part_payment',
  'other'
);

CREATE TABLE sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Scope
  outlet_id uuid NOT NULL REFERENCES outlets(id),

  -- Source identity
  source text NOT NULL,                -- 'petpooja' | 'swiggy' | 'zomato' | 'petpooja_api' (future)
  source_order_id text NOT NULL,       -- Petpooja invoice_no, Swiggy order_id, Zomato order_id
  UNIQUE (outlet_id, source, source_order_id),

  -- Classification
  channel sales_channel NOT NULL,
  order_type_raw text,                 -- raw value from source (audit)
  area_raw text,                       -- Petpooja's "Area" column (audit)
  sub_order_type_raw text,
  status sales_status NOT NULL,

  -- Timing
  ordered_at timestamptz NOT NULL,     -- IST-aware

  -- Money (integers in paise — no float money, ever)
  gross_amount_paise bigint NOT NULL,
  discount_amount_paise bigint NOT NULL DEFAULT 0,
  net_amount_paise bigint NOT NULL,    -- gross - discount
  delivery_charge_paise bigint NOT NULL DEFAULT 0,
  packaging_charge_paise bigint NOT NULL DEFAULT 0,
  service_charge_paise bigint NOT NULL DEFAULT 0,
  tax_amount_paise bigint NOT NULL DEFAULT 0,
  round_off_paise bigint NOT NULL DEFAULT 0,
  total_amount_paise bigint NOT NULL,  -- what customer paid

  -- Tax breakdown (for GST filing)
  cgst_paise bigint NOT NULL DEFAULT 0,
  sgst_paise bigint NOT NULL DEFAULT 0,
  igst_paise bigint NOT NULL DEFAULT 0,
  gst_paid_by_merchant_paise bigint NOT NULL DEFAULT 0,
  gst_paid_by_ecommerce_paise bigint NOT NULL DEFAULT 0,

  -- Aggregator economics (non-null only for swiggy/zomato)
  aggregator_commission_paise bigint,
  aggregator_fees_paise bigint,        -- all swiggy/zomato fees combined
  aggregator_net_payout_paise bigint,  -- what we actually receive

  -- Payment
  payment_method payment_method NOT NULL,
  payment_method_raw text,             -- source's raw value (e.g. "CARD", "UPI", "Online")

  -- Customer (optional)
  customer_id uuid REFERENCES customers(id),
  customer_name_raw text,              -- what the file actually said
  customer_phone_last_4 text,          -- denormalized for display

  -- Notes
  biller text,                         -- Petpooja: who took the order
  kot_no text,                         -- Petpooja: kitchen order ticket
  notes text,                          -- free-form, rarely used

  -- Provenance
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id),
  raw_data jsonb NOT NULL,             -- full original row (audit, debugging, re-parsing)

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_orders_outlet_time ON sales_orders (outlet_id, ordered_at DESC);
CREATE INDEX idx_sales_orders_channel ON sales_orders (outlet_id, channel, ordered_at DESC);
CREATE INDEX idx_sales_orders_customer ON sales_orders (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_sales_orders_run ON sales_orders (ingestion_run_id);
CREATE INDEX idx_sales_orders_date ON sales_orders (outlet_id, (ordered_at::date));
```

**Why composite unique `(outlet_id, source, source_order_id)`:**
Petpooja and Swiggy both have an order for the same transaction, but with
different IDs. Both rows exist in `sales_orders` — `source` distinguishes
them. A `matched_order_id` self-reference could link them later if we want
to de-duplicate "same real-world order, two sources" for display (not v1).

**Why every amount is `bigint` in paise:**
Integer math. No float rounding surprises. All UI formatters divide by 100.

### `sales_line_items` table (stub — populated later)

Schema exists so we don't have to migrate later. Unused in v1 (no parser
writes to it yet).

```sql
CREATE TABLE sales_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  category text,
  quantity numeric(10,3) NOT NULL,
  unit_price_paise bigint NOT NULL,
  discount_paise bigint NOT NULL DEFAULT 0,
  tax_paise bigint NOT NULL DEFAULT 0,
  line_total_paise bigint NOT NULL,
  raw_data jsonb NOT NULL,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_line_items_order ON sales_line_items (order_id);
```

### `payment_transactions` table

Pine Labs POS transactions live here. Separate from `sales_orders` because
they represent money flow, not business transactions — a Pine Labs row is
"the terminal received ₹511 via UPI at 14:02" which may or may not map
cleanly to one Petpooja order.

```sql
CREATE TABLE payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  outlet_id uuid NOT NULL REFERENCES outlets(id),

  source text NOT NULL,                -- 'pine_labs' | future sources
  source_transaction_id text NOT NULL,
  UNIQUE (outlet_id, source, source_transaction_id),

  transaction_type text NOT NULL,      -- 'card_credit' | 'card_debit' | 'upi' | 'paper_pos' | etc.
  amount_paise bigint NOT NULL,
  currency text NOT NULL DEFAULT 'INR',
  transacted_at timestamptz NOT NULL,

  status text NOT NULL,                -- 'success' | 'failed' | 'pending'

  -- Card metadata (optional)
  card_issuer text,
  card_network text,                   -- 'VISA', 'MASTERCARD', 'RUPAY', etc.
  card_last_4 text,
  is_contactless boolean,
  is_emi boolean,

  -- UPI metadata (optional)
  upi_vpa text,                        -- ONLY last-5-chars + bank, not full VPA
  upi_name text,                       -- from the UPI app (nullable)

  -- Terminal
  hardware_id text,
  tid text,                            -- terminal ID
  mid text,                            -- merchant ID
  batch_no text,

  -- Reconciliation
  matched_order_id uuid REFERENCES sales_orders(id),
  match_confidence text,               -- 'exact' | 'heuristic' | 'unmatched' | NULL
  matched_at timestamptz,

  raw_data jsonb NOT NULL,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_txns_outlet_time ON payment_transactions (outlet_id, transacted_at DESC);
CREATE INDEX idx_payment_txns_unmatched ON payment_transactions (outlet_id) WHERE matched_order_id IS NULL;
```

Note on UPI VPA: we **do not** store full VPA (`goyalpiyush120-2@okhdfcbank`)
because it identifies the payer. We store the bank portion (`@okhdfcbank`)
and first/last few chars if needed for debugging. This is consistent with
the privacy stance on phones.

### `aggregator_payouts` table

Weekly payout summaries from Swiggy (and eventually Zomato). Not one row
per order — one row per payout period.

```sql
CREATE TABLE aggregator_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  outlet_id uuid NOT NULL REFERENCES outlets(id),
  source text NOT NULL,                -- 'swiggy' | 'zomato'
  period_start date NOT NULL,
  period_end date NOT NULL,
  UNIQUE (outlet_id, source, period_start, period_end),

  -- High-level
  total_orders int NOT NULL,
  cancelled_orders int NOT NULL DEFAULT 0,

  -- Revenue components (all paise)
  item_total_paise bigint NOT NULL,
  packaging_charges_paise bigint NOT NULL DEFAULT 0,
  restaurant_discount_share_paise bigint NOT NULL DEFAULT 0,
  gst_collected_paise bigint NOT NULL DEFAULT 0,
  total_customer_paid_paise bigint NOT NULL,

  -- Fees (all positive numbers, deducted from customer paid)
  commission_paise bigint NOT NULL DEFAULT 0,
  payment_collection_paise bigint NOT NULL DEFAULT 0,
  long_distance_paise bigint NOT NULL DEFAULT 0,
  swiggy_one_fees_paise bigint NOT NULL DEFAULT 0,
  pocket_hero_fees_paise bigint NOT NULL DEFAULT 0,
  bolt_fees_paise bigint NOT NULL DEFAULT 0,
  restaurant_cancellation_paise bigint NOT NULL DEFAULT 0,
  call_center_paise bigint NOT NULL DEFAULT 0,
  delivery_fee_sponsored_paise bigint NOT NULL DEFAULT 0,
  other_fees_paise bigint NOT NULL DEFAULT 0,
  gst_on_fees_paise bigint NOT NULL DEFAULT 0,
  total_fees_paise bigint NOT NULL,

  -- Deductions
  customer_cancellations_paise bigint NOT NULL DEFAULT 0,
  customer_complaints_paise bigint NOT NULL DEFAULT 0,
  gst_deduction_paise bigint NOT NULL DEFAULT 0,
  tcs_paise bigint NOT NULL DEFAULT 0,
  tds_paise bigint NOT NULL DEFAULT 0,
  total_taxes_paise bigint NOT NULL,

  -- Bottom line
  net_payout_paise bigint NOT NULL,
  settlement_date date,

  -- Adjustments from previous weeks
  adjustments_paise bigint NOT NULL DEFAULT 0,
  adjustments_detail jsonb,

  raw_data jsonb NOT NULL,
  ingestion_run_id uuid NOT NULL REFERENCES ingestion_runs(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_payouts_outlet_period ON aggregator_payouts (outlet_id, period_start DESC);
```

---

## Privacy & Hashing

### Phone number handling

1. **Normalize first.** `+91 98999 12345`, `9899912345`, `09899912345` all
   become `+919899912345` before hashing. Regex strip, then E.164 format.
2. **Reject placeholders.** Phones matching `^0+$` or `^9+$` or where all
   digits are the same are rejected at the normalizer — no customer created.
3. **Hash with salt.**
   ```typescript
   phone_hash = sha256(normalized_phone + PHONE_HASH_SALT);
   ```
   where `PHONE_HASH_SALT` is a Supabase environment variable (Vault-managed
   in production).
4. **Store hash + last 4.** `phone_last_4` is the last 4 digits of the
   normalized phone, plain text — for display only.
5. **Full phone never stored** in v1.

### Looking up by phone (customer service use case)

Partner says "Mrs. Sharma called, her number is 98999 12345, what did she
order last?" — server action:

```typescript
findCustomerByPhone(phone: string): Promise<CustomerWithOrders | null>
```

normalizes + hashes the phone on the server, queries by hash. The partner
types a phone, sees the customer's order history. Hash is never exposed to
the UI.

### Why this constraint

Because marketing campaigns ("send this offer to customers who haven't
visited in 30 days") are NOT possible from Stride OS as long as phones are
hash-only — there's nothing to send to. This is explicit and agreed. If/when
that changes, migration to plaintext is a one-session change.

### RLS on `customers`

- **SELECT:** partner — sees `id, phone_last_4, name, aggregates`. The
  `phone_hash` column is never exposed to clients; select queries that
  include it are blocked via a security-definer view.
- **INSERT / UPDATE:** server-only (triggered by ingestion commit)
- **DELETE:** never in v1; a future "forget me" action can null out PII
  fields

---

## Parsers

Each parser implements the framework's `Parser<TRaw, TCanonical>` contract.
Implementation details follow the structure of real files per
`ingestion-analysis.md`.

### 1. Petpooja Orders Master Parser

- **Source type:** `petpooja_orders_master`
- **Accepts:** `.xlsx`, `.csv`
- **Detection:**
  - Filename matches `Orders_Master_Report_*` → confidence 0.9
  - Row 1 contains `Name: Orders: Master Report` → confidence 0.95
  - Row 5 has exactly 43 specific column headers → confidence 0.99

**Parse rules:**

- Skip rows 0–4 (metadata + blank)
- Row 5 = header
- Rows 6–9 are summary aggregates (`Total`, `Min.`, `Max.`, `Avg.`) — skip by checking `Invoice No.` column for numeric match
- Each subsequent row with numeric `Invoice No.` is a record
- Reject rows where `Status != 'Success'` (v1 doesn't handle cancellations)

**Field mapping → `sales_orders`:**

| Petpooja column          | Canonical field               | Transform                                                                                                  |
| ------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Invoice No.`            | `source_order_id`             | cast to text                                                                                               |
| `Date`                   | `ordered_at`                  | parse as IST timestamp                                                                                     |
| `Payment Type`           | `payment_method`              | map: CARD→card, UPI→upi, Online→online_aggregator, Cash→cash, Not Paid→not_paid, Part Payment→part_payment |
| `Payment Type`           | `payment_method_raw`          | verbatim                                                                                                   |
| `Sub Order Type`         | `channel`                     | Dine In→dine_in, Swiggy→swiggy, Zomato→zomato, Pick Up→takeaway, others→other                              |
| `Order Type`             | `order_type_raw`              | verbatim                                                                                                   |
| `Area`                   | `area_raw`                    | verbatim                                                                                                   |
| `Status`                 | `status`                      | always `success` in v1                                                                                     |
| `My Amount (₹)`          | `gross_amount_paise`          | × 100, round                                                                                               |
| `Discount (₹)`           | `discount_amount_paise`       | × 100, round                                                                                               |
| `Net Sales (₹)(M.A - D)` | `net_amount_paise`            | × 100, round                                                                                               |
| `Delivery Charge`        | `delivery_charge_paise`       | × 100, round                                                                                               |
| `Container Charge`       | `packaging_charge_paise`      | × 100, round                                                                                               |
| `Service Charge`         | `service_charge_paise`        | × 100, round                                                                                               |
| `Total Tax (₹)`          | `tax_amount_paise`            | × 100, round                                                                                               |
| `Round Off`              | `round_off_paise`             | × 100, round                                                                                               |
| `Total (₹)`              | `total_amount_paise`          | × 100, round                                                                                               |
| `CGST@2.5`               | `cgst_paise`                  | × 100, round                                                                                               |
| `SGST@2.5`               | `sgst_paise`                  | × 100, round                                                                                               |
| `GST Paid by Merchant`   | `gst_paid_by_merchant_paise`  | × 100, round                                                                                               |
| `GST Paid by Ecommerce`  | `gst_paid_by_ecommerce_paise` | × 100, round                                                                                               |
| `Phone`                  | customer extraction           | reject `0000000000`                                                                                        |
| `Name`                   | customer extraction           | reject `Abc`, short strings                                                                                |
| `Biller`                 | `biller`                      | verbatim                                                                                                   |
| `KOT No.`                | `kot_no`                      | verbatim                                                                                                   |

**Dedup:** `(outlet_id, source='petpooja', source_order_id)` unique index.
Reject row as duplicate if already exists.

**Customer extraction:**

- If `Phone` is non-placeholder AND `Name` is non-placeholder → create/link customer
- If only `Name` is real AND channel is Swiggy/Zomato → create customer with no phone hash, name only
- Otherwise → `customer_id` is null

### 2. Petpooja Day-Wise Validation Parser

- **Source type:** `petpooja_day_wise`
- **Accepts:** `.xlsx`
- **Detection:**
  - Filename matches `*_Miracle_*` or `*_DayWise_*` → confidence 0.6
  - Row 1 contains `All Restaurant Report: Day Wise` → confidence 0.95

**Parse rules:** skip rows 0–3, header at row 4, aggregates at 5–8, daily
data from row 9.

**Canonical write:** **None in v1.** This parser writes nothing to
canonical tables. Instead it:

- Reads each daily row
- Computes the equivalent aggregate from already-ingested `sales_orders` for
  the same outlet and date
- Generates a **validation report**: list of days where computed totals
  match or mismatch Petpooja's day-wise totals
- Stores report as `preview_payload` + a note entry, no data insertion

This is a pure reconciliation tool to verify other parsers are correct.
If discrepancies are systematic, it's a parser bug.

### 3. Pine Labs POS Parser

- **Source type:** `pine_labs_pos`
- **Accepts:** `.xlsx`
- **Detection:**
  - Filename contains `Pinelab` (case-insensitive) → confidence 0.9
  - Row 0 columns match Pine Labs schema (TID, MID, Acquirer, etc.) → confidence 0.95

**Parse rules:**

- Row 0 = header
- Drop rows with all-null content
- **Strip leading backtick** from `Transaction Id` (`` `1219779573 `` → `1219779573`)
- Combine `Transaction Date` + `Time` (strip leading `T`) → single IST timestamp

**Field mapping → `payment_transactions`:**

| Pine Labs column                                | Canonical field                                   |
| ----------------------------------------------- | ------------------------------------------------- |
| `Transaction Id` (strip `` ` ``)                | `source_transaction_id`                           |
| `Report Type` + `Sub Report Type` + `Card Type` | `transaction_type` (mapped enum)                  |
| `Transaction Amount` × 100                      | `amount_paise`                                    |
| `Transaction Date` + `Time`                     | `transacted_at`                                   |
| `Transaction Status`                            | `status`                                          |
| `Card Issuer`                                   | `card_issuer`                                     |
| `Card Network` (trimmed)                        | `card_network`                                    |
| `Customer Payment Mode ID` (last 4)             | `card_last_4` (for card types)                    |
| `Customer Payment Mode ID` (VPA)                | `upi_vpa` (for UPI — truncated per privacy rules) |
| `Name`                                          | `upi_name` (UPI only)                             |
| `Is Emi`                                        | `is_emi`                                          |
| `Contactless`                                   | `is_contactless`                                  |
| `Hardware ID`                                   | `hardware_id`                                     |
| `TID`, `MID`, `Batch No`                        | respective columns                                |

**Outlet assignment:** all rows → the outlet the user selected at upload.
Pine Labs `Store Name` / `Store Address` / `City` are stored in `raw_data`
for audit but not used for attribution (see analysis doc — sample file
had wrong-looking store name).

**Match to `sales_orders` (v1 best-effort):** after commit, a background
reconciliation query attempts to match each transaction by
`(outlet_id, transacted_at within ±5 min, amount within ±1 rupee)`.
If 1 candidate → `matched_order_id` set, `match_confidence='heuristic'`.
If 0 or >1 candidates → `match_confidence='unmatched'`.

### 4. Swiggy Weekly Annexure Parser

- **Source type:** `swiggy_annexure`
- **Accepts:** `.xlsx`
- **Detection:**
  - Filename matches `invoice_Annexure_*.xlsx` → confidence 0.85
  - Sheet names include `Order Level`, `Payout Breakup`, `Summary` → confidence 0.99

**Parse rules:**

- Multi-sheet file; parse three sheets:
  - **Summary** → payout period, settlement date, total metadata
  - **Payout Breakup** → weekly aggregate figures
  - **Order Level** → one row per order
- Order Level sheet has header at row 2 (rows 0–1 are a title and
  numbering scheme)
- **Column names contain newlines and bracket notation** — normalize by
  stripping `\n`, trailing whitespace, and `[…]` suffix before matching
- Skip rows where `Order ID` is null

**Writes to TWO canonical tables per run:**

**A) `sales_orders`** (one per row in Order Level sheet):

| Swiggy column (normalized)                 | Canonical field               | Notes                                                         |
| ------------------------------------------ | ----------------------------- | ------------------------------------------------------------- |
| `Order ID`                                 | `source_order_id`             |                                                               |
| `Order Date`                               | `ordered_at`                  |                                                               |
| `Order Status`                             | `status`                      | `delivered`→success, `cancelled`→cancelled (skip in v1), etc. |
| `Order Category`                           | —                             | always "Swiggy" in Swiggy file                                |
| —                                          | `channel`                     | always `swiggy`                                               |
| `Item Total` × 100                         | `gross_amount_paise`          |                                                               |
| `Packaging Charges` × 100                  | `packaging_charge_paise`      |                                                               |
| `Restaurant Discount Share` × 100          | `discount_amount_paise`       |                                                               |
| `Net Bill Value (before taxes)` × 100      | `net_amount_paise`            |                                                               |
| `GST Collected` × 100                      | `tax_amount_paise`            |                                                               |
| `Total Customer Paid` × 100                | `total_amount_paise`          |                                                               |
| `Commission` × 100                         | `aggregator_commission_paise` | stored as positive                                            |
| `Total Swiggy Fees` × 100                  | `aggregator_fees_paise`       | stored as positive                                            |
| `Net Payout for Order (after taxes)` × 100 | `aggregator_net_payout_paise` |                                                               |
| —                                          | `payment_method`              | `online_aggregator`                                           |

**B) `aggregator_payouts`** (one row for the whole file):

Fields from Payout Breakup sheet, aggregated into the canonical payout
shape (see schema).

**Dedup:**

- Orders: `(outlet_id, source='swiggy', source_order_id)` unique
- Payouts: `(outlet_id, source='swiggy', period_start, period_end)` unique

### 5. Zomato Parser — STUB

- **Source type:** `zomato_annexure`
- **Accepts:** `.xlsx`
- **Detection:** filename contains `zomato` (case-insensitive) → confidence 0.8
- **Parse:** throws `ParserNotImplementedError` with message "Zomato parser awaiting sample file. Please contact admin so we can build this."
- Registered so the UI can detect the file type and inform the user rather than silently failing classification.

---

## Preview UI — Per-Parser Components

Each parser provides a `previewComponent` rendered on `/ingest/[runId]` when
status is `preview_ready`.

### Petpooja Orders Master preview

- Header: "Petpooja Orders Master Report — Elan Miracle, March 2026"
- Summary tiles:
  - 431 orders parsed
  - 428 will be inserted
  - 3 already exist (duplicates)
  - 0 parse errors
  - Gross: ₹1,93,837 · Net: ₹1,76,699 · Discounts: ₹17,138 · Total collected: ₹1,87,180
- Channel breakdown (dine-in vs Swiggy vs Zomato vs takeaway)
- Payment method breakdown
- Date range covered
- New customers that will be created: 47 (from aggregator orders)
- Spot-check table: first/last 10 orders with key fields
- Duplicate list: invoice numbers that already exist

### Pine Labs preview

- Summary: 303 transactions · ₹X total · 0 failed
- Transaction type breakdown (UPI / Card Credit / Card Debit / Paper POS)
- Date range
- Reconciliation preview: "Matches to existing Petpooja orders: 267 exact / 28 heuristic / 8 unmatched"
- Spot-check table

### Swiggy Annexure preview

- Summary: "Weekly payout 22-28 Mar 2026 · Elan Miracle"
- Top-line: 18 orders · Total paid by customers ₹5,348 · Net payout ₹3,083
- Will write: 18 new order rows, 1 payout row
- Reconciliation: "Cross-check against Petpooja Swiggy orders same period: Petpooja shows 17 orders, Swiggy shows 18. Discrepancy will be flagged on dashboard."
- Fee breakdown table
- Any existing orders that will be updated (rare)

### Petpooja Day-Wise preview (validation only)

- Header: "Petpooja Day-Wise Summary — Validation"
- Reconciliation table: for each day in file, show:
  - Petpooja's stated Total Sales
  - Computed Total Sales from ingested orders
  - Variance (₹ and %)
- Banner: "No data will be written. This is a validation check only."
- Commit button label reads "Acknowledge" (not "Write") to make it clear

---

## Server Actions (additions to framework)

Most logic lives in the framework. Sales-ingestion specifically adds:

```typescript
// Find customer by phone for support/lookup (partner-only)
// Hashes internally; never exposes the hash
findCustomerByPhone(phone: string): Promise<{
  id: string;
  name: string | null;
  phone_last_4: string | null;
  total_orders: number;
  total_spend_paise: number;
  last_seen_at: string;
} | null>

// Reconciliation views (read-only)
getDailyReconciliation(outletId: string, date: string): Promise<{
  petpooja_total_paise: bigint;
  computed_total_paise: bigint;
  pine_labs_total_paise: bigint;
  variance_pct: number;
}>
```

---

## LLM-Assisted Ingestion Design

LLM integration is worth adding here, but only for the parts of ingestion
that are ambiguous, drift-prone, or expensive to maintain with pure
heuristics. Deterministic parsing still remains the default for every
known source.

### Where LLMs make sense

- **Borderline file classification**
  - When filename and header inspection are both low-confidence but not
    fully unknown, an LLM can look at a compact workbook summary:
    filename, sheet names, first few rows, and header candidates
  - Output: `source_type`, confidence, and a human-readable reason
- **Header synonym mapping**
  - Useful when vendors slightly rename columns, insert extra annotation,
    or reorder sheets in a way that breaks brittle string matching
  - Output: a normalized header map only, never raw row transforms
- **Sheet-role identification for messy multi-sheet workbooks**
  - Example: deciding which sheet is "order level" vs "summary" vs
    "payout breakup" when titles drift
- **Operator-facing error explanation**
  - Convert a technical parse failure into a short, safe explanation:
    "This looks like a Swiggy annexure, but the Order Level sheet is
    missing the Order ID column."
- **Future PDF/image extraction**
  - Not needed for current v1 spreadsheets, but very relevant later for
    invoices, P&L PDFs, scanned franchise reports, and emailed statements

### Where LLMs do NOT make sense

- Parsing standard `.xlsx` / `.csv` rows from known exports
- Money conversion, date normalization, timezone handling
- Deduplication rules
- Canonical field math
- Customer hashing / privacy logic
- Writing directly to canonical tables without deterministic validation

### Design principle

LLMs are **advisory**, not authoritative, for ingestion v1.

The pipeline stays:

1. Deterministic detection
2. Deterministic parser
3. LLM fallback only when confidence is low or schema drift is detected
4. Deterministic validation before preview
5. Human review before commit

If the LLM output cannot be validated against explicit parser constraints,
the run fails safely and asks the user for manual source selection or file
replacement.

### Proposed integration points

```typescript
interface LlmClassificationSuggestion {
  source_type:
    | "petpooja_orders_master"
    | "petpooja_day_wise"
    | "pine_labs_pos"
    | "swiggy_annexure"
    | "zomato_annexure"
    | "unknown";
  confidence: number;
  reason: string;
}

interface LlmHeaderMappingSuggestion {
  source_type: string;
  mapped_headers: Record<string, string>;
  unmatched_headers: string[];
  confidence: number;
}
```

Suggested package boundary:

- `packages/ingestion/src/llm/`
  - `classifyWorkbook.ts`
  - `mapHeaders.ts`
  - `types.ts`
  - `prompts.ts`

Suggested runtime behavior:

- Only invoked when deterministic detection confidence is below a threshold
  like `0.7`, or when a parser fails on missing required columns but the
  file otherwise looks close to a known source
- Input must be minimized:
  - filename
  - sheet names
  - first 10–20 rows per candidate sheet
  - never full customer data dump if avoidable
- Output must be JSON and validated with Zod before use
- Any LLM-derived mapping is shown in the preview/audit trail so operators
  can understand why a file was accepted

### OpenAI configuration

Leave the key at the app layer via env var:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5-mini
INGESTION_LLM_ENABLED=false
INGESTION_LLM_CLASSIFICATION_THRESHOLD=0.70
```

Notes:

- `OPENAI_API_KEY` is server-only; never exposed to the client
- `INGESTION_LLM_ENABLED` defaults to `false` for local and initial prod rollout
- `OPENAI_MODEL` is configurable so we can start cheap and upgrade later
- If the key is absent, ingestion still works fully for known deterministic
  parsers

### Audit + safety requirements

- Store whether LLM assistance was used in `preview_payload` and later, if
  needed, on `ingestion_runs.error_details` / a future audit column
- Log:
  - trigger reason
  - model used
  - prompt version
  - confidence returned
  - accepted vs rejected suggestion
- Never send plaintext phone numbers or full sensitive identifiers to the
  model unless there is a later, explicit approved use case
- Never allow LLM output to bypass preview and commit review

### Rollout recommendation

- **Phase A:** deterministic-only, current v1 behavior
- **Phase B:** LLM-assisted classification and header mapping behind
  `INGESTION_LLM_ENABLED`
- **Phase C:** richer document extraction for PDFs and unstructured sources

This gives us the upside of LLMs where they truly reduce maintenance cost,
without making the financial ingestion path feel magical or unsafe.

---

## RLS Policies

All tables in this feature have the same pattern: **partners SELECT all;
managers SELECT only their outlets' data; all writes go through server
actions (no direct INSERT/UPDATE/DELETE from clients).**

Exception: `customers.phone_hash` is blocked from client reads entirely —
queries must go through the server-side `findCustomerByPhone` action.

---

## Backfill Considerations

The upload flow is identical for historical and current data. What makes
backfill work cleanly:

1. **Dedup by composite unique keys** — uploading the same March file twice
   after already having April data doesn't duplicate March.
2. **Customer aggregates are recomputed on commit** — a trigger on
   `sales_orders` INSERT updates `customers.total_orders`,
   `customers.total_spend_paise`, `customers.first_seen_at`,
   `customers.last_seen_at`. Handles out-of-order uploads correctly.
3. **Date-range previews** — preview screen clearly shows date range of
   data being committed so user can't accidentally backfill into the
   wrong week.
4. **File size limits generous enough** for 100k+ row historical exports.

---

## Edge Cases

- **Petpooja "Swiggy" orders also appear in Swiggy annexure.** Both are
  ingested; `source` differs. A future reconciliation feature (not v1)
  may link them. For now they're two rows representing two legitimate
  views of the same real-world event.
- **Order with refund.** v1 doesn't ingest refunded orders. If a refund
  happens after initial ingestion, the user must either manually note it
  or wait for a future cancellations feature.
- **Customer's phone changes.** New phone = new hash = new customer row.
  No deterministic way to link. Acceptable for v1.
- **Pine Labs transaction without a matching Petpooja order.** Row is
  still ingested. `match_confidence='unmatched'`. Shows up on a later
  reconciliation dashboard.
- **Aggregator orders where Petpooja says net=₹460 but Swiggy says
  item_total=₹558.** Different fields! Petpooja's `My Amount` is
  post-item-discount; Swiggy's `Item Total` is pre-discount. Both stored
  as written; the reconciliation feature reconciles at the canonical field
  level.
- **Timezone.** Everything stored as `timestamptz`. Source files assume
  IST; parser explicitly localizes to `Asia/Kolkata`.

---

## Out of Scope (Deferred, Confirmed)

- Zomato parser (awaiting sample)
- Item-level sales data (schema stub only; parser later when Petpooja's item-wise report is sampled)
- Cancelled/refunded orders
- Petpooja API direct integration
- Gmail auto-ingest
- Sales dashboards (separate feature)
- Full Pine Labs ↔ Petpooja reconciliation UI
- Customer outreach / marketing (blocked until plaintext phones, which is its own decision)
- P&L ingestion (separate feature)
- Expenses / vendor invoice ingestion (separate feature)

---

## Definition of Done

- Partner uploads Petpooja Orders Master, Pine Labs, and Swiggy Annexure files and each is correctly detected, parsed, previewed, and committed
- Customer records are created with hashed phones and last-4 only
- Uploading the same file twice is rejected at the dedup layer
- `findCustomerByPhone` returns the right customer given any phone format (with/without country code, with/without spaces)
- Pine Labs transactions attempt auto-matching to Petpooja orders on commit
- Aggregator payouts table gets one new row per Swiggy annexure
- Day-wise validation report surfaces variances clearly and writes no data
- Rollback deletes all canonical rows for the run; customer aggregate triggers update correctly
- RLS verified: a manager test user never sees `customers.phone_hash` or another outlet's sales
- `pnpm typecheck && pnpm build` pass
- Integration tests cover all three parsers against the real sample fixtures (redacted)
- CLAUDE.md updated with Sales Ingestion in Implemented Features
