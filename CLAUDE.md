# Stride OS

Operations platform for the Steady Strides franchise portfolio.
Currently powers two outlets (Gabru Di Chaap Sector 84, Wafflesome under setup),
designed to scale to a multi-brand, multi-outlet portfolio.

## Users

- 3 partners (two are senior developers, 15+ years exp)
- Store managers (non-technical, 1 per outlet)
- Role-based access: partners see everything; managers see their own outlet only

## Architecture

- **Monorepo** with Turborepo + pnpm workspaces
- **Web app**: Next.js 15 (App Router), TypeScript, React Server Components
- **Database**: Supabase (Postgres + Auth + Storage + Realtime)
- **Auth**: Supabase Auth with Google OAuth; Postgres RLS for row-level access
- **Styling**: Tailwind CSS + shadcn/ui components
- **Forms**: react-hook-form + zod
- **Data fetching**: Server Components by default, TanStack Query for client state
- **File storage**: Supabase Storage (migrate to Cloudflare R2 if volume grows)
- **Hosting**: Vercel (web), Supabase (DB), GitHub Actions (CI)
- **Future**: Expo/React Native app in `apps/mobile` (Phase 3, not now)

## Repo Layout

stride-os/
├── apps/
│ └── web/ # Next.js 15 app
├── packages/
│ ├── db/ # Supabase schema, migrations, generated types
│ ├── ui/ # shadcn/ui component library (shared)
│ ├── shared/ # Business logic, types, utilities (framework-agnostic)
│ └── config/ # Shared ESLint, TS, Tailwind configs
├── supabase/ # Supabase CLI project (migrations, seed, functions)
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
└── CLAUDE.md # This file

## Core Modules (in build priority)

1. **Ingestion** — Gmail scheduled-report parser + manual file upload + future Petpooja API. Normalizes into canonical schema.
2. **Knowledge Base** — Document upload, RAG chat over franchise agreements, leases, vendor contracts
3. **Employees** — Records, contact, joining date, salary, incentives
4. **Expenses & Invoices** — Gmail invoice auto-detection, structured extraction, approval workflow
5. **Sales & P&L** — Aggregated from ingestion, item-level performance, channel split
6. **Dashboard** — Multi-outlet rollup, sales trends, review sentiment, customer repeat behavior
7. **Recommendations** — LLM-driven discount / menu / loyalty suggestions
8. **Tasks** — Assignment, status, WhatsApp reminders via Twilio or WhatsApp Cloud API
9. **User Roles & Security** — Already enforced via Supabase RLS; UI gating layered on top

## External Integrations (current and planned)

- Petpooja POS — API pending; meanwhile ingest via scheduled email CSV + file upload
- Zomato / Swiggy — file upload of partner dashboard exports
- Pine Labs — file upload of settlement reports
- Google (Gmail + Drive) — OAuth for reading invoices and scheduled reports
- WhatsApp Cloud API — task reminders + customer campaigns (Phase 2+)
- Twilio (fallback) — SMS if WhatsApp Cloud API blocked

## Coding Conventions

- Server Components by default. `'use client'` only when necessary (forms, interactions)
- Server Actions for mutations; no standalone API routes unless needed for webhooks
- All types generated from Supabase schema — never hand-roll DB types
- Zod schemas live alongside their consumers; shared ones go in `packages/shared`
- No `any`. No `@ts-ignore` without a comment explaining why
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `refactor:`)

## Design Principles

- Partners and store managers look at this tool every morning — optimize for glanceability
- Light and dark mode from day one
- Mobile-responsive web first; native mobile app later
- Every data-writing action should be auditable (who, what, when)

## Security

- Never commit secrets. Use `.env.local` (gitignored)
- Supabase RLS enforced on every table — never trust the client
- Google OAuth + allowlisted email domains for sign-in
- Pine Labs / bank data treated as sensitive — encryption at rest via Supabase

## v3 Status (as of 2026-05-08)

**Shipped (v2.1):**
Outlets, Outlet photos, Employees, Contractors, Sales ingestion (Petpooja, Pine Labs, Swiggy), Petpooja daily ingestion, Gmail auto-ingest Phase 1 (Petpooja reports), P&L ingestion, Customer intelligence, Dashboard v2 (being replaced).

**v3 in progress — implementation order:**

