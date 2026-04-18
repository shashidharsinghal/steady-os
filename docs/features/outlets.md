# Feature: Outlets

Outlets are the core entity in Stride OS — every employee, sale, expense,
and document will eventually be tied to an outlet. This feature lets partners
manage the franchise portfolio and gives managers a read-only view of the
outlets they're responsible for.

---

## What Users Can Do

**Partners can:**

- View a list of every outlet across the portfolio
- Create a new outlet
- Edit any outlet's details
- Archive an outlet (soft delete; never hard-delete)
- View a detail page for any outlet

**Managers can:**

- View a list containing only the outlets they are a member of
- View the detail page for those outlets
- Cannot create, edit, archive, or access outlets they don't belong to

Role is determined by the `outlet_members.role` column. A user is a "partner"
if they have at least one `outlet_members` row with role='partner'. Otherwise
they are a manager.

---

## Data Model

The `outlets` and `outlet_members` tables already exist from the scaffold.
This feature adds fields to `outlets`:

```sql
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS gst_number TEXT;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS fssai_license TEXT;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS opened_at DATE;
ALTER TABLE outlets ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- An outlet can only be linked to one Petpooja restaurant ID at a time,
-- but the ID may be re-assigned if the outlet is archived.
CREATE UNIQUE INDEX IF NOT EXISTS outlets_petpooja_unique
  ON outlets (petpooja_restaurant_id)
  WHERE archived_at IS NULL AND petpooja_restaurant_id IS NOT NULL;
```

**Fields on outlets after this migration:**
| Field | Type | Notes |
|---|---|---|
| id | uuid PK | Auto-generated |
| name | text | Required, e.g. "Gabru Di Chaap - Elan Miracle Mall" |
| brand | text | Required, e.g. "Gabru Di Chaap", "Wafflesome", "Other" |
| address | text | Optional |
| phone | text | Optional, store phone number |
| status | enum | 'active' \| 'setup' \| 'closed' |
| petpooja_restaurant_id | text | Optional; unique across active outlets |
| gst_number | text | Optional |
| fssai_license | text | Optional |
| opened_at | date | Optional, when the outlet opened for business |
| archived_at | timestamptz | NULL if active; set on archive |
| created_at | timestamptz | Auto |
| updated_at | timestamptz | Auto on update |

---

## RLS Policies (source of truth — UI gating is cosmetic)

**outlets table:**

- SELECT: user is in `outlet_members` for this outlet (any role), OR user has at least one partner-role row anywhere
- INSERT: user has at least one partner-role row in outlet_members
- UPDATE: same as INSERT
- DELETE: never allow (archival via archived_at is the delete path)

**outlet_members table:**

- SELECT: user's own membership rows, OR user is a partner (partners see all memberships)
- INSERT/UPDATE/DELETE: partner role only

Add a SQL helper function `is_partner(user_id uuid) returns boolean` that
checks for any partner-role membership, and use it in the policies to keep
them readable.

---

## Routes

| Path                 | Component type                 | Access                                    |
| -------------------- | ------------------------------ | ----------------------------------------- |
| `/outlets`           | Server Component               | Authenticated users; list filtered by RLS |
| `/outlets/new`       | Server Component + client form | Partners only (server-side guard)         |
| `/outlets/[id]`      | Server Component               | RLS-filtered; 404 if user can't see       |
| `/outlets/[id]/edit` | Server Component + client form | Partners only                             |

Detail page has tabs: **Overview** (implemented), **Employees** (placeholder
"Coming soon"), **Sales** (placeholder).

---

## Server Actions

Location: `apps/web/app/(app)/outlets/actions.ts`

- `createOutlet(input: CreateOutletInput): Promise<{ id: string }>`
- `updateOutlet(id: string, input: UpdateOutletInput): Promise<void>`
- `archiveOutlet(id: string): Promise<void>`

All three must:

1. Call `requirePartner()` first (helper in `apps/web/lib/auth.ts` — create it)
2. Validate input via zod schemas from `packages/shared/zod`
3. Use the server Supabase client
4. Call `revalidatePath('/outlets')` on mutation
5. Throw an `Error` with a user-safe message on failure (never leak raw Supabase errors)

---

