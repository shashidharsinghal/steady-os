# Feature: Gmail Auto-Ingest

**Status:** Draft
**Last updated:** 2026-04-29
**Related:** `petpooja-daily-ingestion.md`, `ingestion-framework.md`,
`ai-admin-panel.md`
**Depends on:** Petpooja Daily Ingestion feature shipped and working;
Gmail OAuth configured

---

## Purpose

Petpooja sends two daily report emails at approximately 22:30 IST. Right
now a partner must manually download the attachments and upload them to
Stride OS. This feature eliminates that entirely.

Gmail Auto-Ingest watches the connected Gmail account for these specific
emails, downloads the attachments automatically, runs them through the
existing ingestion pipeline, and has the dashboard updated by 23:00 IST
every night — without anyone touching anything.

**Target state:** Partners open Stride OS at 9 AM, see yesterday's complete
data with item-level performance, payment breakdown, and fresh channel
economics. No uploads, no reminders, no manual steps.

---

## Scope

### In scope

- Gmail OAuth connection (read-only access to the connected Gmail)
- Nightly cron job at 23:00 IST that polls for new report emails
- Auto-detection of Petpooja report emails by subject line pattern
- Attachment download and ingestion via the existing ingestion framework
- Status tracking for each auto-ingest run
- Error handling and partner notification on failure
- Manual "Sync now" trigger in the UI
- Gmail connection status visible in `/ingest`
- The OAuth 7-day re-auth prompt when token expires (personal Gmail)

### Out of scope

- Reading email body content (attachments only)
- Ingesting other email-based reports (Pine Labs, Swiggy, etc.) — can be
  added later using the same pipeline
- Google Workspace migration (separate decision)
- Any email sending from Stride OS (one-way read only)
- Parsing emails from unknown senders

---

## Architecture

```
23:00 IST daily
      │
      ▼
┌─────────────────────────────┐
│  Gmail Poller               │
│  (Supabase Edge Function or │
│   Vercel Cron Job)          │
│                             │
│  1. Check OAuth token valid │
│  2. Call Gmail API:         │
│     list messages matching  │
│     subject patterns after  │
│     last_sync_at timestamp  │
│  3. For each new message:   │
│     - Get message details   │
│     - Download attachments  │
│     - Push to ingestion     │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Existing Ingestion         │
│  Framework                  │
│                             │
│  - File classification      │
│  - Parser routing           │
│  - Preview + auto-commit    │
│  - Run log                  │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Canonical Tables           │
│  sales_orders,              │
│  sales_line_items,          │
│  sales_payment_splits       │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  Dashboard refresh          │
│  revalidatePath('/dashboard')│
└─────────────────────────────┘
```

---

## Gmail OAuth Setup

### Scopes required

```
https://www.googleapis.com/auth/gmail.readonly
```

Read-only. We never write, send, or delete emails.

### Personal Gmail vs Google Workspace

**Personal Gmail (current situation):**

Google requires apps using restricted scopes (`gmail.readonly`) to either:

1. Complete a CASA (Cloud Application Security Assessment) audit — expensive
   and designed for apps serving the public, not internal tools
2. Stay in "Testing" mode — limited to 100 test users, tokens expire every
   7 days requiring re-authorization

We choose option 2 (Testing mode). Practical implications:

- The app is marked as "unverified" in Google's OAuth consent screen
- Partners will see "This app isn't verified" warning when connecting —
  they click "Advanced → Continue" to proceed
- Tokens expire every 7 days — Stride OS detects expiry and prompts
  re-authorization with a clear one-click flow
- All partner users must be listed as "Test users" in Google Cloud Console

**Google Workspace (future):**
When the team migrates to Workspace, the app is marked "Trusted" in the
Workspace admin console. No verification process, no re-auth expiry.
Migration is a config change in the OAuth settings; no code changes.

### Token storage

OAuth tokens stored in Supabase Vault (encrypted at rest):

```sql
CREATE TABLE gmail_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id uuid NOT NULL REFERENCES outlets(id),
  connected_by uuid NOT NULL REFERENCES auth.users(id),
  gmail_address text NOT NULL,
  access_token text,          -- encrypted via Supabase Vault
  refresh_token text,         -- encrypted, never expires (until revoked)
  token_expires_at timestamptz,
  scopes text[],
  status text NOT NULL DEFAULT 'active',
                              -- 'active' | 'expired' | 'revoked' | 'error'
  last_sync_at timestamptz,
  last_sync_status text,      -- 'success' | 'partial' | 'failed' | 'no_emails'
  last_sync_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (outlet_id)          -- one Gmail connection per outlet
);
```

