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

| Type                | Condition                                                                | Tone  |
| ------------------- | ------------------------------------------------------------------------ | ----- |
| Inventory critical  | `inventory_items.current_stock <= reorder_level` AND used in past 7 days | red   |
| Inventory low       | Same with `current_stock <= reorder_level * 1.5`                         | amber |
| Item trend dropping | Top-10 item with 7d sales < 0.85 × prior 7d sales                        | red   |
| Ingest failed       | Any run in `failed` state in last 24h                                    | red   |
| Ingest needs review | Any run in `partial` or `needs_review` state                             | amber |
| Channel anomaly     | Any channel > 30% deviation from DoW baseline                            | amber |
| Bills overdue       | `expenses.status = 'overdue'`                                            | red   |

If 0 alerts: "Nothing urgent. ✓" with checkmark in `--green`.

### Section 3 — Top Stat Strip (5 tiles)

Horizontal row of 5 cards. Each:

- Stat label (uppercase, muted, small)
- Value (26px, mono, tabular-nums, weight 600)
- Delta chip (green ▴ or red ▾)
- Comparison subtitle ("vs prior 30-day window") muted small
- Sparkline (36px tall, full card width, color matches delta)

| #   | Label                 | Value     | Empty state                          |
| --- | --------------------- | --------- | ------------------------------------ |
| 1   | Sales · {period}      | ₹X,XX,XXX | always available                     |
| 2   | Net profit            | ₹X,XX,XXX | "—" if inventory or expenses missing |
| 3   | Profit margin · daily | XX.X%     | **"—" if no inventory costs**        |
| 4   | Orders                | N         | always available                     |
| 5   | Avg order value       | ₹XXX      | always available                     |

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
```

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

```

---
```
