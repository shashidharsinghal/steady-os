# Feature: Customer Intelligence

**Status:** Draft
**Last updated:** 2026-04-19
**Related:** `dashboard-v2.md`, `ai-stack-architecture.md`,
`sales-ingestion.md`
**Depends on:** Sales ingestion committed; Pine Labs data ingested for
dine-in visibility.

---

## Purpose

Surface the single biggest finding from the data audit: **dine-in
regulars are invisible in Petpooja and hiding in Pine Labs data.**

No other tool you use shows you:

- Which specific customers have visited multiple times
- Whether a Swiggy/Zomato customer has also paid at your POS (potential
  cross-channel match)
- Which customers haven't been back in N days (lapsed)
- Which customers are closest to becoming regulars

This feature unifies the three sources — Petpooja orders (named
aggregator customers), Pine Labs UPI (dine-in regulars), and Pine Labs
card transactions (dine-in regulars via card last-4) — into a single
Customer table with a list view and individual detail pages.

This is Stride OS's single most differentiated feature. Nobody else
offers this for a GDC franchise operator.

---

## Data Reality Check (what the audit actually found)

From March 2026 data for Elan Miracle:

- **Petpooja named customers:** 72 unique. Mostly aggregator orders.
  88% are one-time customers. Top regulars: `neha malhotra` (4 orders),
  `nikita garg` (4 orders), `mamta` (4 orders), `anshul` (4 orders).
- **Pine Labs UPI VPAs:** 218 unique payers, 12 came back (6% repeat).
  Top: `garg.nikki1990@okicici` (4 visits, ₹2,733),
  `9873508174@ptyes` (3 visits), `shashidhar.singhal@okicici` (3).
- **Pine Labs cards:** 56 unique cards (by last-4), 9 came back (16%
  repeat).

**Notice:** `nikita garg` appears in Petpooja aggregator customer list
AND `garg.nikki1990@okicici` is a top UPI repeat customer. **This is
very likely the same person** — ordering from Swiggy/Zomato sometimes
and dining in sometimes. Her true value is being a regular, but no
existing tool would tell you that.

Unifying this is the point of this feature.

---

## Scope

### In scope

- Unified `customers` view combining:
  - Petpooja customers (phone_hash-based identity, via aggregators)
  - Pine Labs UPI payers (upi_vpa-based identity)
  - Pine Labs card users (card_last_4 + card_issuer-based identity)
- Customer list with filter/sort/search
- Customer detail page showing full interaction history across sources
- Heuristic matching between sources (suggested matches; partner approves)
- Aggregate customer metrics: total orders, total spend, frequency, recency
- Customer segments (regulars, new, lapsed, churned)
- Lapsed regulars list (actionable)
- Partner-only

### Explicitly out of scope

- Automated outreach (WhatsApp campaigns, SMS) — requires plaintext
  phones, currently hashed; separate decision
- Customer profile editing by operators (no name corrections in v1)
- Per-customer preferences or notes
- LLM-generated customer summaries (belongs to Tier 2 if ever)
- Loyalty program mechanics
- External data enrichment (LinkedIn, etc)

---

## The Data Model Challenge

Existing `customers` table (from Sales Ingestion spec) keys on
`phone_hash`. Pine Labs data doesn't have a phone — it has UPI VPAs and
card last-4s. We need to extend the model.

### Approach: `customer_identities` table

Keep `customers` as the canonical customer record. Add a separate table
that holds all _known identifiers_ for a customer — multiple per
customer.

```sql
CREATE TYPE identity_kind AS ENUM (
  'phone_hash',       -- from Petpooja / aggregator orders
  'upi_vpa',          -- from Pine Labs UPI; stored as provided (not hashed — it's already a pseudonym)
  'card_fingerprint'  -- card last_4 + issuer + network, not full number
);

CREATE TABLE customer_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  kind identity_kind NOT NULL,
  value text NOT NULL,              -- the hash, VPA, or fingerprint string
  display_value text,               -- what to show in UI (e.g., "…1234" for card, "garg.nikki…" for VPA)
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  observation_count int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kind, value)              -- each identifier maps to one customer
);

CREATE INDEX idx_customer_identities_customer ON customer_identities (customer_id);
CREATE INDEX idx_customer_identities_kind_last_seen ON customer_identities (kind, last_seen_at DESC);
```

