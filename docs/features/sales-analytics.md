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

| Route    | Component                  | Auth            |
| -------- | -------------------------- | --------------- |
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
```

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

```

---
```