| #   | Phase                                                      | Spec                                          | Effort |
| --- | ---------------------------------------------------------- | --------------------------------------------- | ------ |
| 1   | Design System v3                                           | `design-system.md`                            | 1 d    |
| 2   | Outlet Investments schema + Admin UI                       | `outlet-investments.md`, `admin.md` § Outlets | 1 d    |
| 3   | Customer segment definitions schema + Admin UI             | `dashboard-v3.md`, `admin.md` § Segments      | 1 d    |
| 4   | Expense categories schema + Admin UI                       | `expenses.md`, `admin.md` § Categories        | 1 d    |
| 5   | Inventory module                                           | `inventory.md`                                | 3-4 d  |
| 6   | Dashboard sub-phase 1 — Frame + Morning Check              | `dashboard-v3.md` Sec 1, 2                    | 1.5 d  |
| 7   | Dashboard sub-phase 2 — Stat strip + Trend chart           | `dashboard-v3.md` Sec 3, 5                    | 1.5 d  |
| 8   | Expenses sub-phase 1 — Schema + Spend Overview             | `expenses.md` Tab 1                           | 1.5 d  |
| 9   | Expenses sub-phase 2 — Manual + Recurring                  | `expenses.md` Sub-phase 2                     | 1 d    |
| 10  | Dashboard sub-phase 3 — Investment Recovery + DoW + Hourly | `dashboard-v3.md` Sec 4, 6                    | 1.5 d  |
| 11  | Dashboard sub-phase 4 — Channels + Items + Customers       | `dashboard-v3.md` Sec 7, 8                    | 1 d    |
| 12  | Dashboard sub-phase 5 — Discount + Payment                 | `dashboard-v3.md` Sec 9                       | 1 d    |
| 13  | Sales Analytics deep-dive                                  | `sales-analytics.md`                          | 3 d    |
| 14  | Expenses sub-phase 3 — Pending Bills UI                    | `expenses.md` Tab 2                           | 1 d    |
| 15  | Admin module                                               | `admin.md`                                    | 3 d    |
| 16  | Ingest UX v3                                               | `ingest-ux-v3.md`                             | 2 d    |
| 17  | Expenses sub-phase 4 — Gmail invoice scanning              | `gmail-auto-ingest.md` Phase 2                | 2 d    |

**Total: ~28-30 days of Codex work across 17 phases.**

**Critical path notes:**

- Phases 2-4 (small schema migrations) MUST happen before phases that consume them.
- Phase 5 (Inventory) before Phase 7 (so profit margin renders).
- Phase 8 (Expenses Spend Overview) before Phase 10 (so profit calc has expenses).

**Build patterns (unchanged from v2.1):**

- One feature per Codex session
- Server actions for all data fetching
- RLS via `is_partner()` SQL helper
- Money in paise (bigint)
- Soft delete + 30-day purge
- Conventional commits
- Update CLAUDE.md after each merge

**Design language:** see `docs/features/design-system.md` v3 — coral accent `#ff5b3a`, paper/ink palette, Instrument Serif italic page titles, JetBrains Mono for numbers. Visual reference at `docs/design-exports/SteadyStrideOS_Redesign.html` and the JSX files alongside.

## Implemented Features

### Outlets (`/outlets`)

Spec: `docs/features/outlets.md`

- Partners: full CRUD (create, edit, archive) — archival sets `archived_at`, never hard-deletes
- Managers: read-only, see only their outlets
- Three-layer role gating: UI → `requirePartner()` server-action guard → Postgres RLS
- Zod schemas: `packages/shared/src/zod/outlets.ts`
- Server actions: `apps/web/app/(app)/outlets/actions.ts`
- Routes: `/outlets`, `/outlets/new`, `/outlets/[id]`, `/outlets/[id]/edit`
- Migrations: `20240101000000_create_schema.sql`, `20240101000001_outlets_fields.sql`
- Known quirk: `@supabase/ssr` must be ≥ 0.9.0; older versions mismap `SupabaseClient` type
  params causing insert/update to resolve as `never`
- Future: `gst_number`, `fssai_license`, `opened_at` will be auto-populated by the Documents
  feature. Plan to add a `source` enum column ('manual' | 'extracted') per field at that point.

### Employees (`/employees`)

Spec: `docs/features/employees.md`

