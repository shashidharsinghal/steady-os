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

| Route                       | Component                                     | Auth         |
| --------------------------- | --------------------------------------------- | ------------ |
| `/admin`                    | redirects to `/admin/integrations`            | partner only |
| `/admin/integrations`       | `app/(app)/admin/integrations/page.tsx`       | partner only |
| `/admin/team`               | `app/(app)/admin/team/page.tsx`               | partner only |
| `/admin/outlets`            | `app/(app)/admin/outlets/page.tsx`            | partner only |
| `/admin/customer-segments`  | `app/(app)/admin/customer-segments/page.tsx`  | partner only |
| `/admin/expense-categories` | `app/(app)/admin/expense-categories/page.tsx` | partner only |
| `/admin/data`               | `app/(app)/admin/data/page.tsx`               | partner only |
| `/admin/activity`           | `app/(app)/admin/activity/page.tsx`           | partner only |

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
```

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

```

---
```