The refresh token never expires (unless the user revokes access). We use
it to get fresh access tokens silently. The 7-day re-auth for personal
Gmail is a limitation of the access token, not the refresh token —
however, for **restricted scopes** on personal Gmail, Google may require
periodic re-consent even with a valid refresh token. The app must handle
this gracefully.

---

## Email Matching Rules

### Subject line patterns (for Gabru Di Chaap)

```typescript
const REPORT_PATTERNS = [
  {
    pattern: /Report Notification: Item Wise Report With Bill No\./i,
    sourceType: "petpooja_item_bill",
    outlet: "auto-detect from subject", // future: map restaurant name
  },
  {
    pattern: /Report Notification: Payment Wise Summary/i,
    sourceType: "petpooja_payment_summary",
    outlet: "auto-detect from subject",
  },
];
```

### Restaurant name extraction from subject

Subject contains the restaurant name: `GABRU DI CHAPP (Miracle Mall, Gurugram)`.

```typescript
// Extract restaurant name for outlet matching
const restaurantPattern = /:\s*(.+?)\s*$/;
const match = subject.match(restaurantPattern);
const restaurantName = match?.[1]; // "GABRU DI CHAPP (Miracle Mall, Gurugram)"
```

This restaurant name is matched against `outlets.name` (fuzzy match,
normalized to uppercase, ignoring punctuation). For a single outlet,
this is trivially matched. For multi-outlet, it becomes essential.

### Date extraction

Business date is extracted from the file attachment content (row 0 of the
report), not from the email's received-at timestamp. This ensures a late
or delayed email is attributed to the correct trading day.

### Sender verification

Only process emails from `noreply@petpooja.com` or `reports@petpooja.com`.
Do NOT process emails from unknown senders, even if the subject matches.
This prevents injection attacks via crafted email subjects.

---

## Gmail API Query

```typescript
// Fetch new emails since last sync
const query = [
  "from:petpooja.com",
  `after:${Math.floor(lastSyncAt.getTime() / 1000)}`,
  "has:attachment",
  "(",
  '"Report Notification: Item Wise Report"',
  "OR",
  '"Report Notification: Payment Wise Summary"',
  ")",
].join(" ");

const response = await gmail.users.messages.list({
  userId: "me",
  q: query,
  maxResults: 20, // safety cap
});
```

### Attachment download

```typescript
// For each matching message:
const message = await gmail.users.messages.get({ userId: "me", id: messageId });
const parts = message.data.payload.parts;

for (const part of parts) {
  if (part.filename && part.body.attachmentId) {
    const attachment = await gmail.users.messages.attachments.get({
      userId: "me",
      messageId,
      id: part.body.attachmentId,
    });
    const fileBuffer = Buffer.from(attachment.data.data, "base64");
    // Push to ingestion framework
    await ingestFile(fileBuffer, part.filename, outletId, runContext);
  }
}
```

---

## Cron Schedule

**Primary cron: 23:00 IST (17:30 UTC) daily**

Rationale: Petpooja sends reports around 22:30 IST. A 23:00 poll gives
30 minutes buffer for delivery. The dashboard is updated with fresh data
before midnight, ready for the morning check.

**Retry cron: 01:00 IST (19:30 UTC) daily**

If the 23:00 run found no emails (Petpooja was late), the 01:00 run
catches any emails that arrived after 23:00. This prevents missing a
day's data due to timing.

**On-demand: "Sync now" button in `/ingest`**

Partners can trigger an immediate sync at any time. This is essential for:

- First-time setup (sync historical emails)
- After a token re-authorization
- Debugging if auto-sync seems to have missed something

### Implementation options

**Option A — Supabase pg_cron + Edge Function:**

```sql
-- Schedule in pg_cron
SELECT cron.schedule(
  'gmail-auto-ingest-primary',
  '30 17 * * *',  -- 23:00 IST = 17:30 UTC
  $$ SELECT net.http_post(
    url := 'https://<project>.supabase.co/functions/v1/gmail-sync',
    body := '{"trigger": "cron"}'::jsonb
  ) $$
);
```

```typescript
// supabase/functions/gmail-sync/index.ts
// Deno runtime
serve(async (req) => {
  const connections = await getActiveGmailConnections();
  for (const conn of connections) {
    await syncGmailForOutlet(conn);
  }
  return new Response("ok");
});
```

**Option B — Vercel Cron:**

