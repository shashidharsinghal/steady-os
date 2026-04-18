# Feature: Ingestion Framework

**Status:** Draft
**Last updated:** 2026-04-18
**Related:** `ingestion-analysis.md` (pre-spec analysis of real sample files),
`sales-ingestion.md` (first concrete use case built on this framework)
**Depends on:** `outlets.md`, `employees.md`

---

## Purpose

Stride OS ingests operational and financial data from many external sources —
Petpooja exports, Pine Labs POS reports, Swiggy/Zomato aggregator annexures,
bank statements, vendor invoices, franchise P&L PDFs. Each source has its
own format, quirks, and edge cases. Over time we add more sources.

Without shared infrastructure, each new source means duplicating upload UI,
deduplication logic, audit trails, error handling, and preview flows. The
**ingestion framework** provides the shared machinery. Feature-specific
code (parsers, canonical schemas, domain UIs) sits on top.

This spec describes the framework. `sales-ingestion.md` is the first
feature built on it. P&L, expenses, and other future data-ingestion
features will plug in without touching the framework.

---

## Scope

### In scope for this feature

- Universal file upload UI (drag-drop, progress, errors)
- Parser plugin pattern — register new parsers without touching core
- File classification (filename pattern → header inspection → LLM fallback → user override)
- Ingestion runs audit log — every upload is tracked
- Preview/commit/rollback lifecycle — no data is written until user approves
- File storage in Supabase Storage (raw files kept for audit)
- Deduplication primitives (composite unique keys, soft rejection)
- Error aggregation and surfacing
- Partner-only access
- Supabase Storage bucket + RLS policies

### Explicitly out of scope (handled by feature-specific code)

- Source-specific parsers (live in the feature that needs them)
- Canonical schemas (`sales_orders`, `payment_transactions`, `pnl_line_items`, etc.)
- Domain dashboards that read from canonical tables
- Gmail auto-ingest, Petpooja API integration (build on this framework later)

---

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  apps/web/app/(app)/ingest/                                         │
│    - page.tsx               The universal upload UI                 │
│    - [runId]/page.tsx       Per-run detail: preview / commit / errors│
│    - actions.ts             Server actions: upload, preview, commit │
└────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│  packages/ingestion/         The framework                           │
│    ├── types/                 Domain types (IngestionRun, etc.)      │
│    ├── classifier/            Detect file type                       │
│    ├── registry/              Parser plugin registration             │
│    ├── runs/                  Run lifecycle state machine            │
│    ├── storage/               Upload raw file to Supabase Storage    │
│    ├── dedup/                 Primitives for dedup within a run      │
│    └── errors/                Typed errors + user-facing messages    │
└────────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────────────────┐
│  Feature code (e.g. packages/sales-ingestion/)                      │
│    ├── parsers/               Source-specific parsers                │
│    ├── normalizers/           → canonical schema                     │
│    └── writers/               Insert into canonical tables           │
└────────────────────────────────────────────────────────────────────┘
```

**Key pattern:** the framework knows _nothing_ about sales, expenses, or
P&L. Feature packages register parsers and provide normalizers. The
framework orchestrates the lifecycle.

---

## Data Model

### `ingestion_runs` table

The audit log. Every upload creates exactly one row here. Every downstream
record (sales order, payout, etc.) has a FK back to an ingestion run.

```sql
CREATE TYPE ingestion_status AS ENUM (
  'uploaded',        -- file stored, not yet parsed
  'parsing',         -- parser is running
  'preview_ready',   -- parsed, awaiting user approval
  'committing',      -- writing to canonical tables
  'committed',       -- done, data is live
  'rolled_back',     -- user or system reverted a committed run
  'failed'           -- parser or commit failed hard
);

CREATE TYPE detection_method AS ENUM (
  'filename_pattern',
  'header_inspection',
  'content_llm',
  'user_override'
);

