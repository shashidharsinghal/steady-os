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
- **P&L** (future, tables `financial_periods`, `pnl_line_items`)
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