- Partners can create, edit, archive, and review employees across outlets
- Employee records support multi-outlet assignment, a primary outlet, reporting lines, and emergency contact info
- Salary history is append-only in `employee_salary_history`; initial salary is created on employee creation and later changes are recorded separately
- Server actions: `apps/web/app/(app)/employees/actions.ts`
- Routes: `/employees`, `/employees/new`, `/employees/[id]`, `/employees/[id]/edit`
- Outlet detail page Team tab now renders live roster data from Employees
- Shared validation/types/constants live in `packages/shared/src/zod/employees.ts`,
  `packages/shared/src/types/employee.ts`, and `packages/shared/src/constants/positions.ts`
- Migration: `20240101000002_employees.sql`

### Outlet Photos

Spec: `docs/features/outlet-photos.md`

- Outlets support up to 5 private photos stored in the `outlet-photos` Supabase bucket
- Partners can upload, delete, reorder, and set a cover photo; managers can view photos through outlet access
- Signed URLs are generated server-side for both the outlet detail gallery and the outlet list cover image
- Server actions live in `apps/web/app/(app)/outlets/[id]/actions.ts`
- UI components live under `apps/web/app/(app)/outlets/[id]/_components/` and `apps/web/app/(app)/outlets/_components/`
- Shared contracts live in `packages/shared/src/types/outlet.ts` and `packages/shared/src/zod/outlet-photos.ts`
- Migration: `20240101000003_outlet_photos.sql`

### Ingestion Framework (`/ingest`)

Spec: `docs/features/ingestion-framework.md`
Analysis: `docs/features/ingestion-analysis.md`

- Framework package `packages/ingestion/` — domain-agnostic; feature parsers register without touching core
- `ingestion_runs` table: every upload is an audited run through a strict state machine (`uploaded → parsing → preview_ready → committing → committed`; can branch to `failed` or `rolled_back`)
- `ingestion_row_errors` table: per-row parse errors linked to a run (cascade-deleted on run delete)
- Storage bucket `ingestion-uploads` (private; signed URLs only)
- `file_sha256` dedup guard: uploading the same committed file twice is rejected at DB level
- Parser plugin pattern: implement `Parser<TRaw, TCanonical>`, call `registerParser()` once — no framework changes needed
- Types/registry/errors exported from `packages/ingestion/src/`
- Migration: `20240101000004_ingestion.sql`
- Phase 2 (next): upload UI at `/ingest`, server actions for the full lifecycle
- Phase 3 (after): error surfaces, preview routing, loading/error states

### Sales Dashboard (`/dashboard`)

Spec: `docs/features/sales-dashboard.md`

- Partner-only dashboard focused on a single outlet morning check, trend review, and decision support
- Server-side data helpers aggregate `sales_orders`, `customers`, and freshness metadata from `ingestion_runs`
- Freshness banner communicates stale data honestly and links straight back to `/ingest`
- Morning check strip shows revenue, orders, and AOV for yesterday or the most recent day with data, plus a revenue-dip alert
- Trend review adds period selection, previous-period comparison, revenue trend, channel mix, and channel summary cards
- Decision surface includes the weekly heatmap, channel economics table, payment method breakdown, and customer activity card
- Ingestion commits and rollbacks revalidate `/dashboard` so newly committed data appears quickly

### Customer Intelligence (`/customers`)

Spec: `docs/features/customer-intelligence.md`

- Unified customer workspace across Petpooja and Pine Labs with partner-only routes for list, detail, merges, lapsed, and segments
- `customer_identities` extends the sales schema so customers can be resolved by phone hash, UPI VPA, or salted card fingerprint
- Pine Labs transactions now link to `customer_id`, and ingestion normalizers refresh cross-source customer aggregates
- Customer profiles and segment labels are exposed through SQL views/functions so the UI can filter deterministic segments quickly
- Merge suggestions use deterministic name-to-VPA heuristics; partner merge and dismiss actions are audited through customer merge tables

### P&L Ingestion (`/pnl`)

Spec: `docs/features/pnl-ingestion.md`

- Franchise monthly P&L PDFs now ingest through the shared `/ingest` flow via the `franchise_pnl_pdf` parser
- Canonical schema lives in `pnl_reports` and `pnl_expense_lines`, with an `active_pnl_reports` view and partner/manager RLS
- The parser uses `pdftotext -layout`, stores raw extracted text for re-parsing, and surfaces reconciliation warnings in preview
- `/pnl` provides month cards, deleted-report recovery, and links back into `/ingest` for uploads
- `/pnl/[id]` shows trading account, expense breakdown, bottom line, and month-over-month deltas when prior history exists
- Soft delete matches the ingestion pattern; `purge_deleted_runs()` now also purges aged P&L reports and frees dedup hashes after purge

