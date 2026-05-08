# Feature: Sales Dashboard v2

**Status:** Draft
**Last updated:** 2026-04-19
**Related:** `ai-stack-architecture.md`, `sales-ingestion.md`,
`customer-intelligence.md`, `insights-engine.md`
**Depends on:** Sales ingestion committed; at least 4 weeks of data for
day-of-week comparisons; the previous dashboard-v1 is being replaced.
**Supersedes:** `sales-dashboard.md` (v1)

---

## Why v2 Exists

Dashboard v1 shipped but didn't earn its keep. Feedback was "not super
insightful" — and the retrospective was that v1 answered questions other
tools (Petpooja, Swiggy partner app) already answer, just with better
styling. It didn't expose what's unique to Stride OS: unified
cross-channel visibility, day-of-week-aware comparisons, and the dine-in
repeat-customer patterns hiding in Pine Labs data.

This spec re-designs the dashboard around **specific questions an
owner-operator asks each morning that nothing else can answer.**

It is a pure Tier 1 feature — deterministic SQL, instant load, no LLM.
Insights (Tier 2) and Recommendations (Tier 3) plug into designated
slots on this page later.

---

## The Five Questions This Dashboard Must Answer

Every element earns its place by helping answer one of these:

1. **How did I do, given what day it is?** Not "vs 7-day average" — vs
   "Tuesdays in the last 4 weeks." Saturdays and Tuesdays are different
   businesses.
2. **When today will money come in, and is my team ready?** Peak is
   21:00–22:00 (58% of revenue in 3 hours, per audit). Morning check
   should make this viscerally clear.
3. **Who are my regulars and when did they last come in?** Surfaces the
   dine-in repeat customers visible in Pine Labs + aggregator customers
   from Petpooja. Nobody else tells you this.
4. **What's my actual take-home per channel?** Dine-in ₹100 = ₹100 to
   us. Swiggy ₹100 customer-pays = ~₹58 net. The dashboard should
   dramatize this.
5. **Are my discounts working?** 12% of orders were discounted, avg 36%
   off. Discounted AOV vs undiscounted AOV, broken out properly.

All other elements are optional. If an element doesn't answer one of
these, cut it.

---

## Scope

### In scope

- Replace `/dashboard` entirely with v2
- Single outlet (Elan Miracle); schema-ready for multi-outlet
- Five sections matching the five questions above
- Period selector (Today / Yesterday / 7d / 30d / MTD / Custom)
- Honest freshness indicator
- Day-of-week-aware comparisons
- Slots reserved for Tier 2 insights and Tier 3 recommendation callouts
  (rendered as empty until those features ship)
- Partner-only access

### Out of scope (deferred to other features)

- LLM narrative insights (Tier 2, see `insights-engine.md`)
- LLM recommendations (Tier 3, see `recommendations-engine.md`)
- Individual customer deep-dives (see `customer-intelligence.md`)
- Multi-outlet portfolio view
- Mobile-specific layout (responsive web is fine for v1)
- CSV/PDF export
- Scheduled digest emails

---

## Information Hierarchy — Five Sections

Each section is a self-contained answer to one question. Sections are
stacked vertically; every section ships with a well-designed empty
state and a clear data-freshness subtitle.

### Section 1 — "The Morning Check" (answers Q1 and Q2)

Shown first. Always focused on "yesterday" or the most recent day with
data — does not respect the period selector, because this is the "how
did I do" question.

#### Elements

**A. Freshness banner** — full-width, always present

- Green muted text (fresh): "Data updated 4 hours ago. Most recent
  order: yesterday 11:43 PM."
- Yellow banner (stale 24-48h): "Data is 2 days old. Upload recent
  files for current numbers. [Upload →]"
- Red banner (>48h): "Data is N days stale. The dashboard below
  reflects orders through [date]. [Upload →]"

**B. Day-of-week-aware headline card**

Single prominent card, half page width:

