# Feature: Contractors

Contractors are people engaged via an external agency or vendor, not on the
Steady Strides payroll. Today this is primarily agency-sourced cleaners;
the model is designed to also accommodate future relationships like
outsourced security, delivery riders, and catering partners.

Directly-hired cleaners live in the `employees` table, not here.

---

## What Users Can Do

**Partners can:**

- Add, edit, and archive contractor records
- Assign a contractor to an outlet
- Track the agency details, fee structure, and current status

**Managers (future, once login ships):**

- View contractors at their outlet
- Not edit

---

## Data Model

### `contractors` table

| Field                  | Type                                                                  | Notes                                        |
| ---------------------- | --------------------------------------------------------------------- | -------------------------------------------- |
| id                     | uuid PK                                                               |                                              |
| contractor_type        | enum `'cleaner' \| 'security' \| 'delivery' \| 'catering' \| 'other'` | Required                                     |
| display_name           | text                                                                  | Required; e.g. "CleanCo Housekeeping — Elan" |
| agency_name            | text                                                                  | Required                                     |
| agency_contact_person  | text                                                                  | Optional                                     |
| agency_phone           | text                                                                  | Required                                     |
| agency_email           | text                                                                  | Optional                                     |
| fee_structure          | enum `'monthly_fixed' \| 'per_visit' \| 'per_hour' \| 'other'`        | Required                                     |
| fee_amount             | numeric(10,2)                                                         | Required                                     |
| fee_currency           | text                                                                  | Default 'INR'                                |
| started_on             | date                                                                  | When the contract began                      |
| ended_on               | date                                                                  | Nullable                                     |
| notes                  | text                                                                  | Free-form                                    |
| archived_at            | timestamptz                                                           | Soft delete                                  |
| created_at, updated_at | timestamptz                                                           |                                              |

### `contractor_outlet_assignments` table

| Field         | Type                  |
| ------------- | --------------------- |
| contractor_id | uuid FK, PK composite |
| outlet_id     | uuid FK, PK composite |
| assigned_at   | timestamptz           |
| assigned_by   | uuid FK → auth.users  |

Most contractors will be assigned to exactly one outlet, but the table
supports multi-outlet (e.g., a regional security agency).

---

## RLS Policies

### `contractors`

- **SELECT:** partner, OR user is a member of an outlet the contractor is
  assigned to
- **INSERT / UPDATE:** partner only
- **DELETE:** never; archive via `archived_at`

### `contractor_outlet_assignments`

- **SELECT:** partner, OR member of the assigned outlet
- **INSERT / DELETE:** partner only

---

## Routes

| Path                              | Access                                                    |
| --------------------------------- | --------------------------------------------------------- |
| `/contractors`                    | Partners, plus managers seeing their outlet's contractors |
| `/contractors/new`                | Partners only                                             |
| `/contractors/[id]`               | RLS-gated                                                 |
| `/contractors/[id]/edit`          | Partners only                                             |
| `/outlets/[id]` → Contractors tab | Shows that outlet's contractors                           |

---

## Server Actions

Location: `apps/web/app/(app)/contractors/actions.ts`

- `createContractor(input): Promise<{ id: string }>` — partner only
- `updateContractor(id, input): Promise<void>` — partner only
- `archiveContractor(id, endedOn: Date): Promise<void>` — partner only
- `assignContractorToOutlet(contractorId, outletId): Promise<void>` — partner only
- `removeContractorFromOutlet(contractorId, outletId): Promise<void>` — partner only

---

## UI Components

Location: `apps/web/app/(app)/contractors/_components/`

- `ContractorForm.tsx` — create/edit
- `ContractorListItem.tsx` — agency name, type, outlet, fee, status
- `ContractorTypeBadge.tsx` — colored badge per type
- `FeeStructureLabel.tsx` — formats "₹8,000 / month" or "₹500 / visit"
- `ArchiveContractorDialog.tsx`

In `apps/web/app/(app)/outlets/[id]/_components/`:

- `OutletContractorsTab.tsx` — shows contractors at this outlet

---

## Edge Cases

- **Contract expired but not archived.** Shown with a warning badge; partners can extend by updating `ended_on` to null or a future date.
- **Mid-month fee change.** Archive the old record, create a new one. (Fee history isn't tracked in v1 — revisit if needed.)
- **Same agency, multiple outlets.** Create separate contractor records per outlet. This mirrors how you actually receive invoices.

---

## Out of Scope

- Agency invoicing / payment tracking — handled in Expenses feature
- Full fee history (single `fee_amount` only in v1)
- Contractor performance ratings
- Document uploads (agency contracts, police verification) — handled by Documents feature

---

## Definition of Done

- Partner can add an agency cleaner to an outlet with all fee details
- Contractor shows up on the outlet's Contractors tab
- Archiving a contractor records an `ended_on` date
- `pnpm build && pnpm typecheck` clean
- CLAUDE.md updated