CREATE TABLE ingestion_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Context
  outlet_id uuid REFERENCES outlets(id),       -- nullable: some files span outlets
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),

  -- Classification
  source_type text NOT NULL,                    -- e.g. 'petpooja_orders_master', 'pine_labs_pos'
  detection_method detection_method NOT NULL,
  detection_confidence numeric(3,2),            -- 0.00-1.00; null for filename/user_override
  user_confirmed_source boolean NOT NULL DEFAULT false,

  -- File
  file_name text NOT NULL,
  file_size_bytes bigint NOT NULL,
  file_mime_type text,
  file_storage_path text NOT NULL,              -- Supabase Storage path
  file_sha256 text NOT NULL,                    -- content hash for "same file uploaded twice" detection

  -- Lifecycle
  status ingestion_status NOT NULL DEFAULT 'uploaded',
  parsing_started_at timestamptz,
  parsing_completed_at timestamptz,
  committing_started_at timestamptz,
  committed_at timestamptz,
  rolled_back_at timestamptz,
  failed_at timestamptz,

  -- Counts (populated as lifecycle progresses)
  rows_seen int,              -- total rows in the file
  rows_parsed int,            -- successfully parsed (vs. skipped/errored)
  rows_to_insert int,         -- new rows to be written
  rows_duplicate int,         -- would duplicate existing data, skipped
  rows_errored int,           -- parse errors

  -- Payloads
  preview_payload jsonb,      -- what user sees in the preview screen
  error_details jsonb,        -- structured error list when failed or partially errored

  -- Audit
  committed_by uuid REFERENCES auth.users(id),
  rolled_back_by uuid REFERENCES auth.users(id),
  rollback_reason text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingestion_runs_outlet_time ON ingestion_runs (outlet_id, uploaded_at DESC);
CREATE INDEX idx_ingestion_runs_user_time ON ingestion_runs (uploaded_by, uploaded_at DESC);
CREATE INDEX idx_ingestion_runs_status ON ingestion_runs (status) WHERE status IN ('uploaded', 'parsing', 'preview_ready');
CREATE UNIQUE INDEX idx_ingestion_runs_file_hash ON ingestion_runs (outlet_id, file_sha256) WHERE status = 'committed';
```

**Key design decisions:**

- **`file_sha256` as dedup guard**: if the user uploads the literal same file twice, we can flag it immediately without parsing. Partial unique index ensures only _committed_ runs block — a failed run of the same file should be re-uploadable.
- **Status is a strict state machine**: transitions enforced in code, not just DB constraints.
- **Preview payload is jsonb**: structured enough for rendering, flexible enough that each parser emits what makes sense for its domain.
- **All counts are int, populated lazily**: `NULL` means "not yet known at this stage."

### `ingestion_row_errors` table

Individual row-level errors. Separate table so we don't blow up the `error_details` JSON.

```sql
CREATE TABLE ingestion_row_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES ingestion_runs(id) ON DELETE CASCADE,
  row_number int NOT NULL,              -- source file row (1-indexed, excluding headers)
  error_code text NOT NULL,             -- 'missing_required_field', 'invalid_date', 'parse_error', etc.
  error_message text NOT NULL,          -- user-safe description
  field_name text,                      -- which column caused the issue
  raw_value text,                       -- the offending value, truncated to 500 chars
  raw_row jsonb,                        -- the whole row as parsed (for debugging)
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ingestion_row_errors_run ON ingestion_row_errors (run_id, row_number);
```

### Supabase Storage bucket

- Bucket name: `ingestion-uploads`
- Path pattern: `{outlet_id or 'global'}/{year}/{month}/{run_id}/{original_filename}`
- Private bucket; access via signed URLs only, generated server-side
- RLS policies:
  - Partners can SELECT any file
  - Uploaders can SELECT their own uploads
  - Nobody can directly INSERT — uploads go through the server action

---

## RLS Policies

### `ingestion_runs` table

- **SELECT:** partner (via `is_partner()`); uploader (their own runs)
- **INSERT:** partner only
- **UPDATE:** partner only; individual columns restricted by status transitions (enforced in server actions)
- **DELETE:** never — use rollback

### `ingestion_row_errors` table

- **SELECT:** anyone who can see the parent run
- **INSERT / UPDATE / DELETE:** only via server actions (system-only in practice)

---

## The Parser Plugin Pattern

This is the core abstraction. New sources register a parser without touching
framework code.

### Parser contract

Every parser is a module that exports:

```typescript
// packages/ingestion/types/parser.ts
export interface Parser<TRaw, TCanonical> {
  // Unique identifier — matches source_type column
  readonly sourceType: string;

  // Human-readable name shown in UI
  readonly displayName: string;

  // File extensions this parser accepts (without dot): ['xlsx', 'csv']
  readonly acceptedExtensions: readonly string[];

  // Heuristic detection — called during classification
  readonly detect: (ctx: DetectionContext) => Promise<DetectionResult>;

  // Parse the file into raw domain-specific records (no canonical mapping yet)
  readonly parse: (ctx: ParseContext) => Promise<ParseResult<TRaw>>;

  // Map raw records to canonical shape + figure out what's new vs. dup
  readonly normalize: (ctx: NormalizeContext<TRaw>) => Promise<NormalizeResult<TCanonical>>;