**Key design:** during ingestion, every order/transaction inserts (or
updates) an identity. New unique identity = new customer row. Two
identities are linked to one customer only via explicit merge action
(manual or heuristic suggestion, always partner-approved).

### Card fingerprint construction

For cards, we don't have unique identifiers — just last 4 digits. Two
different cards can share last 4. The fingerprint combines more signal:

```
card_fingerprint = sha256(
  card_last_4 + "|" + card_issuer + "|" + card_network + CARD_FP_SALT
)
```

This is probably-unique-enough for our scale. Collisions are rare (two
customers sharing same issuer, network, and last-4) and the consequence
of a collision is merging two records — recoverable, not catastrophic.

### UPI VPA handling

UPI VPAs are already pseudonymous (`garg.nikki1990@okicici` doesn't
directly identify someone). Stored as-is for matching. Display in UI
shows a truncated version: `garg.nikki…@okicici`.

### Customer aggregates

Trigger maintains `customers.total_orders`, `total_spend_paise`,
`first_seen_at`, `last_seen_at` — computed across all identities. One
customer with 5 aggregator orders + 3 Pine Labs UPI txns shows
total_orders=8.

---

## Identity → Order Association

A sales_order or payment_transaction needs to link to the customer via
whichever identity was observed. Extending existing tables:

### sales_orders

Already has `customer_id`. During ingestion normalization:

1. Compute phone_hash from name/phone (if real)
2. Look up in `customer_identities` where kind='phone_hash' AND value=computed_hash
3. If found → link to that customer_id
4. If not → create customer + identity, then link

### payment_transactions

Add `customer_id` nullable FK. During Pine Labs ingestion:

1. For UPI txn: compute/lookup `customer_identities` where kind='upi_vpa' AND value=upi_vpa
2. For card txn: compute fingerprint, lookup where kind='card_fingerprint'
3. Create customer + identity if not found
4. Link the txn

```sql
ALTER TABLE payment_transactions ADD COLUMN customer_id uuid REFERENCES customers(id);
CREATE INDEX idx_payment_txns_customer ON payment_transactions (customer_id) WHERE customer_id IS NOT NULL;
```

---

## Heuristic Matching (the "are these the same person?" feature)

We won't auto-merge different identities. Too risky — a wrong merge
conflates two customers irreversibly. But we can _suggest_ matches for
partner approval.

### Matching signals

For a pair of customer records to be suggested as potentially same:

1. **Name match:** Petpooja customer's name fuzzy-matches the name on a
   Pine Labs UPI VPA (VPAs often contain first/last name hints like
   `garg.nikki1990@okicici`). Jaro-Winkler similarity > 0.8.
2. **Temporal coincidence:** Petpooja aggregator order and Pine Labs
   dine-in txn within the same 2-hour window, similar amount. Possible
   same person but low confidence.
3. **Transitive:** if identities A and B are both linked to customer
   X, and identity C appears alongside A's transactions enough times,
   suggest C for merging into X.

In v1, **implement only signal 1** — name fuzzy match. It's the cleanest.

### Merge suggestions UI

A "Suggested merges" queue. Partner sees:

```
┌──────────────────────────────────────────────────────┐
│ Potential same person                                 │
│                                                       │
│ Petpooja customer:  nikita garg                       │
│   4 aggregator orders, ₹1,745 spent, last 10 Apr     │
│                                                       │
│ Pine Labs UPI:      garg.nikki1990@okicici            │
│   4 dine-in visits, ₹2,733 spent, last 28 Mar        │
│                                                       │
│ Confidence: 85%  (name match)                         │
│                                                       │
│ [ Merge into one customer ] [ Not the same person ]   │
│ [ Review later ]                                      │
└──────────────────────────────────────────────────────┘
```

Merging is a server action:

- Picks the "primary" customer (usually the one with more identities)
- Updates all identities to point to the primary
- Recomputes aggregates
- Logs the merge in `customer_merges` audit table (reversible for 30 days)

