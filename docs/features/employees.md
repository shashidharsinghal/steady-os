# Feature: Employees

Employees are people on the Steady Strides payroll — store managers, staff,
and directly-hired cleaners. Agency-sourced cleaners and other outsourced
roles live in the Contractors feature (separate spec).

This feature replaces the spreadsheet currently used to track team members.

---

## What Users Can Do

**Partners can:**

- Add, edit, and archive employees across any outlet
- Assign an employee to one or more outlets
- Record salary changes and view salary history
- See a cross-outlet roster

**Managers (today — no app login yet):**

- No direct access in this phase; managers are recorded _as_ employees,
  not as app users
- Once manager login ships (planned 3–6 months out), managers will:
  - View employees at outlets they're a member of
  - Edit non-sensitive fields (phone, address) for their outlet's staff
  - Never see salary data

---

## Data Model

### `employees` table

| Field                   | Type                                     | Notes                                                                                                                                                             |
| ----------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                      | uuid PK                                  |                                                                                                                                                                   |
| user_id                 | uuid FK → auth.users                     | **Nullable**. Null today for everyone. Populated for managers when manager login ships.                                                                           |
| full_name               | text                                     | Required                                                                                                                                                          |
| phone                   | text                                     | Required; Indian mobile format                                                                                                                                    |
| email                   | text                                     | Optional                                                                                                                                                          |
| address                 | text                                     | Optional                                                                                                                                                          |
| date_of_birth           | date                                     | Optional                                                                                                                                                          |
| joined_on               | date                                     | Required; cannot be in the future                                                                                                                                 |
| left_on                 | date                                     | Nullable; set on exit                                                                                                                                             |
| role                    | enum `'manager' \| 'staff' \| 'cleaner'` | Required                                                                                                                                                          |
| position                | text                                     | Optional; free-form with controlled UI vocabulary. Examples: `'cook'`, `'server'`, `'cashier'`, `'kitchen_helper'`, `'rider'`. Null for role='manager' typically. |
| employment_type         | enum `'full_time' \| 'part_time'`        | Required                                                                                                                                                          |
| reports_to              | uuid FK → employees.id                   | Nullable self-reference. Staff/cleaners usually report to their outlet's manager. Managers typically null (they report to partners, tracked implicitly).          |
| current_outlet_id       | uuid FK → outlets.id                     | Primary outlet assignment                                                                                                                                         |
| emergency_contact_name  | text                                     | Optional                                                                                                                                                          |
| emergency_contact_phone | text                                     | Optional                                                                                                                                                          |
| aadhaar_last_4          | char(4)                                  | Optional; NEVER store full Aadhaar                                                                                                                                |
| archived_at             | timestamptz                              | Soft delete                                                                                                                                                       |
| created_at, updated_at  | timestamptz                              |                                                                                                                                                                   |

### `employee_outlet_assignments` table

Supports employees assigned to multiple outlets (e.g., a manager overseeing two).

| Field       | Type                  |
| ----------- | --------------------- |
| employee_id | uuid FK, PK composite |
| outlet_id   | uuid FK, PK composite |
| assigned_at | timestamptz           |
| assigned_by | uuid FK → auth.users  |

### `employee_salary_history` table

Append-only audit log of salary changes.

| Field          | Type                                                     |
| -------------- | -------------------------------------------------------- |
| id             | uuid PK                                                  |
| employee_id    | uuid FK                                                  |
| monthly_salary | numeric(10,2)                                            |
| effective_from | date                                                     |
| effective_to   | date nullable                                            |
| reason         | enum `'joining' \| 'hike' \| 'demotion' \| 'correction'` |
| created_at     | timestamptz                                              |
| created_by     | uuid FK → auth.users                                     |

Current salary = row where `effective_to IS NULL`. Writing a new row auto-closes
the previous one via a trigger.

---

## Position — Controlled UI Vocabulary

The `position` column is plain text, but the employee form presents a dropdown
populated from a shared constant list. This gives us structure without requiring
a migration every time reality adds a new position.

Initial vocabulary (edit in `packages/shared/src/constants/positions.ts`):

- Cook
- Kitchen Helper
- Server
- Cashier
- Rider
- Cleaner (when role='cleaner')
- Other

The dropdown allows "Other (specify)" which writes a free-text value. The
list is UI-only; the database accepts any string.

---

## RLS Policies

### `employees` table

- **SELECT:** partner (via `is_partner()`), OR user is a member of
  `current_outlet_id`, OR user is in `employee_outlet_assignments` for any
  outlet the current user is a member of
- **INSERT / UPDATE restricted fields:** partner only (restricted = salary-
  adjacent fields, `joined_on`, `left_on`, `role`, `employment_type`,
  `reports_to`, `user_id`, `current_outlet_id`)
