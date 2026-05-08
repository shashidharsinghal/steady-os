# Feature: Sales Dashboard v1

**Status:** Draft
**Last updated:** 2026-04-19
**Related:** `sales-ingestion.md` (data source), `outlets.md`
**Depends on:** Sales ingestion committed and working; at least one outlet with data

---

## Purpose

A single landing page that turns Stride OS from a data warehouse into a
daily-useful product. Optimized for the owner-operator morning check —
"how did yesterday go, anything urgent to act on?" — while supporting
trend review and basic decision-making without clicking to another page.

This is the first feature that consumes the data ingestion pipeline. It
validates that the canonical schema is shaped right for the questions
partners actually ask.

---

## Primary User Mental Model (resolve ambiguity here)

The dashboard serves three user modes:

1. **Morning check (primary)** — 3-second glance. "What happened yesterday?
   Anything off?"
2. **Trend review (secondary)** — 30-second look. "How's the week/month
   trending?"
3. **Decision surface (tertiary)** — 2-minute dig. "Which channel/time/
   payment method should I invest in or prune?"

Information hierarchy reflects this: morning-check at the top, trend
review in the middle, decision surface at the bottom. A partner who only
reads the top 400 pixels still gets value.

---

## Scope

### In scope

- Single page at `/dashboard` (becomes the post-login landing page)
- Single-outlet view (Elan Miracle); schema-ready for multi-outlet
- Three stacked sections: morning check, trend review, decision surface
- Period selector: Today / Yesterday / Last 7 days / Last 30 days / MTD / Custom
- Period-over-period comparison — toggle at top, off by default
- Honest data-freshness indicator with stale banner
- Reads from `sales_orders`, `customers`, `payment_transactions`,
  `aggregator_payouts`
- Partner access only

### Out of scope (deferred)

- Multi-outlet portfolio view (add when Wafflesome launches)
- Outlet switcher UI (implicit single-outlet for now)
- Drill-down interactions (clicking a chart doesn't navigate anywhere
  special — this is a glanceable page, not a BI tool)
- Export to CSV / PDF / email
- Scheduled digest emails / WhatsApp summaries
- Cohort analysis, retention curves
- Item-level performance (no data yet — parser doesn't populate
  `sales_line_items`)
- Reconciliation / drift flags (separate feature)
- Custom saved views or user-configurable widgets
- Mobile-specific layout (responsive web is enough for v1)
- Real-time updates via Supabase Realtime subscriptions

---

## Information Hierarchy

The page is divided into three horizontal strips, each answering a
distinct question.

### Strip 1 — Morning Check

**Goal:** 3-second scan. Partner opens the app with chai in hand, learns
what happened, knows whether to act.

Elements, left-to-right on a wide screen (stacks on narrow):

1. **Freshness indicator** (full-width, above the cards)
   - Green subtle text: "Data updated 4 hours ago"
   - Yellow banner if latest commit > 48h ago: "Data is 3 days stale.
     Upload recent files to see current numbers. [Upload now →]"
   - Red banner if > 7 days stale: "Data is a week out of date. The
     dashboard below reflects [date range], not today."

2. **KPI card: Yesterday's Revenue**
   - Big number in rupees
   - Delta vs 7-day trailing average (colored: green up, red down, gray
     flat within ±5%)
   - Sparkline of last 14 days underneath

3. **KPI card: Yesterday's Orders**
   - Count, same pattern as revenue

4. **KPI card: Yesterday's Avg Order Value**
   - AOV, same pattern

5. **Alerts strip** (if any)
   - Dismissible cards, each with an icon + one-sentence insight
   - Generated from simple heuristics:
     - "Yesterday's revenue was 40% below 14-day average — unusual dip"
     - "Swiggy payout this week was 30% lower than last week"
     - "Cancellation rate spiked to 8% yesterday (usual 2%)" — only when
       cancelled orders are ingested (not v1)
   - **In v1: implement revenue-dip alert only** (simplest, most useful).
     Others are stubbed as future work.
   - No alerts to show → strip is hidden entirely, not an empty state

**If "yesterday" has no data:** substitute "most recent day with data"
and make that substitution visually explicit ("Most recent day — Mar 31").