"Not the same person" suppresses the suggestion permanently (stored in
`customer_dismissed_matches`).

---

## Segmentation Rules

Deterministic rules applied in SQL:

| Segment           | Definition                                                   |
| ----------------- | ------------------------------------------------------------ |
| **New**           | `first_seen_at` within last 30 days                          |
| **Active**        | `last_seen_at` within last 30 days AND total_orders ≥ 2      |
| **Regular**       | total_orders ≥ 3 AND last_seen_at within last 30 days        |
| **Super-regular** | total_orders ≥ 6 (no recency requirement)                    |
| **Lapsed**        | total_orders ≥ 2 AND last_seen_at between 30 and 90 days ago |
| **Churned**       | total_orders ≥ 2 AND last_seen_at > 90 days ago              |
| **One-timer**     | total_orders = 1                                             |

These aren't mutually exclusive — a regular is also active. UI shows
the "highest value" segment per customer (e.g., super-regular trumps
regular trumps active).

---

## Pages and Routes

### `/customers` — List view

Default route in left sidebar. Partner-accessible.

**Filters (top strip):**

- Segment: [All / Regular / Lapsed / Churned / New / One-timer]
- Has aggregator orders: yes/no/any
- Has dine-in: yes/no/any
- Last seen: [All time / 7d / 30d / 90d]
- Minimum orders: slider 1–10+

**Search:** by name (fuzzy), by phone last-4, by VPA substring, by card last-4.

**Table columns:**

- Identifier (primary display: name if known, else VPA excerpt, else "…1234 HDFC credit")
- Segment badge
- Total orders
- Total spend (₹)
- Channels (small icons: dine-in + aggregator breakdown)
- First seen
- Last seen (with "N days ago" hint)
- [View →]

**Sorting:** total_orders, total_spend, last_seen (default), first_seen.

**Pagination:** 50 per page, virtualized table for large results.

**Secondary actions at top:**

- "Suggested merges (12) →" (link to review queue)
- "Lapsed regulars (8) →" (shortcut to the high-value action list)

### `/customers/[id]` — Detail view

Per-customer deep dive:

**Header:**

- Display name + segment badge
- Phone last-4, VPA list, card fingerprints — all known identities
- Lifetime stats: N orders, ₹X spent, first seen, last seen
- Action buttons: "Merge with another customer...", "Mark as dismissed"

**Sections:**

- Order history timeline (across all sources, chronological)
- Channel mix chart (this customer only)
- Average AOV over time
- Dormancy indicator ("No orders in 42 days")

### `/customers/merges` — Merge suggestion queue

Table of pending suggestions. Actions: merge / dismiss / snooze.

### `/customers/lapsed` — Lapsed regulars action list

Special view: customers who were regular or super-regular and haven't
been back in 30+ days. Sorted by their lifetime spend descending.

**Why this exists:** it's the single most actionable customer list.
Whether outreach is manual (calling them) or automated (future), these
are the people worth your attention.

Because phones are hashed, outreach from Stride OS is not possible in
v1. The list is still useful as:

- A reminder to yourself at the counter when they walk back in
- A list to staff ("if any of these people come in this week, make
  sure they feel recognized")
- Ammunition for future outreach when plaintext phones or external
  outreach tools are added

### `/customers/segments` — Segment overview

Summary page with one card per segment:

- Segment name + customer count
- Aggregate spend contribution
- Average order count per customer
- Trend (month-over-month change in size)

Useful for the 2-minute operator check: "Is my regulars segment growing
or shrinking?"

---

## Server Actions

Location: `apps/web/app/(app)/customers/actions.ts`

```typescript
// Listing and querying
listCustomers(params: CustomerListParams): Promise<{ rows: CustomerRow[]; total: number }>;
getCustomer(customerId: string): Promise<CustomerDetail>;
getCustomerOrders(customerId: string): Promise<OrderTimelineEntry[]>;
getSegmentOverview(outletId: string): Promise<SegmentOverview[]>;
getLapsedRegulars(outletId: string): Promise<LapsedCustomer[]>;

// Merges (partner only)
suggestMerges(outletId: string): Promise<MergeSuggestion[]>;
mergeCustomers(primaryId: string, secondaryId: string, reason?: string): Promise<void>;
dismissMergeSuggestion(suggestionId: string, reason?: string): Promise<void>;

// Undo
undoMerge(mergeId: string): Promise<void>;  // only within 30d window

// Private helper, called during ingestion (not exposed)
findOrCreateCustomerByIdentity(
  identity: { kind: IdentityKind; value: string; displayValue?: string },
  outletId: string,
  observedAt: Date,
  runId: string,
): Promise<{ customerId: string; isNew: boolean }>;
```

---

## RLS

- **`customers`:** partners SELECT all; managers SELECT customers with
  identities observed in their outlets (joined through
  `sales_orders`/`payment_transactions`)
- **`customer_identities`:** same as customers
- **`customer_merges`:** partners only
- **Merges (server action):** partner only

---

## UI Components

Location: `apps/web/app/(app)/customers/_components/`

- `CustomerListTable.tsx`
- `CustomerFilters.tsx`
- `SegmentBadge.tsx`
- `CustomerChannelIcons.tsx`
- `CustomerTimeline.tsx` (detail page)
- `CustomerIdentitiesCard.tsx`
- `MergeSuggestionCard.tsx`
- `ConfirmMergeDialog.tsx`
- `LapsedRegularsTable.tsx`

---

## Key Edge Cases

- **Deleted Pine Labs run (rollback).** Identities and customers
  created by that run get their `observation_count` decremented. If an
  identity's count drops to zero, the identity is deleted; if a
  customer's identities are all gone, the customer is deleted. Handled
  by the existing rollback mechanism via `ingestion_run_id` tracking.
- **Same phone used by two people.** Rare in practice — a family
  sharing a number — but possible. Merge-dismiss gives partners an
  escape hatch.
- **Aggregator name variations.** "Neha Malhotra" vs "neha malhotra" vs
  "Neha M" — normalize aggressively before hashing (lowercase, trim,
  collapse whitespace, remove titles). Still won't catch everything.
- **Card without issuer information.** Pine Labs occasionally emits a
  transaction with missing card_issuer. Fingerprint falls back to
  `last_4 + "unknown" + network`; rare collisions get caught by
  observation_count jumping and flagged for review.
- **Cross-outlet customers.** If Wafflesome ever serves someone who
  also visits GDC Elan, their UPI VPA ties them together. Customer
  table is cross-outlet (no outlet_id). Queries filter by outlet via
  joining to observed orders/transactions.

---

## Privacy Notes

Restating because it's important: **no plaintext phone numbers are
stored anywhere.** Customer phones remain hashed. Display uses
last-4 digits.

UPI VPAs are stored in plaintext because:

- They're already pseudonymous by design
- Needed for exact matching across Pine Labs uploads
- Format doesn't directly reveal identity (`garg.nikki1990@okicici`
  requires resolving via bank to reveal the person)

Card numbers: only last-4 + issuer + network stored. Fingerprint is
derived via salted hash.

Names: stored as given (from order/VPA). These are already present in
the source files; we don't increase risk by storing them.

Partners can see all customer data for their outlets. Managers (when
login ships) see only customers observed in their outlets. No one
outside the partner/manager role ever sees customer data.

---

## Definition of Done

- A partner can visit `/customers` and see a unified list combining
  Petpooja and Pine Labs sources
- A partner can click any customer and see their full interaction
  history across sources
- Merge suggestions surface at least one true-positive in the sample
  data (e.g., `nikita garg` + `garg.nikki1990@okicici`)
- Merging is reversible within 30 days
- Lapsed regulars page surfaces customers who were regulars but went
  quiet
- Dashboard v2's Customer Tiles link correctly into this feature
- RLS verified: manager cannot see customers from another outlet
- `pnpm build && pnpm typecheck` clean
- Integration test: seed with both Petpooja + Pine Labs fixtures, assert
  merged identities and segmentation correctness
- CLAUDE.md updated with Customer Intelligence as an implemented feature