### Petpooja Daily Sales Ingestion

Spec: `docs/features/petpooja-daily-ingestion.md`

- Added paired Petpooja daily parsers for item-wise bill `.xlsx` files and payment-wise summary `.xls` files
- Item reports write `sales_line_items`; payment summaries write `sales_orders` plus `sales_payment_splits`, joined by invoice number and business date
- `/ingest` supports paired preview-first uploads while preserving the original single-file manual drag-drop path
- `ingestion_runs.trigger_source` tracks manual uploads versus Gmail-driven runs, and delete/rollback flows continue to work consistently across all trigger sources
- Dashboard item and payment sections now light up from the Petpooja daily canonical tables

### Gmail Auto-Ingest (`/ingest`)

Spec: `docs/features/gmail-auto-ingest.md`

- Partners can connect one read-only Gmail inbox per outlet using `gmail.readonly` OAuth and re-authorize when personal Gmail testing tokens expire
- Nightly Vercel cron routes poll for new Petpooja report emails, verify the sender domain, deduplicate by Gmail message id, and feed attachments through the existing ingestion pipeline
- Auto-commit only proceeds when parser confidence is high, row-level parse errors are zero, and row counts stay within the rolling baseline; otherwise preview-ready runs are left for review and an alert webhook can be triggered
- `/ingest` now shows Gmail connection state, sync history, manual "Sync now", and oldest-first date-range backfill alongside the unchanged manual upload area
- Missed days are naturally recovered after re-auth because sync resumes from the last successful sync watermark and skips already processed message ids

### Design System

Spec: `docs/features/design-system.md`

- Global tokens now use a warm saffron-led palette with matching light and dark theme variables in `apps/web/app/globals.css`
- App shell now includes a richer sidebar, top bar, theme toggle, and improved account/sign-out surface
- Shared primitives in `packages/ui` have been refreshed: buttons, cards, badges, tabs, forms, tables, inputs, selects, and textareas
- Outlet pages are photo-led and more editorial; employees now use a denser roster table layout
- Login and dashboard now follow the refreshed visual language instead of scaffold defaults

## Data Domains & Ingestion

Stride OS ingests data from many external sources via the shared **ingestion framework** (`packages/ingestion/`). See `docs/features/ingestion-framework.md` for architecture.

Each data domain has its own parsers, canonical tables, and feature package:

- **Sales** (`packages/sales-ingestion/`, tables `sales_orders`, `customers`, `payment_transactions`, `aggregator_payouts`) — in progress
- **P&L** (`pnl_reports`, `pnl_expense_lines`) — monthly franchise PDF ingestion and review
- **Expenses** (future, tables `vendor_invoices`, `expense_lines`)
- **Documents** (future, structured extractions from uploaded PDFs)

Every canonical row has an `ingestion_run_id` FK back to `ingestion_runs`. Rollback is a single delete by run_id.

Sensitive fields (customer phones): hashed only, never plaintext.

## What NOT to Build Yet

- Mobile app (Phase 3)
- Customer-facing anything (this is internal-only)
- WhatsApp marketing blasts (Phase 2+, after compliance review)
- Real-time collaboration features

## Patterns Established

Features should follow these conventions established by the Outlets feature:

- **Route structure:** `apps/web/app/(app)/<feature>/` with `page.tsx`, `new/`, `[id]/`, `[id]/edit/`, `_components/`
- **Server actions:** `actions.ts` at the feature root; all mutations call `requirePartner()` first
- **Auth helpers:** from `apps/web/lib/auth.ts` — `getCurrentUser`, `requirePartner`, `isPartner`
- **Validation:** zod schemas in `packages/shared/src/zod/`, inferred types in `packages/shared/src/types/`
- **RLS:** defense-in-depth — UI gates, server actions check role, database enforces via RLS using `is_partner()` SQL helper
- **Forms:** shared create/edit client component using react-hook-form + zodResolver
- **Archive, don't delete:** soft-delete pattern via `archived_at timestamptz`
- **States:** every route has `loading.tsx` and `error.tsx`