### Strip 2 — Trend Review

**Goal:** 30-second look. How does the period compare to prior?

Controls at the top of this strip:

- **Period selector** (segmented control): Today · Yesterday · 7d · 30d · MTD · Custom
- **Compare toggle**: "Compare to previous period" (off by default)
- **Period label**: shows resolved dates ("1 Mar – 31 Mar 2026")

Elements:

1. **Revenue trend**
   - Line chart, daily revenue across selected period
   - 7-day moving average overlay (subtle, dashed)
   - When compare toggle on: previous period shown as ghosted line
   - Hover: tooltip with day, revenue, orders, AOV
   - Empty state: "No sales in this period" with suggestion to expand range

2. **Channel mix**
   - Stacked area chart: dine-in / takeaway / Swiggy / Zomato over time
   - Colors match channel palette (established in design system)
   - Legend is interactive — click to toggle channels on/off
   - Hover: stacked values per channel for that day

3. **Revenue by channel (summary numbers)**
   - Simple 4-column strip below the charts:
     - Dine In: ₹X · Y% of total · Z orders
     - Takeaway: similar
     - Swiggy: similar · plus net payout after fees
     - Zomato: similar (empty or zero in v1 until parser ships)
   - When compare toggle on: show delta vs previous period under each

### Strip 3 — Decision Surface

**Goal:** 2-minute dig. Where should I focus?

Elements:

1. **Time-of-day / day-of-week heatmap**
   - X-axis: 7 days of week (Mon–Sun)
   - Y-axis: hour blocks (6am–midnight, 2-hour buckets to keep it readable)
   - Cell color intensity = revenue in that slot
   - Hover: exact revenue + order count
   - Answers "when am I making money?" at a glance

2. **Channel economics table**
   - Columns: Channel, Gross Revenue, Commission + Fees, Net to Us, Orders, AOV, Net margin %
   - One row per channel (dine-in has 0 commission; aggregators have real numbers)
   - Sorted by Net to Us descending
   - Footer row: totals

3. **Payment method breakdown**
   - Simple horizontal bar chart: cash / card / UPI / wallet / online-aggregator
   - Shows both count and amount (toggle between)

4. **Customer activity card**
   - "New customers this period: X"
   - "Returning customers: Y"
   - "Repeat rate: Z%" (returning / (new + returning))
   - "Top spender this period: Customer ···1234 · ₹X across Y orders"
   - Only counts customers where `customer_id IS NOT NULL` (aggregator
     orders primarily — dine-in usually has no customer attribution)

---

## Data Queries (and performance notes)

All queries are executed server-side in Server Components. The page's
outermost component fetches an "overview" payload in one round trip where
possible; individual charts can stream or be granularly cached.

### Data freshness query

```sql
-- Most recent committed ingestion run for this outlet
SELECT MAX(committed_at) AS last_upload
FROM ingestion_runs
WHERE outlet_id = $1 AND status = 'committed';

-- Latest actual order timestamp (useful in case someone uploads old data)
SELECT MAX(ordered_at) AS latest_order
FROM sales_orders
WHERE outlet_id = $1;
```

Freshness banner uses `last_upload` for the "X hours ago" text.
`latest_order` appears as a sub-line: "Most recent order: [date]".

### KPI queries

For each KPI (revenue, orders, AOV), compute for:

- The target day (yesterday, or most recent day with data)
- The 7 days ending day before target (trailing average baseline)
- The same day of previous week (for sparkline context)

Single query with CTEs:

```sql
WITH recent AS (
  SELECT (ordered_at AT TIME ZONE 'Asia/Kolkata')::date AS day,
         SUM(total_amount_paise) AS revenue_paise,
         COUNT(*) AS orders
  FROM sales_orders
  WHERE outlet_id = $1
    AND status = 'success'
    AND ordered_at >= (NOW() - INTERVAL '15 days')
  GROUP BY 1
)
SELECT day, revenue_paise, orders,
       revenue_paise::numeric / NULLIF(orders, 0) AS aov_paise
FROM recent
ORDER BY day DESC
LIMIT 15;
```

### Period aggregate query

Given a period (resolved to start/end dates) and an outlet:

```sql
SELECT
  (ordered_at AT TIME ZONE 'Asia/Kolkata')::date AS day,
  channel,
  COUNT(*) AS orders,
  SUM(total_amount_paise) AS revenue_paise,
  SUM(net_amount_paise) AS net_paise,
  SUM(aggregator_commission_paise) AS commission_paise,
  SUM(aggregator_fees_paise) AS fees_paise,
  SUM(aggregator_net_payout_paise) AS net_payout_paise
FROM sales_orders
WHERE outlet_id = $1
  AND status = 'success'
  AND ordered_at >= $2 AND ordered_at < $3
GROUP BY 1, 2
ORDER BY 1;
```

This single result feeds the trend line, stacked area chart, and channel
economics table.

### Heatmap query

```sql
SELECT
  EXTRACT(ISODOW FROM (ordered_at AT TIME ZONE 'Asia/Kolkata'))::int AS day_of_week,
  (EXTRACT(HOUR FROM (ordered_at AT TIME ZONE 'Asia/Kolkata'))::int / 2) * 2 AS hour_block,
  COUNT(*) AS orders,
  SUM(total_amount_paise) AS revenue_paise
FROM sales_orders
WHERE outlet_id = $1
  AND status = 'success'
  AND ordered_at >= $2 AND ordered_at < $3
GROUP BY 1, 2
ORDER BY 1, 2;
```

### Customer activity query

```sql
-- Orders in period, joined to customer to distinguish new/returning
WITH period_customers AS (
  SELECT DISTINCT customer_id
  FROM sales_orders
  WHERE outlet_id = $1
    AND status = 'success'
    AND customer_id IS NOT NULL
    AND ordered_at >= $2 AND ordered_at < $3
),
new_customers AS (
  SELECT c.id
  FROM customers c
  JOIN period_customers pc ON c.id = pc.customer_id
  WHERE c.first_seen_at >= $2 AND c.first_seen_at < $3
)
SELECT
  (SELECT COUNT(*) FROM new_customers) AS new_count,
  (SELECT COUNT(*) FROM period_customers) - (SELECT COUNT(*) FROM new_customers) AS returning_count;
```

### Performance notes

- At current volume (~500 orders/month), all queries run in < 50ms
  without special optimization
- Existing `idx_sales_orders_outlet_time` index on `(outlet_id,
ordered_at DESC)` handles most queries
- Add if missing: `idx_sales_orders_outlet_date_channel` — a covering
  index on `(outlet_id, (ordered_at::date), channel)` for the stacked
  channel chart
- **No materialized views in v1.** Revisit only if dashboard load > 2s
  at 10x current data volume

---

## Server Actions & Data Fetching

Location: `apps/web/app/(app)/dashboard/`

```typescript
// Server Component helpers (not server actions — these are called at render time)
getDashboardOverview(outletId: string): Promise<{
  freshness: { lastUpload: Date | null; latestOrder: Date | null };
  yesterday: { revenuePaise: bigint; orders: number; aovPaise: bigint | null };
  trailing7d: { avgRevenuePaise: bigint; avgOrders: number; avgAovPaise: bigint | null };
  last14dSparkline: Array<{ day: string; revenuePaise: bigint }>;
  alerts: Array<{ id: string; severity: 'warn' | 'info'; message: string }>;
}>;

getDashboardPeriod(
  outletId: string,
  period: { start: Date; end: Date },
  compare: boolean
): Promise<{
  current: { byDay: [...]; byChannel: [...]; byPaymentMethod: [...]; heatmap: [...] };
  previous: { byDay: [...]; byChannel: [...] } | null;
  customers: { new: number; returning: number; topSpenders: [...] };
}>;
```

### Period resolution

Periods resolve in IST (Asia/Kolkata):

- **Today:** 00:00 IST today → now
- **Yesterday:** 00:00 IST yesterday → 00:00 IST today
- **7 days:** 00:00 IST 7 days ago → 00:00 IST today
- **30 days:** same pattern
- **MTD:** 00:00 IST first of current month → 00:00 IST today
- **Custom:** user-selected range, inclusive of both ends, max 366 days

Previous period (for comparison) = same length immediately preceding.

### Caching