```
┌──────────────────────────────────────────────────┐
│  Yesterday (Saturday, 28 Mar 2026)               │
│                                                   │
│  ₹14,235                                          │
│  9% above average Saturday                        │
│                                                   │
│  The past 4 Saturdays: ₹13,061 avg               │
│  27 orders (vs 25 avg) · AOV ₹527 (vs ₹522)      │
└──────────────────────────────────────────────────┘
```

Crucial detail: **the comparison baseline is "same day of week, last 4
occurrences,"** not a trailing 7-day average. This makes the comparison
meaningful — a Saturday doing ₹8,000 is a bad day; a Tuesday doing
₹8,000 is a great day.

If fewer than 4 same-day occurrences exist in the data, fall back to
"all available [day]s" and indicate n= in the UI.

**C. "Today's rush" card**

The peak-hour pattern made visceral:

```
┌──────────────────────────────────────────────────┐
│  Today's rush will be 21:00–22:00                 │
│                                                   │
│  58% of weekly revenue comes between 20:00 and    │
│  22:00 (last 4 weeks average)                     │
│                                                   │
│  Historical hourly split (average weekday):       │
│   20:00  ███████████████████  ₹1,310              │
│   21:00  █████████████████████████████ ₹2,170     │
│   22:00  ████████████████  ₹1,080                 │
│                                                   │
│  [bar chart of all hours, 11:00 to 23:00]         │
└──────────────────────────────────────────────────┘
```