```json
// vercel.json
{
  "crons": [
    { "path": "/api/cron/gmail-sync", "schedule": "30 17 * * *" },
    { "path": "/api/cron/gmail-sync-retry", "schedule": "30 19 * * *" }
  ]
}
```

**Recommendation:** Vercel Cron is simpler to set up and debug. Use it for
v1. Migrate to pg_cron later if the Edge Function approach is needed for
other scheduled jobs.

---

## Auto-Commit vs Manual Review

For Gmail auto-ingest, the standard ingestion "preview → partner approves
→ commit" flow would require a partner to be online at 23:00 to approve
each run. That defeats the purpose of automation.

**Decision: auto-commit for trusted sources with known formats.**

Auto-commit rules:

- Source is verified as `petpooja.com`
- Parser detects the file type with confidence ≥ 0.95
- No row-level parse errors (0 rows in `ingestion_row_errors`)
- Row count is within ±20% of the 7-day rolling average for this outlet
  (catches obviously wrong files — e.g., 3 orders when average is 25)

If any condition fails → **do not auto-commit; create a pending preview
run and send a WhatsApp notification to partners**:

> "⚠ Stride OS: Yesterday's data needs your review. The auto-import from
> Petpooja had an issue. [Review now →]"

**The row count sanity check is critical.** It catches:

- Petpooja sending a test file by mistake
- A file from the wrong date being duplicated
- A parser bug silently under-counting rows

---

## Sync Status and Visibility

### `/ingest` page additions

Add a "Gmail Auto-Sync" card above the upload zone:

```
┌────────────────────────────────────────────────────────────┐
│  Gmail Auto-Sync                              [Sync now]   │
│                                                            │
│  ✅ Connected: gabrudichaap@gmail.com                      │
│                                                            │
│  Last sync: Yesterday at 23:04                             │
│  Result: 2 reports ingested (Item + Payment for 28 Apr)    │
│                                                            │
│  Next sync: Today at 23:00                                 │
│                                                            │
│  ─────────────────────────────────────────────────────     │
│  Token expires in 4 days · [Re-authorize →]               │
└────────────────────────────────────────────────────────────┘
```

When token is expired:

```
┌────────────────────────────────────────────────────────────┐
│  Gmail Auto-Sync                                           │
│                                                            │
│  ⚠ Authorization expired                                   │
│  Auto-sync has been paused.                                │
│  Yesterday's data was not ingested automatically.          │
│                                                            │
│  [Re-authorize Gmail →]  (takes 30 seconds)                │
└────────────────────────────────────────────────────────────┘
```

### Sync history table

Below the status card: last 14 days of sync runs:

| Date   | Status           | Reports | Orders  | Items | Time  |
| ------ | ---------------- | ------- | ------- | ----- | ----- |
| 28 Apr | ✅ Success       | 2       | 13      | 33    | 23:04 |
| 27 Apr | ✅ Success       | 2       | 18      | 51    | 23:02 |
| 26 Apr | ⚠ Review needed  | 2       | pending | —     | 23:03 |
| 25 Apr | ❌ Token expired | —       | —       | —     | —     |

---

## New Table: `gmail_sync_runs`

```sql
CREATE TABLE gmail_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id uuid NOT NULL REFERENCES gmail_connections(id),
  outlet_id uuid NOT NULL REFERENCES outlets(id),

  triggered_by text NOT NULL,     -- 'cron_primary' | 'cron_retry' | 'manual'
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,

  status text NOT NULL DEFAULT 'running',
                                  -- 'running' | 'success' | 'partial' | 'failed' | 'no_emails'
  emails_found int NOT NULL DEFAULT 0,
  emails_processed int NOT NULL DEFAULT 0,
  emails_skipped int NOT NULL DEFAULT 0,

  -- What was ingested
  ingestion_run_ids uuid[],       -- FK references to ingestion_runs.id

  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_gmail_sync_runs_outlet ON gmail_sync_runs (outlet_id, started_at DESC);
```

---

## OAuth Connection Flow

### Connect Gmail (partner action, one-time per outlet)

Route: `/ingest` → "Connect Gmail" button

```
1. Partner clicks "Connect Gmail"
2. Server generates OAuth authorization URL with:
   - scope: gmail.readonly
   - access_type: offline (to get refresh token)
   - prompt: consent (to always get refresh token)
   - state: { outlet_id, user_id, csrf_token }
3. Partner is redirected to Google consent screen
4. Partner clicks "Allow"
5. Google redirects to /api/gmail/callback?code=...&state=...
6. Server exchanges code for access_token + refresh_token
7. Tokens stored in gmail_connections table (encrypted)
8. Partner redirected back to /ingest with success toast
```