- Server Component with default Next.js cache — revalidates on route
  navigation
- Period-scoped data uses `unstable_cache` keyed by `(outletId, start,
end)` with 5-minute TTL
- Invalidated by `revalidatePath('/dashboard')` called from ingestion
  commit server action — so a fresh upload updates the dashboard without
  manual refresh

---

## UI Components

Location: `apps/web/app/(app)/dashboard/`

### Page structure

```
/app/(app)/dashboard/
├── page.tsx                    Server Component orchestrator
├── loading.tsx                 Skeleton of all three strips
├── error.tsx                   Graceful failure
├── _components/
│   ├── FreshnessBanner.tsx     (client — subscribes to refresh)
│   ├── MorningCheckStrip.tsx   (server)
│   │   ├── KpiCard.tsx         (server — accepts delta + sparkline)
│   │   ├── AlertCard.tsx       (client — dismissable)
│   ├── TrendReviewStrip.tsx    (server with client interactions)
│   │   ├── PeriodSelector.tsx  (client)
│   │   ├── CompareToggle.tsx   (client)
│   │   ├── RevenueTrendChart.tsx   (client — recharts)
│   │   ├── ChannelMixChart.tsx     (client — recharts)
│   │   ├── ChannelSummary.tsx      (server)
│   ├── DecisionSurfaceStrip.tsx (server)
│   │   ├── HeatmapChart.tsx    (client — custom SVG or recharts)
│   │   ├── ChannelEconomicsTable.tsx (server)
│   │   ├── PaymentMethodChart.tsx (client)
│   │   ├── CustomerActivityCard.tsx (server)
```

### State management

Period selector + compare toggle live in the URL query string
(`?period=7d&compare=true`) so:

- Bookmarkable / shareable
- Back-button works sensibly
- Server Components can read directly without client state duplication

On period change, client-side navigation updates the URL;
Next.js re-fetches affected components.

### Chart library choice

**Recharts.** Already installed (per scaffold), good defaults, composable,
works well with shadcn theming. Not the fanciest but the right call for
v1 — we're not doing D3-level custom work.

For the heatmap specifically, recharts doesn't have a first-class heatmap
primitive. Options:

- Build a grid of colored cells manually (div grid with CSS variables for
  color intensity) — ~30 lines, looks great
- Use `recharts` Treemap with some trickery — fragile
- **Recommendation:** hand-rolled div grid. Cleanest result, least code.

### Design notes (tie into the design system)

- Use existing KPI card primitive from `packages/ui` (add if missing)
- Chart colors pull from design tokens:
  - `--chart-dine-in`, `--chart-takeaway`, `--chart-swiggy`,
    `--chart-zomato` (add these to `globals.css` if absent)
  - Swiggy = Swiggy orange (around `24 90% 55%`), Zomato = Zomato red
    (`2 80% 55%`), dine-in = primary brand color, takeaway = neutral-500
- Typography: numbers use tabular-nums + JetBrains Mono for alignment
- Deltas use ↑ ↓ symbols (lucide: `TrendingUp`, `TrendingDown`, `Minus`)
- Dark mode: all charts must respect `prefers-color-scheme` via CSS vars

---

## Alerts — The One We're Building in v1

Only one alert heuristic is implemented to keep scope tight:

### Revenue dip alert

Condition: yesterday's revenue < 60% of trailing-14-day average.

Computed during `getDashboardOverview`. If triggered, push into the
alerts array with:

- severity: `warn`
- message: `"Yesterday's revenue was {percent}% below the 14-day average."`
- id: `"revenue-dip-{yyyy-mm-dd}"` (dismissible; dismiss stored in
  `localStorage` for simplicity)

Alert card UI is dismissible; re-appears only if triggered for a new day.

Other planned alerts (stubbed, not implemented):

- Cancellation rate spike (blocked on cancelled-orders ingestion)
- Swiggy/Zomato payout drop (needs more data)
- Unusually low order count for day-of-week

Implement the framework, ship one alert, add more in follow-up features
as data permits.

---

## Freshness Indicator — Precise Rules

Top of page, always present. Three states:

**Fresh (≤ 24h since latest commit):**

- Subtle, muted text
- "Data updated X hours ago · Most recent order: [date]"
- No visual alarm