## UI Components

Location: `apps/web/app/(app)/outlets/_components/`

- **OutletForm.tsx** — Client component using `react-hook-form` +
  `@hookform/resolvers/zod`. Shared between create and edit via a `mode` prop.
  Fields: name, brand (select), status (select), address (textarea), phone,
  petpooja_restaurant_id, gst_number, fssai_license, opened_at (date picker).
- **OutletStatusBadge.tsx** — Color-coded shadcn Badge:
  active=green, setup=amber, closed=neutral.
- **ArchiveOutletButton.tsx** — Client component with an AlertDialog
  confirmation before calling archiveOutlet.
- **OutletListItem.tsx** — Card showing name, brand, status badge,
  address, phone. Clickable; links to detail page.

Use shadcn/ui components that are already installed. If something is missing,
install it via the shadcn CLI rather than hand-rolling it.

---

## Role Gating (three layers — don't skip any)

1. **UI layer** — Hide "Create outlet", "Edit", "Archive" buttons for managers
2. **Server Action layer** — `requirePartner()` at the top of every mutation;
   throws if user is not a partner. Never trust the client.
3. **Database layer (RLS)** — Final line of defense. If UI and server both
   fail, the database still denies the operation.

---

## Key Edge Cases

- **No outlets yet.** List page shows an empty state with "Create your first
  outlet" CTA (partners only).
- **Manager with zero memberships.** List page shows "You haven't been assigned
  to any outlets yet. Ask a partner to add you."
- **Archived outlet in URL.** `/outlets/[archived-id]` returns 404 rather
  than showing a ghost page. The `active_outlets` view handles this.
- **Duplicate Petpooja ID.** DB rejects via partial unique index; server
  action catches and surfaces a friendly message: "Another outlet already
  uses this Petpooja restaurant ID."
- **Simultaneous edits by two partners.** Last-write-wins is fine for v1.
  No optimistic locking yet.

---

## Out of Scope (explicitly deferred)

- Multi-language / i18n
- Outlet photos / logos
- Operating hours, menu management — Phase 2
- Bulk import of outlets — not needed at current scale
- Undelete / restore archived outlets — manual DB fix if needed
- Audit log of changes — Phase 2 (track all mutations in audit_log table)
- Assigning managers to outlets through this UI — Phase 2; for now add
  memberships directly in Supabase Studio

---

## Future Integration with Documents

Several outlet fields currently entered manually — `gst_number`,
`fssai_license`, `opened_at`, and any lease/franchise metadata we add
later — will eventually be auto-populated by extractions from documents
uploaded to the forthcoming Documents feature.

**Anticipated direction (not built now):**

- A `documents` table stores uploaded PDFs and other files, with an
  optional `outlet_id` foreign key
- Structured extraction tables (e.g. `lease_terms`, `franchise_agreements`,
  `licenses`) store fields extracted from those documents via an LLM
  pipeline
- Outlet detail page gains a "Documents" tab and its Overview tab pulls
  richer fields from those extraction tables (lease expiry, royalty %,
  license expiries, etc.)
- A `source` column will be added to the relevant outlet fields:
  `'manual' | 'extracted'`, with manual override always possible
- Expiry-tracking alerts (license/lease/insurance) become possible once
  extraction tables exist

**Implications for this feature:**

- Keep current fields as plain editable text/date inputs; don't build
  any extraction logic now
- Avoid renaming or splitting the current fields — future extraction
  work will add columns, not reshape existing ones
- The outlet detail page's Overview tab should render cleanly with
  only manual data; Documents integration should be additive, not a
  rewrite

## Definition of Done

- Partner can create an outlet and sees it appear in the list immediately
- Partner can edit and archive any outlet
- Manager logs in, sees only their outlets, cannot create/edit/archive
- Manager hitting `/outlets/new` directly is redirected with a toast
- Manager hitting another outlet's detail URL directly sees a 404
- Form validates client-side (immediate feedback) and server-side (source of truth)
- Loading skeletons appear during navigation; errors show a friendly screen
- `pnpm build` passes, no TypeScript errors, no lint warnings
- At least one vitest test covering server action auth checks
- `CLAUDE.md` updated with Outlets in an "Implemented Features" section