- **UPDATE non-sensitive fields:** partner OR manager of an outlet where the
  employee is assigned (non-sensitive = `phone`, `email`, `address`,
  `emergency_contact_*`, `position`)
- **DELETE:** never; archive via `archived_at`

Implementation note: split the update policy into two (one for restricted
fields, one for non-sensitive) using column-level security, OR keep one
policy on the table and enforce field-level auth in the server action layer.
The latter is simpler; recommended.

### `employee_salary_history` table

- **SELECT:** partner only
- **INSERT:** partner only
- **UPDATE / DELETE:** never (audit trail is immutable)

### `employee_outlet_assignments` table

- **SELECT:** partner, OR user who is a member of the assigned outlet
- **INSERT / DELETE:** partner only

---

## Routes

| Path                       | Access                                                           |
| -------------------------- | ---------------------------------------------------------------- |
| `/employees`               | Authenticated; RLS-filtered                                      |
| `/employees/new`           | Partners only                                                    |
| `/employees/[id]`          | RLS-gated                                                        |
| `/employees/[id]/edit`     | Partners (all fields); managers (non-sensitive) once login ships |
| `/outlets/[id]` → Team tab | Shows employees at that outlet                                   |

---

## Server Actions

Location: `apps/web/app/(app)/employees/actions.ts`

- `createEmployee(input): Promise<{ id: string }>` — partner only; also creates
  initial salary history row with `reason='joining'`
- `updateEmployee(id, input): Promise<void>` — field-level auth enforced server-side
- `archiveEmployee(id, leftOn: Date): Promise<void>` — partner only
- `recordSalaryChange(employeeId, { monthly_salary, effective_from, reason }): Promise<void>` — partner only
- `assignEmployeeToOutlet(employeeId, outletId): Promise<void>` — partner only
- `removeEmployeeFromOutlet(employeeId, outletId): Promise<void>` — partner only

All mutations validated via zod, errors safely surfaced, `revalidatePath` called.

---

## UI Components

Location: `apps/web/app/(app)/employees/_components/`

- `EmployeeForm.tsx` — create/edit; conditionally shows salary section to partners only
- `EmployeeListItem.tsx` — name, role, position, primary outlet, phone, status
- `EmployeeRoleBadge.tsx` — color-coded badge (manager=blue, staff=neutral, cleaner=teal)
- `PositionSelect.tsx` — dropdown sourced from the controlled vocabulary + "Other"
- `SalaryHistoryTable.tsx` — partner-only; on detail page
- `RecordSalaryChangeDialog.tsx` — partner-only
- `ArchiveEmployeeDialog.tsx` — requires `left_on` date in addition to confirmation
- `AssignToOutletDialog.tsx` — multi-outlet management

In `apps/web/app/(app)/outlets/[id]/_components/`:

- `OutletTeamTab.tsx` — replaces the "Coming soon" placeholder with that outlet's roster

---

## Edge Cases

- **Archived employee.** Filtered out of default list; visible under "Archived" tab. Detail page remains reachable for payroll history.
- **Re-hiring.** Partner clears `archived_at` + `left_on`, adds a new salary row with `reason='joining'` (the trigger closes the prior row's `effective_to` automatically).
- **Employee with zero outlet assignments.** Valid transient state; shown in "Unassigned" section of the list.
- **Manager without app login.** Stored in `employees` with `user_id = NULL`. When login ships, we link the row to an `auth.users` row.
- **Same-day salary change.** First row has `effective_from = joined_on`, reason = `'joining'`.
- **Concurrent edits.** Last-write-wins on employee fields. Salary is append-only so it's safe.
- **Position not in vocabulary.** "Other" allows free-text entry.

---

## Out of Scope

- Attendance, shifts, clock-in/out
- Payroll generation / payslip PDFs
- Incentive calculations (separate Phase 2 module)
- Tax / PF / ESI compliance
- Employee self-service portals
- Employee photos / document uploads (handled later via Documents feature)
- Bulk import from spreadsheet (do one-time manual entry now)

---

## Definition of Done

- Partner can create an employee, assign to outlets, record initial salary
- Partner can edit all fields; salary history is append-only and auditable
- Partner can archive an employee (sets `left_on` and `archived_at`)
- Manager login path is designed for — `user_id` column exists, policies accommodate future managers, but nothing is blocked on it today
- Outlet detail page Team tab shows the correct roster
- RLS verified by logging in as a test partner and seeing everyone's data; as a test manager (once login ships) seeing only own outlet's data; salary history never leaks
- `pnpm build && pnpm typecheck` clean
- At least one test covering "a non-partner cannot read salary history"
- CLAUDE.md updated with Employees in Implemented Features