**Stale (24–48h):**

- Same position, slightly more prominent (not a banner yet)
- "Data updated yesterday at X:XX PM. Upload recent files for current numbers. [Upload →]"

**Very stale (> 48h):**

- Yellow banner spanning the full width, above all strips
- "⚠ Data is N days old. The dashboard below reflects orders through [date], not today. [Upload recent files →]"

**Critically stale (> 7d):**

- Red banner
- Same text but stronger visual weight
- Link jumps straight to `/ingest`

No data at all:

- Don't show the dashboard; show an onboarding empty state: "No sales
  data yet. Upload your first Petpooja report to get started.
  [Upload →]"

---

## Period-Over-Period Comparison Rules

When the compare toggle is on:

- Every chart that shows time (trend, channel mix) renders the previous
  period as a **ghosted** version — lower opacity, dashed line, labeled
  in tooltip as "Previous"
- Every summary number (revenue, orders, AOV in channel summary) shows a
  small delta below it: `↑ 12.3%` or `↓ 4.1%`
- Deltas are:
  - Percentage change: `(current - previous) / previous`
  - Color: green if positive for revenue/orders/AOV; gray if within ±2%
  - Icon: TrendingUp / TrendingDown / Minus
- Heatmap does not get comparison (would be visually incomprehensible)
- Customer activity card does not get comparison in v1 (the math is
  nuanced — "new customers" in different periods aren't directly
  comparable without explanation)

---

## Partner vs Manager Access

- Partners see everything on the dashboard
- Managers (when login ships later): RLS automatically filters to
  outlets they're members of; same dashboard component, different data
- No separate manager-dashboard in v1

---

## Edge Cases

- **No sales in selected period.** Show each chart's empty state with a
  suggestion to expand the range. Don't show misleading "0" — show
  "No orders in this period."
- **Custom period > 366 days.** Reject in the period selector.
- **Period end before period start.** Swap them, don't error.
- **Uploaded data from 2 months ago for the first time.** Dashboard
  works correctly — freshness indicator will read "Data uploaded X
  minutes ago" but "most recent order" will show the actual latest order
  date.
- **Zero customers with non-null `customer_id`.** Customer activity card
  shows "Customer tracking begins with aggregator orders."
- **Very large day (outlier).** Trend line auto-scales; don't clip.
  Sparklines use log scale if max/min ratio > 100 (edge case, but
  prevents a flat line with one spike).
- **Timezone: UTC in DB, IST in UI.** All conversions happen in Postgres
  using `AT TIME ZONE 'Asia/Kolkata'`. Never do timezone math in
  TypeScript for display.

---

## Accessibility

- All charts have accessible alternatives: hover tooltips are also
  focusable via keyboard, screen readers get aria-labels on chart
  containers with the numeric summary
- Color is never the only signal — up/down icons accompany color-coded
  deltas
- Heatmap cells have text labels (revenue amount, small font) visible
  at appropriate contrast in both themes
- Period selector is keyboard navigable (arrow keys, enter to select)

---

## Telemetry (for future product decisions, not user-facing)

Log minimally:

- Dashboard page view with resolved period (PostHog or your telemetry
  of choice — not yet installed, wire up later)
- Period selector changes
- Compare toggle enable/disable

These tell you which periods partners actually use, whether comparison
gets adopted, etc. Not critical for v1 — can add in a polish pass.

---

## Definition of Done

- `/dashboard` renders as the default landing page after login (redirect
  from `/` for partners)
- All three strips render cleanly with real data from ingested files
- Freshness indicator works correctly across fresh/stale/very-stale/none states
- Period selector updates URL + data; back/forward navigation works
- Compare toggle adds comparison to trend and channel summary charts
- Revenue dip alert fires when conditions are met; dismissible
- Empty states render for zero-data and zero-customer cases
- Heatmap looks polished in both light and dark mode
- Dashboard loads in < 1 second for current data volume
- `pnpm build && pnpm typecheck` clean, no `any` types in chart code
- Integration test: seed fixture with 30 days of sales data, assert
  dashboard renders all strips without error and numbers match expected
- CLAUDE.md updated with Sales Dashboard in Implemented Features