### API route: `/api/gmail/callback`

```typescript
// apps/web/app/api/gmail/callback/route.ts
export async function GET(request: Request) {
  const { code, state } = parseSearchParams(request);
  const { outlet_id, user_id, csrf_token } = parseState(state);

  // Validate CSRF
  // Exchange code for tokens
  // Store in gmail_connections
  // Redirect to /ingest
}
```

### Re-authorization flow

When token is expired or revoked, the connection status changes to
`'expired'`. The `/ingest` page shows the re-authorize prompt.

Re-auth follows the same OAuth flow but skips the consent screen if the
user is already connected (Google shows a brief confirmation page only).

---

## Server Actions

```typescript
// gmail connection management
connectGmail(outletId: string): Promise<{ authUrl: string }>
disconnectGmail(outletId: string): Promise<void>
getGmailConnectionStatus(outletId: string): Promise<GmailConnectionStatus>

// manual trigger
triggerGmailSync(outletId: string): Promise<{ syncRunId: string }>
getSyncRunStatus(syncRunId: string): Promise<SyncRunStatus>

// sync history
getSyncHistory(outletId: string, limit: number): Promise<SyncRun[]>
```

---

## Error Handling

| Error                               | Behavior                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------- |
| Token expired                       | Update connection status; show re-auth prompt on /ingest; skip this run (don't retry) |
| Gmail API rate limit                | Exponential backoff, retry up to 3×, then fail with alert                             |
| No emails found                     | Status = 'no_emails'; retry cron at 01:00; if still none, WhatsApp alert at 08:00     |
| File download fails                 | Status = 'partial'; mark the specific email as failed; proceed with others            |
| Parser error                        | Don't auto-commit; create pending preview run; WhatsApp alert to partner              |
| Row count anomaly                   | Same as parser error                                                                  |
| Supabase Storage full               | Alert and fail; don't ingest                                                          |
| Duplicate email (already processed) | Skip silently; log as 'skipped'                                                       |

### Dedup for auto-ingest

Petpooja occasionally resends reports (e.g., if the previous send bounced).
Guard against double-ingestion:

```sql
-- Index on message_id to detect already-processed emails
ALTER TABLE gmail_sync_runs ADD COLUMN processed_message_ids text[];

-- Before processing an email, check if its Gmail message ID was already processed
-- by any previous sync run for this outlet
```

---

## Historical Backfill

Since Petpooja has been sending these emails for months, all historical
reports are available in Gmail. The "Sync now" button with a date range
picker allows backfilling:

```
┌──────────────────────────────────────────────┐
│  Backfill historical reports                  │
│                                               │
│  From: [ 1 Mar 2026 ]  To: [ 28 Apr 2026 ]   │
│                                               │
│  Estimated: ~58 days × 2 files = ~116 emails  │
│  Est. time: 4-6 minutes                       │
│                                               │
│  [ Start backfill ]                           │
└──────────────────────────────────────────────┘
```

Backfill processes one day at a time, oldest first, with progress shown
in the UI. It uses the same auto-commit rules as the nightly sync.

This is the feature that populates months of item-level data in a single
session — giving the dashboard real history from day one.

---

## Security

- OAuth tokens encrypted via Supabase Vault — never stored in plaintext
- Gmail access is read-only — Stride OS cannot send, delete, or modify emails
- Sender verification prevents processing emails from arbitrary senders
- Auto-commit row-count sanity check prevents ingesting corrupted data
- All sync runs are logged with who triggered them (cron vs manual)
- Disconnecting Gmail immediately revokes the token via Google's revocation endpoint

---

## Definition of Done

- Partner can connect Gmail via one-click OAuth on the `/ingest` page
- Nightly cron at 23:00 IST automatically ingests the previous day's reports
- Dashboard shows fresh data every morning without manual uploads
- Token expiry shows a clear re-authorize prompt; past days are queued
  for ingestion after re-auth
- "Sync now" button immediately pulls any unprocessed emails
- Backfill UI allows ingesting months of historical reports in one session
- Sync history table shows last 14 days of run status
- Auto-commit fires only when confidence ≥ 0.95 and row counts are sane
- Parser errors create pending review runs and send WhatsApp alert
- Duplicate emails are silently skipped
- Disconnecting Gmail revokes access immediately
- `pnpm typecheck && pnpm build` clean
- CLAUDE.md updated with Gmail Auto-Ingest in Implemented Features