  // Commit: write to canonical tables within a transaction
  readonly commit: (ctx: CommitContext<TCanonical>) => Promise<CommitResult>;

  // Rollback: undo a committed run
  readonly rollback: (ctx: RollbackContext) => Promise<void>;

  // What the preview UI should render — domain-specific
  readonly previewComponent: React.ComponentType<{ payload: unknown }>;
}

export interface DetectionContext {
  fileName: string;
  fileSize: number;
  // First 50KB of file content (buffered), useful for header inspection
  sampleBuffer: Buffer;
}

export interface DetectionResult {
  confidence: number; // 0..1
  reason: string; // human-readable
}

export interface ParseContext {
  runId: string;
  outletId: string | null;
  filePath: string; // Supabase Storage path
  // Helpers
  recordError: (err: RowError) => void;
}

export interface ParseResult<TRaw> {
  rowsSeen: number;
  records: TRaw[];
}

// ... similar for Normalize and Commit contexts
```

### Registration

```typescript
// packages/sales-ingestion/index.ts
import { registerParser } from "@stride/ingestion/registry";
import { petpoojaOrdersParser } from "./parsers/petpooja-orders";
import { pineLabsParser } from "./parsers/pine-labs";
import { swiggyAnnexureParser } from "./parsers/swiggy-annexure";

registerParser(petpoojaOrdersParser);
registerParser(pineLabsParser);
registerParser(swiggyAnnexureParser);

// Zomato stub (awaiting sample data)
registerParser({
  sourceType: "zomato_annexure",
  displayName: "Zomato Weekly Annexure",
  acceptedExtensions: ["xlsx"],
  detect: async ({ fileName }) => ({
    confidence: /zomato.*annex/i.test(fileName) ? 0.7 : 0,
    reason: "Filename match",
  }),
  parse: async () => {
    throw new ParserNotImplementedError(
      "Zomato parser awaiting sample data. Please contact admin."
    );
  },
  // ...
});
```

The framework's registry is looked up once at app boot. Feature packages
register their parsers in their barrel file; adding a new source means
writing a new parser and one `registerParser()` call.

---

## File Classification

When a file arrives, we need to know _what it is_ before we can parse it.
Waterfall of strategies, cheapest first:

### 1. Filename pattern match (free)

Each parser declares filename patterns. First match wins. Confidence 0.5–0.8
depending on specificity.

Examples:

- `Orders_Master_Report_*.xlsx` → `petpooja_orders_master`
- `*Pinelab*` → `pine_labs_pos`
- `invoice_Annexure_*.xlsx` → `swiggy_annexure`

### 2. Header inspection (cheap)

If filename is inconclusive (confidence < 0.7), open the file and look at
columns/sheet names. Each parser's `detect()` can signal confidence based
on headers.

### 3. LLM classification (last resort, costs a few paise per call)

If neither filename nor headers yield confidence ≥ 0.7, call Claude with
the first few rows and ask what source this looks like. Returns a source
type + confidence + reasoning. Logged as `detection_method='content_llm'`.

### 4. User override (always available)

The upload UI shows the detected source and confidence; user can change
it. If they do, `detection_method='user_override'` and
`user_confirmed_source=true`.

### Ambiguity handling

If top two candidates have confidence > 0.5 and differ by < 0.2, mark as
ambiguous and **require user confirmation before parsing**. Better to ask
than to silently parse wrong.

---

## Run Lifecycle (the state machine)

```
  uploaded  ─▶  parsing  ─▶  preview_ready  ─▶  committing  ─▶  committed
     │            │              │                  │              │
     │            │              ▼                  │              ▼
     │            │          cancelled              │         rolled_back
     │            │          (no data               │         (partner
     │            │           written)              │          decision)
     ▼            ▼                                 ▼
  failed       failed                            failed