This card deliberately uses past tense for observed patterns ("the past
4 weeks") and doesn't predict today. Predictive claims belong in Tier 2
insights, not deterministic metrics.

**D. Alerts strip** (only when triggered)

In v2, we ship two deterministic alerts:

- **Unusual day alert:** if yesterday's revenue deviates by more than
  30% from the same-DoW 4-week average, surface a card: "⚠ Yesterday
  (Tuesday) was 42% below average Tuesday. ₹2,120 vs ₹3,658 typical."
- **Stale channel alert:** if any single channel had zero orders
  yesterday but averaged >0 in the past week, flag it: "ⓘ No Zomato
  orders yesterday — unusual. Typical: 2 orders per day."

Both are deterministic. No LLM. The alerts strip is hidden when no
alerts are active.

### Section 2 — "Period View" (answers Q4 partly, general trend context)

This is where the period selector takes effect. Below Section 1, users
can switch between time windows to see trend data.

#### Controls at top

- **Period selector:** Today / Yesterday / 7d / 30d / MTD / Custom
- **Compare toggle:** "Compare to previous period" (off by default)
- **Period label:** shows resolved dates

#### Elements

**A. Revenue over time**

Daily revenue line chart for the selected period. 4-week moving average
overlay (subtle, dashed). When compare toggle is on, the previous
period renders ghosted.

**Day-of-week ribbon** below the chart: for each day in the period,
show a small colored dot indicating "how this day compared to the
same-DoW 4-week average" (green ≥+10%, yellow ±10%, red ≤-10%). This
is the subtle pattern recognition the human eye is bad at.

**B. Day-of-week pattern card**

Bar chart of average revenue per day-of-week, computed over the
selected period:

```
Monday     ██████████     ₹4,261
Tuesday    ████████       ₹3,295  ← lowest
Wednesday  █████████      ₹3,884
Thursday   ████████████   ₹4,795
Friday     █████████████  ₹5,256
Saturday   ████████████████████████████████  ₹13,061  ← highest
Sunday     ██████████████████████████  ₹10,295
```

Explicitly call out the highest and lowest. This one chart exposes a
pattern nobody sees otherwise.

**C. Channel breakdown over time**

Stacked area chart: dine-in / takeaway / Swiggy / Zomato across the
selected period. Hover for per-channel breakdown per day. Channels are
color-tokened in the design system.

### Section 3 — "Channel Economics" (answers Q4)

This is the section where Stride OS makes visible what other tools
hide. For each channel, show what we _actually_ take home.

A single dense table, one row per channel:

```
Channel      Orders   Gross    Commission  Fees   Net to Us   Net per Rs.100
─────────────────────────────────────────────────────────────────────────
Dine In      314      ₹145,555     —         —     ₹145,555    ₹100
Takeaway     28       ₹10,923      —         —     ₹10,923     ₹100
Swiggy       42       ₹14,639      ₹2,734   ₹3,528 ₹8,377      ₹57
Zomato       47       ₹16,063      —         —     —           (awaiting parser)
─────────────────────────────────────────────────────────────────────────
Total        431      ₹187,180     ₹2,734   ₹3,528 ₹164,855    ₹88
```

Key design points:

- "Net per ₹100" column is calculated per-channel: `net_to_us / gross * 100`
- Rendered as a large, bold number — it's the answer most people need
- Dine-in shows ₹100 explicitly (not blank) to anchor the comparison
- Zomato row is present with a "awaiting parser" note so it's clear what's missing
- Total row uses weighted averages correctly

Below the table: a **simple visual** that reinforces the asymmetry —
a horizontal bar for each channel showing the fee/commission cut
relative to gross. The visual should make the Swiggy bar look painful.

### Section 4 — "Discount Performance" (answers Q5)

A compact card showing discount economics:

```
┌────────────────────────────────────────────────────┐
│  Discount Performance · Last 30 days                │
│                                                     │
│  53 orders (12%) were discounted                    │
│  ₹17,138 given in discounts                         │
│  Average discount: 36% off                          │
│                                                     │
│  AOV:  Discounted ₹620 · Undiscounted ₹408          │
│                                                     │
│  Top discount recipients (swiggy):                  │
│    TRYNEW:     12 orders · ₹814 given               │
│    SWIGGY66:   3 orders · ₹349 given                │
│    FLAT100:    1 order · ₹70 given                  │
│                                                     │
│  [ⓘ These numbers tell you what happened.           │
│     Whether discounts drove incremental volume      │
│     is an insight — see below]                      │
└────────────────────────────────────────────────────┘
```

The subtle acknowledgment at the bottom is deliberate — the dashboard
is honest that it can only tell you the "what" of discounts, not the
"whether they worked." That's for Tier 2.

### Section 5 — "Regulars & Newcomers" (answers Q3 partly)

The dashboard shows _aggregate_ customer patterns. Individual customer
deep-dives live in the separate Customer Intelligence feature.

A four-tile strip:

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ New          │ │ Returning    │ │ Regulars     │ │ Dine-in      │
│ customers    │ │ customers    │ │ (3+ visits)  │ │ repeat rate  │
│ last 30d     │ │ last 30d     │ │ active       │ │ (via Pine    │
│              │ │              │ │              │ │  Labs UPI)   │
│ 47           │ │ 9            │ │ 4            │ │ 6%           │
│              │ │ 16% repeat   │ │              │ │              │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

Definitions (shown on hover):

- **New:** customer whose `first_seen_at` is within the period
- **Returning:** customer with orders in period AND orders before period
- **Regular:** customer with ≥3 total orders lifetime
- **Dine-in repeat rate:** `COUNT(UPI VPAs with 2+ txns) / COUNT(unique UPI VPAs)`

These tiles link through to the Customer Intelligence page for
drill-down. The dashboard itself stays aggregate.

---

## Reserved Slots for Tiers 2 and 3

These render empty in v2 but are structurally in place so the later
features plug in cleanly.

### Slot A — Insights callout (after Section 1 headline card)

When Tier 2 is not yet live: hidden entirely.
When Tier 2 is live: 1–3 insight cards rendered inline. Each shows an
insight headline, evidence trace, and a "thumb up / thumb down" button.

### Slot B — Recommendation callout (after Section 3 Channel Economics)

When Tier 3 is not yet live: hidden entirely.
When Tier 3 is live: up to 2 recommendation teasers with a link to the
full recommendation review page.

### Slot C — "Why?" expand button on anomaly alerts

Each alert card in Section 1 has an optional "Explain →" button.
When Tier 2 is live and has an insight referencing the same anomaly,
tapping this expands inline to show the insight's evidence trace. Until
Tier 2 ships, button is not rendered.

---

## Data Queries

All queries are timezone-aware (IST). Ranges resolve to UTC before
querying.

### Day-of-week baseline

```sql
-- Last 4 occurrences of a given day-of-week for the target outlet
WITH dow_days AS (
  SELECT
    (ordered_at AT TIME ZONE 'Asia/Kolkata')::date AS day,
    SUM(total_amount_paise) AS revenue_paise,
    COUNT(*) AS orders
  FROM sales_orders
  WHERE outlet_id = $1
    AND status = 'success'
    AND EXTRACT(ISODOW FROM (ordered_at AT TIME ZONE 'Asia/Kolkata')) = $2
    AND (ordered_at AT TIME ZONE 'Asia/Kolkata')::date < $3  -- exclusive of target day
  GROUP BY 1
  ORDER BY 1 DESC
  LIMIT 4
)
SELECT
  AVG(revenue_paise)::bigint AS avg_revenue_paise,
  AVG(orders)::numeric AS avg_orders,
  COUNT(*) AS baseline_n
FROM dow_days;
```

### Hour-of-day pattern (for rush card)

```sql
-- Average revenue per hour-of-day over past N days
WITH hourly AS (
  SELECT
    (ordered_at AT TIME ZONE 'Asia/Kolkata')::date AS day,
    EXTRACT(HOUR FROM (ordered_at AT TIME ZONE 'Asia/Kolkata'))::int AS hour,
    SUM(total_amount_paise) AS revenue_paise
  FROM sales_orders
  WHERE outlet_id = $1
    AND status = 'success'
    AND ordered_at >= NOW() - INTERVAL '28 days'
  GROUP BY 1, 2
)
SELECT
  hour,
  AVG(revenue_paise)::bigint AS avg_revenue_paise,
  SUM(revenue_paise) AS total_revenue_paise
FROM hourly
GROUP BY hour
ORDER BY hour;
```

### Channel economics (the key query)

```sql
SELECT
  channel,
  COUNT(*) AS orders,
  SUM(total_amount_paise) AS gross_paise,
  SUM(aggregator_commission_paise)::bigint AS commission_paise,
  SUM(aggregator_fees_paise)::bigint AS fees_paise,
  SUM(COALESCE(aggregator_net_payout_paise, total_amount_paise))::bigint AS net_paise,
  SUM(COALESCE(aggregator_net_payout_paise, total_amount_paise))::numeric
    / NULLIF(SUM(total_amount_paise), 0) * 100 AS net_per_rs100
FROM sales_orders
WHERE outlet_id = $1
  AND status = 'success'
  AND ordered_at >= $2 AND ordered_at < $3
GROUP BY channel
ORDER BY gross_paise DESC;
```

Note the `COALESCE` — for dine-in/takeaway, `aggregator_net_payout_paise`
is null; we fall back to `total_amount_paise`. This keeps dine-in's
"Net per ₹100" as ₹100 correctly.

### Discount analysis

```sql
WITH classified AS (
  SELECT
    *,
    CASE WHEN discount_amount_paise > 0 THEN 'discounted' ELSE 'full_price' END AS discount_bucket
  FROM sales_orders
  WHERE outlet_id = $1
    AND status = 'success'
    AND ordered_at >= $2 AND ordered_at < $3
)
SELECT
  discount_bucket,
  COUNT(*) AS orders,
  SUM(gross_amount_paise)::bigint AS gross_paise,
  SUM(discount_amount_paise)::bigint AS discount_paise,
  SUM(total_amount_paise)::bigint AS total_paid_paise,
  AVG(total_amount_paise)::bigint AS aov_paise,
  AVG(CASE WHEN gross_amount_paise > 0
      THEN discount_amount_paise::numeric / gross_amount_paise * 100
      ELSE 0 END) AS avg_discount_pct
FROM classified
GROUP BY discount_bucket;
```

### Customer aggregates

```sql
WITH period_orders AS (
  SELECT customer_id, customer_phone_last_4
  FROM sales_orders
  WHERE outlet_id = $1
    AND status = 'success'
    AND customer_id IS NOT NULL
    AND ordered_at >= $2 AND ordered_at < $3
),
period_customers AS (
  SELECT DISTINCT customer_id FROM period_orders
),
new_in_period AS (
  SELECT c.id
  FROM customers c
  JOIN period_customers pc ON c.id = pc.customer_id
  WHERE c.first_seen_at >= $2 AND c.first_seen_at < $3
),
regulars AS (
  SELECT c.id
  FROM customers c
  JOIN period_customers pc ON c.id = pc.customer_id
  WHERE c.total_orders >= 3
)
SELECT
  (SELECT COUNT(*) FROM new_in_period) AS new_count,
  (SELECT COUNT(*) FROM period_customers) - (SELECT COUNT(*) FROM new_in_period) AS returning_count,
  (SELECT COUNT(*) FROM regulars) AS regular_count;
```

### Pine Labs dine-in repeat rate

```sql
-- Count UPI VPAs (normalized) with 2+ transactions in the period
WITH vpa_counts AS (
  SELECT
    upi_vpa,
    COUNT(*) AS txn_count
  FROM payment_transactions
  WHERE outlet_id = $1
    AND source = 'pine_labs'
    AND transaction_type = 'upi'
    AND upi_vpa IS NOT NULL
    AND transacted_at >= $2 AND transacted_at < $3
  GROUP BY upi_vpa
)
SELECT
  COUNT(*) AS total_vpas,
  COUNT(*) FILTER (WHERE txn_count >= 2) AS repeat_vpas,
  COALESCE(
    COUNT(*) FILTER (WHERE txn_count >= 2)::numeric / NULLIF(COUNT(*), 0) * 100,
    0
  ) AS repeat_pct
FROM vpa_counts;
```

---

## Server Actions / Data Fetching

All Tier 1. No LLM. All cached at the request level; invalidated on
ingestion commit.

```typescript
// Runs at page render time
getDashboardHeadline(outletId: string): Promise<{
  freshness: FreshnessStatus;
  targetDay: { date: Date; revenuePaise: bigint; orders: number; aovPaise: bigint };
  dowBaseline: { avgRevenuePaise: bigint; avgOrders: number; n: number; deviationPct: number };
  rushPattern: { hourlyAvgRevenue: Array<{ hour: number; paise: bigint }>; peakHours: [number, number] };
  alerts: Alert[];
}>;

getDashboardPeriod(
  outletId: string,
  period: { start: Date; end: Date },
  compare: boolean,
): Promise<{
  dailyRevenue: Array<{ day: string; paise: bigint; dowDeviationPct: number }>;
  previousDailyRevenue?: Array<{ day: string; paise: bigint }>;
  dowPattern: Array<{ dow: number; avgPaise: bigint }>;
  channelSplit: Array<{ channel: string; paise: bigint; orders: number }>;
}>;

getChannelEconomics(
  outletId: string,
  period: { start: Date; end: Date },
): Promise<Array<{
  channel: string;
  orders: number;
  grossPaise: bigint;
  commissionPaise: bigint;
  feesPaise: bigint;
  netPaise: bigint;
  netPerRs100: number;
}>>;

getDiscountPerformance(
  outletId: string,
  period: { start: Date; end: Date },
): Promise<{
  discountedOrders: number;
  fullPriceOrders: number;
  totalDiscountPaise: bigint;
  discountedAovPaise: bigint;
  fullPriceAovPaise: bigint;
  topCoupons: Array<{ code: string; orders: number; discountPaise: bigint }>;
}>;

getCustomerTiles(
  outletId: string,
  period: { start: Date; end: Date },
): Promise<{
  newCount: number;
  returningCount: number;
  repeatPct: number;
  regularCount: number;
  dineInRepeatPct: number;
}>;
```

---

## UI Components

Location: `apps/web/app/(app)/dashboard/`

```
/app/(app)/dashboard/
├── page.tsx                         Server Component orchestrator
├── loading.tsx                      Skeleton
├── error.tsx                        Graceful failure
├── _components/
│   ├── FreshnessBanner.tsx
│   ├── MorningCheckSection.tsx
│   │   ├── DoWHeadlineCard.tsx
│   │   ├── RushPatternCard.tsx
│   │   └── AlertsStrip.tsx
│   ├── PeriodViewSection.tsx
│   │   ├── PeriodSelector.tsx
│   │   ├── CompareToggle.tsx
│   │   ├── RevenueOverTimeChart.tsx
│   │   ├── DoWRibbon.tsx            ← the small colored-dot row
│   │   ├── DoWPatternChart.tsx
│   │   └── ChannelStackedAreaChart.tsx
│   ├── ChannelEconomicsSection.tsx
│   │   ├── EconomicsTable.tsx
│   │   └── FeeVisualization.tsx
│   ├── DiscountPerformanceSection.tsx
│   │   └── DiscountCard.tsx
│   ├── CustomerTilesSection.tsx
│   │   └── CustomerTile.tsx
│   └── slots/
│       ├── InsightsSlot.tsx         Empty in v2; populated by Tier 2
│       └── RecommendationSlot.tsx   Empty in v2; populated by Tier 3
```

### State management

Period selector and compare toggle live in URL query string
(`?period=30d&compare=true`). Server Components read directly.
Client-side interactions update URL via `router.push()`; Next.js
re-fetches affected components.

### Charts

Recharts for line/area/bar charts. Custom CSS grid for DoW ribbon (it's
simple colored dots, no library needed).

### Typography

Numbers use `font-mono` (JetBrains Mono) with tabular-nums to keep
columns aligned. Headings use Inter 600/700. The dashboard should look
like a financial terminal, not a marketing page.

---

## Visual Design Direction

The design system refresh already established the palette. A few
dashboard-specific notes:

- **Density over whitespace.** This is an operator tool, not a
  consumer product. Dense and legible beats airy.
- **Numbers are the primary content.** Charts support numbers, not the
  other way around. The first thing your eye should land on in any
  section is a number.
- **Color signals meaning:**
  - Green: better than baseline (revenue above DoW avg, repeat-rate up)
  - Amber: near baseline (±10%)
  - Red: meaningfully below baseline (>10% worse)
  - Channel colors: stay consistent across all charts (dine-in=primary
    brand, takeaway=neutral, Swiggy=orange, Zomato=red)
- **Dark mode is non-negotiable.** Every chart respects
  `prefers-color-scheme`.

---

## Edge Cases

- **Data doesn't cover 4 full weeks yet.** DoW baseline uses however
  many occurrences are available; n is shown in the UI. Minimum n=1
  (explicitly labeled "first Tuesday in the data, no baseline yet").
- **Zero orders in selected period.** Each section has its own empty
  state; no misleading zeros.
- **Custom period > 366 days.** Rejected in period selector.
- **Single-outlet assumption.** Multi-outlet rendering deferred; when
  implemented, most queries add `GROUP BY outlet_id`.
- **No Pine Labs data yet.** Dine-in repeat-rate tile shows "Upload
  Pine Labs data to see this" with link to `/ingest`.
- **Outlet just opened, <1 week of data.** DoW patterns and rush
  patterns show "Still gathering data — available after 14 days" state.

---

## Accessibility

- All charts have keyboard-focusable tooltips
- Aria labels provide numeric summaries for screen readers
- Up/down arrows accompany color-coded deltas (color is never the only
  signal)
- Period selector is keyboard navigable
- DoW ribbon uses both color and text labels

---

## Definition of Done

- `/dashboard` renders v2 as the default landing page after login
- All five sections render with real data
- Day-of-week baseline comparison visibly different from the v1
  7-day-average comparison
- Hour-of-day rush pattern is immediately legible in the Morning Check
- Channel economics table makes the Swiggy cut visible at a glance
- Discount performance acknowledges what it can and cannot tell you
- Customer tiles link to Customer Intelligence page
- Insight and Recommendation slots are present and empty, ready for
  Tier 2/3 to populate
- Dashboard load time < 1 second at current data volume
- `pnpm build && pnpm typecheck` clean
- Works flawlessly in both light and dark mode
- Freshness banner behaves correctly across fresh/stale/very-stale/none
- Integration test: seed fixture with 6 weeks of varied data, assert
  DoW baselines compute correctly
- CLAUDE.md updated; v1 dashboard marked as superseded
