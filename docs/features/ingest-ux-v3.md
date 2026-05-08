# Feature: Ingest Page UX v3

**Status:** Final draft — for v3
**Module priority:** #7 (parallel to other v3 work)
**Who uses it:** partners (full), managers (own outlet, manual upload)
**Last updated:** 2026-05-08
**Related:** ingestion-framework, gmail-auto-ingest, petpooja-daily-ingestion, admin

---

## Why

The ingest page works but feels untidy:

- No way to delete multiple runs at once
- No archive — runs accumulate forever
- No pagination — all runs render in DOM
- Gmail config mixed with run list (now moves to `/admin`)
- No way to see details of a specific run inline

Pure UX cleanup. No data model changes.

---

## User Stories

- As a partner, I select multiple ingest runs with checkboxes and delete in one action
- As a partner, I see a paginated run list (25/page) so the page loads fast
- As a partner, I archive old runs to clean up the default view
- As a partner, I click any run to see file details, parsed rows preview, and errors — without leaving the page
- As a partner or manager, I see a small Gmail status indicator on `/ingest` (read-only, link to `/admin`)

---

## Scope

### In scope

- Multi-select checkbox column on runs table
- "Delete selected" / "Archive selected" / "Re-ingest selected" bulk actions
- Pagination (25 per page) with page controls
- Archive tab alongside All / Manual / Auto-synced / Backfill
- Run detail panel (slide-out drawer or inline expansion)
- Gmail status pill on the page (read-only, link to `/admin`)

### Out of scope

- Schema changes (existing soft-delete pattern handles archive logically)
- Editing parsed data (still requires re-ingest)
- Partial re-ingest

---

## Data Model

Add a single column to existing `ingest_runs`:

```sql
ALTER TABLE public.ingest_runs
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

CREATE INDEX idx_ingest_runs_archived ON public.ingest_runs (outlet_id, archived_at)
  WHERE deleted_at IS NULL;

-- Update existing active_ingest_runs view to filter:
--   archived_at IS NULL by default
-- Add a separate archived_ingest_runs view for the Archive tab.
```

A daily cron archives runs where:

- `created_at < now() - interval '90 days'`
- `archived_at IS NULL`
- `status IN ('committed', 'failed')`

---

## UI Changes

### Page header

Standard design-system header. Subtitle: "Upload Petpooja, Pine Labs, aggregator reports, and franchise P&L PDFs."

### Gmail status strip (small, above tabs)

Single-line pill:

- `Gmail · Connected · Last sync 2h ago` (green dot) → click → `/admin/integrations#gmail`
- `Gmail · Needs reconnect` (amber dot) → click → reconnect flow

### Tabs row

`All · Manual · Auto-synced · Backfill · Archived`

Counts in pills next to each tab name.

### Toolbar (above table)

- Search input (filename)
- Source dropdown (filter by source type)
- Date range
- Right side: bulk actions appear when ≥1 row selected
  - `Re-ingest (N)` · `Archive (N)` · `Delete (N)` · `Clear selection`

### Runs table

| Column   | Width | Notes                                                   |
| -------- | ----- | ------------------------------------------------------- |
| Checkbox | 40px  | Header has "select all on page"                         |
| File     | flex  | Filename + small source-type pill below                 |
| Source   | 160px | e.g., `petpooja_item_bill`                              |
| Rows     | 80px  | mono right-aligned                                      |
| Trigger  | 140px | Pill: Manual / Auto-synced / Backfill                   |
| Status   | 140px | LED dot + status text                                   |
| Uploaded | 160px | Relative time, exact on hover                           |
| Actions  | 60px  | "..." menu: View details · Re-ingest · Archive · Delete |

### Pagination

Bottom of table: `Showing 1–25 of 147 runs · ◀ ▶` plus page jump.

### Run detail drawer

Click any row → right-side drawer slides in (50% width on desktop, full width on mobile):

- File header: filename, size, source type, uploaded by, uploaded at
- Status section: parsed rows count, errors count, commit status
- Preview section: first 10 parsed rows in compact table
- Errors section (if any): list of row errors with line numbers
- Actions: Re-ingest · Download original · Archive · Delete · Close

---

## Server Actions

```typescript
bulkDeleteRuns(runIds: string[]): Promise<{ success: number; failed: number }>;
bulkArchiveRuns(runIds: string[]): Promise<{ success: number; failed: number }>;
bulkUnarchiveRuns(runIds: string[]): Promise<{ success: number; failed: number }>;
bulkReingestRuns(runIds: string[]): Promise<{ jobIds: string[] }>;

listRuns(
  outletId: string,
  filters: { tab: 'all' | 'manual' | 'auto' | 'backfill' | 'archived'; source?: string; search?: string; dateRange?: [Date, Date] },
  page: number,
  pageSize: number
): Promise<PaginatedRuns>;

getRunDetail(runId: string): Promise<RunDetail>;
```

---

## Migration Note

When this ships:

1. Existing Gmail config UI on `/ingest` is removed
2. Redirect from any old Gmail-related sub-route → `/admin/integrations`
3. Small toast on first visit: "Gmail config moved to Admin → Integrations"

---

## Definition of Done

- Multi-select + bulk actions work
- Pagination works
- Archive tab works; daily cron archives 90+ day runs
- Run detail drawer renders correctly
- Gmail config redirected to `/admin`
- All on mobile at 375px+

```

---
```