```

### Transitions enforced by server actions

| From            | To              | Trigger                            | Action                       |
| --------------- | --------------- | ---------------------------------- | ---------------------------- |
| —               | `uploaded`      | `uploadFile()`                     | File stored, run row created |
| `uploaded`      | `parsing`       | `parseRun()`                       | Parser invoked               |
| `parsing`       | `preview_ready` | Parse completes successfully       | Preview payload stored       |
| `parsing`       | `failed`        | Parser throws                      | Error details stored         |
| `preview_ready` | `committing`    | `commitRun()`                      | Writes begin                 |
| `committing`    | `committed`     | Writes complete                    | `committed_at` set           |
| `committing`    | `failed`        | Writes fail mid-flight             | Transaction rolled back      |
| `preview_ready` | `failed`        | `cancelRun()` (user abandons)      | No-op on data                |
| `committed`     | `rolled_back`   | `rollbackRun()` (partner explicit) | Canonical rows deleted       |

### The commit transaction

The commit step is wrapped in a single Postgres transaction:

1. Re-verify row counts match preview payload
2. Insert canonical rows via the parser's `commit()` function
3. Update `ingestion_runs.status` = `committed`, `committed_at`, `committed_by`
4. Commit

Any failure rolls back everything. No partial state.

### Rollback

Because every canonical row has `ingestion_run_id` FK, rollback is a single
cascading delete or selective delete wrapped in a transaction. Irreversible
— we do not keep soft-deleted sales records. Flag explicit in the UI.

---

## Upload UI Design

Route: `/ingest` (list + new upload), `/ingest/[runId]` (detail).

### `/ingest` (main page)

**Top section — Upload new file:**

- Large drag-and-drop zone
- Button alternative: "Choose file"
- Accepts: `.xlsx`, `.xls`, `.csv`, `.pdf` (PDFs will error in v1 with a "coming soon" message so the user isn't surprised later)
- Supports multi-file upload (batch)
- On file drop: client-side shows detected type + confidence immediately (via header-inspection running in a server action)

**Middle — Active runs needing attention:**

- Runs in `preview_ready` status: "3 preview(s) awaiting your review"
- Runs in `failed` status: errors surfaced so user can retry

**Bottom — History:**

- Paginated list of all past runs, newest first
- Columns: Date, Source, File, Rows, Status, Uploaded by
- Filters: Source type, Date range, Status
- Click a row → `/ingest/[runId]`

### `/ingest/[runId]` (detail page)

Three main states based on `status`:

**`preview_ready`:**

- Summary panel: "Petpooja Orders Master Report · 431 rows parsed · 428 new · 3 duplicates · 0 errors"
- Domain-specific preview component (rendered from parser's `previewComponent`)
- Actions: `Commit (write to database)` | `Cancel`
- If there are row errors: "3 rows could not be parsed — review before committing" (errors shown in a table)

**`committed`:**

- Summary showing what was written
- Link: "View committed data →" (domain-specific link, e.g. to `/outlets/X/sales?run={runId}`)
- Danger zone: `Rollback this run` with confirmation dialog explaining consequences

**`failed`:**

- Error banner with top-level error message
- Row-level errors listed
- `Delete this run` button (user clears failed runs from history)
- `Retry` button (if parser supports retry)

**Common elements on all states:**

- Metadata: uploaded by, uploaded at, source detection, file size
- Download original file (signed URL)
- Run timeline (state transitions with timestamps)

---

## Server Actions

Location: `apps/web/app/(app)/ingest/actions.ts`

```typescript
// Upload a file and create a run. Returns runId.
// Does NOT parse yet — user might want to change detected source first.
uploadFile(formData: FormData): Promise<{ runId: string }>

// Kick off parsing for a run. Moves status uploaded → parsing → preview_ready.
parseRun(runId: string, sourceTypeOverride?: string): Promise<void>

// Commit a preview_ready run. Writes canonical data.
commitRun(runId: string): Promise<void>

// Cancel a preview_ready run before commit.
cancelRun(runId: string): Promise<void>

// Roll back a committed run. Deletes all canonical rows tied to it.
// Requires confirmation dialog in UI; logs reason.
rollbackRun(runId: string, reason: string): Promise<void>

// Delete a failed or cancelled run (housekeeping).
deleteRun(runId: string): Promise<void>
```

All actions check `requirePartner()` first. Every action is transactional
at the DB level.

---

## Error Handling

### Error taxonomy

```typescript
export type IngestionErrorCode =
  | "file_too_large"
  | "unsupported_file_type"
  | "file_hash_duplicate" // same exact file previously committed
  | "detection_ambiguous"
  | "parser_not_implemented"
  | "missing_required_column"
  | "missing_required_field"
  | "invalid_date"
  | "invalid_amount"
  | "invalid_enum_value"
  | "parse_error"
  | "commit_conflict" // DB constraint violation at commit
  | "unknown";

