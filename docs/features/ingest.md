# Feature: Ingest

**Status:** draft  
**Module priority:** #1  
**Who uses it:** partners (full access), managers (own outlet only)

## Overview

Partners and managers upload sales export files (CSV / XLSX) from Petpooja, Zomato, Swiggy,
and Pine Labs. The system parses each file into a canonical `sales_records` row per day per
channel, flags duplicates, and shows an upload history. This is the data entry point for all
downstream Sales & P&L analysis.

## User stories

- As a **partner**, I can upload a CSV/XLSX file for any outlet and any source, so that sales data
  appears in the dashboard without manual data entry.
- As a **partner**, I can see a log of all past uploads (who uploaded, when, how many rows parsed,
  any errors), so that I can audit the data trail.
- As a **manager**, I can upload files for my outlet only, so that I can keep my own sales data
  up to date.
- As a **partner or manager**, I am warned before uploading a file that overlaps with dates already
  ingested, so that I don't accidentally double-count.

## Scope

### In scope

- Manual file upload UI (drag-and-drop + file picker)
- Support: Petpooja CSV, Zomato partner export CSV, Swiggy partner export CSV, Pine Labs settlement CSV
- Per-row parsing into `sales_records` canonical schema
- Duplicate detection (same outlet + date + channel already exists)
- Upload history table with status (success / partial / failed)
- Supabase Storage for raw file archival

### Out of scope (explicitly)

- Gmail scheduled-report parser (Phase 2)
- Petpooja direct API integration (pending API access)
- Real-time parsing progress (simple success/error toast is fine for now)
- Editing or deleting ingested records (audit trail — append only for now)

## Data model

```sql
create type public.ingest_source as enum (
  'petpooja', 'zomato', 'swiggy', 'pine_labs', 'manual'
);

create type public.ingest_status as enum (
  'pending', 'processing', 'success', 'partial', 'failed'
);

-- One row per upload attempt
create table public.ingest_uploads (
  id            uuid              primary key default uuid_generate_v4(),
  outlet_id     uuid              not null references public.outlets(id) on delete cascade,
  uploaded_by   uuid              not null references auth.users(id),
  source        public.ingest_source not null,
  filename      text              not null,
  storage_path  text              not null,          -- Supabase Storage object path
  status        public.ingest_status not null default 'pending',
  row_count     int,                                 -- parsed rows (null until processed)
  error_message text,
  date_from     date,                                -- earliest date in the file
  date_to       date,                                -- latest date in the file
  created_at    timestamptz       not null default now()
);

-- Canonical sales rows (one per outlet + date + channel)
create table public.sales_records (
  id            uuid        primary key default uuid_generate_v4(),
  outlet_id     uuid        not null references public.outlets(id) on delete cascade,
  upload_id     uuid        references public.ingest_uploads(id) on delete set null,
  date          date        not null,
  channel       public.sales_channel not null,   -- enum already in packages/shared
  gross_sales   numeric(12,2) not null,
  net_sales     numeric(12,2) not null,
  order_count   int         not null default 0,
  created_at    timestamptz not null default now(),
  unique (outlet_id, date, channel)
);
```

**RLS:**

- `ingest_uploads`: partners can do all; managers can insert/select for their outlet only.
- `sales_records`: partners can do all; managers can select for their outlet only (no direct insert — only via server action).

**Storage bucket:** `ingest-raw` — private, accessible via service role only.

## Pages & routes

| Route     | File                        | Auth     | Notes                       |
| --------- | --------------------------- | -------- | --------------------------- |
| `/ingest` | `app/(app)/ingest/page.tsx` | required | Upload form + history table |

## Components

- `components/ingest/UploadForm.tsx` — `"use client"`, drag-and-drop file input, outlet selector (partners only), source selector
- `components/ingest/UploadHistory.tsx` — server component, table of past uploads with status badge
- `components/ingest/DuplicateWarning.tsx` — dialog shown when overlapping dates detected

## Server actions

| Action        | File                          | Description                                                                                           |
| ------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| `uploadFile`  | `app/(app)/ingest/actions.ts` | Validates file type/size, uploads to Supabase Storage, inserts `ingest_uploads` row, triggers parsing |
| `parseUpload` | `app/(app)/ingest/actions.ts` | Reads file from Storage, runs source-specific parser, inserts `sales_records`, updates upload status  |

Parsing logic lives in `packages/shared/src/parsers/` — one file per source — so it can be unit-tested independently of Next.js.

## Zod schemas

```ts
// packages/shared/src/zod/ingest.ts
export const uploadFormSchema = z.object({
  outlet_id: z.string().uuid(),
  source: z.enum(["petpooja", "zomato", "swiggy", "pine_labs", "manual"]),
  file: z.instanceof(File).refine((f) => f.size < 10 * 1024 * 1024, "Max 10 MB"),
});
```

## Open questions

- [ ] Do we parse synchronously in the server action (simple, blocks for large files) or kick off a background job? Start synchronous; move to background queue if files exceed ~5 MB.
- [ ] Petpooja CSV column names — need a real export to confirm headers before writing the parser.
- [ ] Pine Labs settlement CSV — does it include per-transaction rows or daily summaries? Affects `order_count` calculation.
- [ ] Should managers be able to see uploads from other managers for the same outlet?

## Decisions log

| Date       | Decision                                                | Reason                                               |
| ---------- | ------------------------------------------------------- | ---------------------------------------------------- |
| 2026-04-18 | Append-only sales_records (no edit/delete in UI)        | Audit trail requirement from CLAUDE.md               |
| 2026-04-18 | Store raw files in Supabase Storage `ingest-raw` bucket | Needed for re-parsing if parser bugs are fixed later |