export class IngestionError extends Error {
  constructor(
    public readonly code: IngestionErrorCode,
    message: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
  }
}
```

### Surfacing rules

- Top-level errors: banner on the run detail page
- Row-level errors: separate table, sortable
- Errors surfaced to user are human-readable ("Row 47: invoice date is
  2099-01-01 which is in the future")
- Technical details (stack traces, raw Postgres errors) logged server-side
  only, never shown to user

---

## File Size and Performance

### Limits

- Max file size: 50 MB (enforced client + server)
- Max rows per file: 100,000 (framework-enforced; parsers can lower this)
- Parse timeout: 60 seconds for files under 10MB, 300 seconds above

### Processing strategy

- Files under 1 MB: parsed synchronously in the server action
- Files 1–50 MB: parsed in a background job (Supabase Edge Function or
  dedicated worker) — the upload action returns immediately with status `parsing`
- Clients poll or subscribe (Supabase Realtime) to the run's status for
  progress updates
- v1: sync only. Background worker deferred until actually needed.

### Streaming

Parsers should use streaming XLSX readers (`xlsx` library's streaming API)
for files > 5MB rather than loading the whole workbook in memory.

---

## Security

### Threat model

- **Malicious file upload.** Since only authenticated partners can upload,
  this isn't a public-facing risk. But we still:
  - Validate MIME type server-side (not just extension)
  - Reject files matching known executable signatures
  - Never execute code from uploaded content
  - PDFs and Office files have macro-execution concerns — we parse them
    as data only, never invoke rendering engines

- **SQL injection via parsed content.** Parsers return typed TypeScript
  objects; commit phase uses parameterized queries via Supabase client.
  No string concatenation.

- **Resource exhaustion.** Enforce row/size limits above. A parser that
  runs away gets killed by the timeout.

- **Information disclosure.** Raw files in Storage are private with RLS.
  Signed URLs expire in 1 hour.

### Audit

Every state transition of a run is logged with (who, when). Partners can
see the full history; system cannot hide a run from them.

---

## Testing

### Unit tests

- Parser contract: every registered parser passes a generic "contract test"
  that exercises detect/parse/normalize/commit/rollback with a fixture file
- Classifier: given filename + sample bytes, expected source_type

### Integration tests

- Upload → parse → preview → commit → query canonical data → rollback
- File hash dedup: upload same file twice, second rejects
- Ambiguous classification: correct confirmation dialog path

### Fixture files

Every parser lives with a `fixtures/` directory containing real-world
redacted sample files. Tests load these fixtures directly — no mocking the
parser's own inputs.

---

## What the CLAUDE.md Update Should Say

Add to `CLAUDE.md`:

```markdown
## Data Domains & Ingestion

Stride OS ingests data from many external sources via the shared
**ingestion framework** (`packages/ingestion/`). See
`docs/features/ingestion-framework.md` for architecture.

Each data domain has its own parsers, canonical tables, and feature package:

- **Sales** (`packages/sales-ingestion/`, tables `sales_orders`, `customers`,
  `payment_transactions`, `aggregator_payouts`)
- **P&L** (future, tables `financial_periods`, `pnl_line_items`)
- **Expenses** (future, tables `vendor_invoices`, `expense_lines`)
- **Documents** (future, structured extractions from uploaded PDFs)

Every canonical row has an `ingestion_run_id` FK back to `ingestion_runs`.
Rollback is a single delete by run_id.

Sensitive fields (customer phones): hashed only, never plaintext. See
`docs/features/sales-ingestion.md` for the hashing approach.
```

---

## Out of Scope (Deferred)

- **Async/background parsing** for large files (sync only in v1)
- **Gmail auto-ingest** — builds on this framework, separate feature
- **Petpooja API polling** — same architecture, different input, separate feature
- **Scheduled re-ingestion** — e.g. "re-parse all March files after parser fix"
- **Parser versioning** — no way to say "use parser v2 for this run"; if a parser changes, existing runs keep their historical interpretation (raw file is preserved in Storage for re-parsing if needed)
- **Real-time progress during parse** — client just sees "parsing..." then result; no row-by-row progress
- **Batch upload reconciliation** — user uploads 4 files at once, no cross-file reconciliation in v1

---

## Definition of Done

- Partner can drag-drop a file onto `/ingest`, see it classified correctly, preview the parsed data, and commit
- Same file uploaded twice is rejected by hash
- Ambiguous detection triggers confirmation UI
- Row-level errors are surfaced clearly
- A committed run can be rolled back, and the canonical data disappears
- File storage is private; only partners can download originals via signed URLs
- Registry supports adding a new parser without framework changes
- `packages/ingestion/` has no dependencies on `packages/sales-ingestion/` or vice versa (framework is domain-agnostic)
- Unit + integration tests for the framework core
- `pnpm typecheck && pnpm build` clean
- CLAUDE.md updated per above
