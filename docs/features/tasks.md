# Feature: Tasks Panel

**Status:** Final draft — proposed next module  
**Module priority:** v3.1 candidate  
**Who uses it:** partners and managers  
**Last updated:** 2026-05-09  
**Related:** admin, employees, dashboard-v3, expenses, ingest-ux-v3

---

## Overview

The Tasks Panel is a lightweight operating system for pending work inside Stride OS. It gives the team one place to capture tasks, mark how critical they are, tag the area they belong to, assign them to a person or role, and track status until completion.

This is meant for everyday restaurant operations and finance follow-through: fixing an outlet issue, following up on a vendor bill, checking food quality, closing an accounts gap, or assigning a store-level action to the manager on duty.

The goal is not a generic project management tool. It is an internal operational task board optimized for speed, visibility, and accountability.

---

## User Stories

- As a **partner**, I can quickly add a task with title, criticality, area, assignee, and status
- As a **partner**, I can see what is still pending across outlets and who owns it
- As a **manager**, I can view tasks assigned to me or my outlet
- As a **manager**, I can update status as work moves from open to in progress to done
- As a **partner**, I can assign work to a named teammate like Saurabh, Seema, or Shashi
- As a **partner**, I can also assign work to a role such as Store manager when the exact individual may change
- As a **partner**, I can review overdue or high-criticality items without scanning other modules

---

## Scope

### In scope

- Create tasks from a dedicated `/tasks` panel
- Required fields:
  - task title
  - criticality
  - area
  - assignee
  - status
- Optional fields:
  - outlet
  - details / notes
  - due date
  - source link or related record
- List, filter, and update tasks
- Quick status updates from the list view
- Assignee can be either:
  - a specific user
  - a role bucket such as `store_manager`
- “My tasks” and “All tasks” views
- Activity logging for create, assign, status change, and close

### Out of scope (explicitly)

- Subtasks
- Recurring tasks
- File attachments
- Rich comments thread
- Slack / WhatsApp notifications
- Cross-org collaboration
- Kanban drag-and-drop in v1

---

## Core Decisions

| Date       | Decision                                 | Reason                                                               |
| ---------- | ---------------------------------------- | -------------------------------------------------------------------- |
| 2026-05-09 | Task entry must stay fast and compact    | This should feel like ops capture, not project software              |
| 2026-05-09 | Assignee supports both `user` and `role` | Some work belongs to “Store manager” rather than a stable named user |
| 2026-05-09 | Status model stays small in v1           | Reduces ambiguity and speeds adoption                                |
| 2026-05-09 | Criticality is separate from status      | “Open” and “Critical” mean different things and should not be merged |

---

## Status Model

`task_status`

- `open`
- `in_progress`
- `blocked`
- `done`
- `cancelled`

Behavior:

- New tasks default to `open`
- `done` sets `completed_at`
- Reopening a completed task clears `completed_at`

---

## Criticality Model

`task_criticality`

- `low`
- `medium`
- `high`
- `critical`

UI guidance:

- `low` = muted
- `medium` = blue
- `high` = amber
- `critical` = red

---

## Area Model

Use a constrained enum in v1 so filtering stays clean.

`task_area`

- `operations`
- `food`
- `accounts`
- `maintenance`
- `people`
- `vendors`
- `marketing`
- `compliance`
- `other`

Examples:

- Operations: outlet opening issue, shift checklist gap
- Food: recipe variance, wastage, quality issue
- Accounts: invoice mismatch, payout reconciliation, rent follow-up
- Maintenance: AC issue, equipment repair

---

## Assignment Model

Tasks can be assigned in two ways:

1. **Named user**
   - Examples: Saurabh, Seema, Shashi
   - Backed by an actual `profiles` / membership record

2. **Role assignee**
   - Example: `store_manager`
   - Useful when accountability is with the outlet role rather than one specific person

Initial role enum:

- `store_manager`

Future-friendly but out of scope for now:

- `kitchen_manager`
- `cashier`
- `accounts_owner`

---

## Data Model

```sql
create type public.task_status as enum (
  'open',
  'in_progress',
  'blocked',
  'done',
  'cancelled'
);

create type public.task_criticality as enum (
  'low',
  'medium',
  'high',
  'critical'
);

create type public.task_area as enum (
  'operations',
  'food',
  'accounts',
  'maintenance',
  'people',
  'vendors',
  'marketing',
  'compliance',
  'other'
);

create type public.task_assignee_type as enum (
  'user',
  'role'
);

create type public.task_role_assignee as enum (
  'store_manager'
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  outlet_id uuid references public.outlets(id) on delete cascade,
  title text not null,
  details text,
  area public.task_area not null default 'operations',
  criticality public.task_criticality not null default 'medium',
  status public.task_status not null default 'open',

  assignee_type public.task_assignee_type not null default 'user',
  assignee_user_id uuid references auth.users(id) on delete set null,
  assignee_role public.task_role_assignee,

  created_by uuid not null references auth.users(id),
  completed_by uuid references auth.users(id),

  due_date date,
  completed_at timestamptz,

  related_type text,
  related_id uuid,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint tasks_title_not_blank
    check (char_length(trim(title)) > 0),
  constraint tasks_assignee_valid
    check (
      (assignee_type = 'user' and assignee_user_id is not null and assignee_role is null)
      or
      (assignee_type = 'role' and assignee_user_id is null and assignee_role is not null)
    )
);

create index idx_tasks_outlet_status on public.tasks (outlet_id, status, created_at desc)
  where deleted_at is null;

create index idx_tasks_assignee_user on public.tasks (assignee_user_id, status, created_at desc)
  where deleted_at is null and assignee_user_id is not null;

create index idx_tasks_assignee_role on public.tasks (assignee_role, status, created_at desc)
  where deleted_at is null and assignee_role is not null;

create index idx_tasks_due_date on public.tasks (due_date, status)
  where deleted_at is null and due_date is not null;
```

### Notes

- `outlet_id` is optional at schema level only if we want org-level tasks later; in the app we should require outlet selection in v1 unless the current user has only one outlet.
- `related_type` and `related_id` allow lightweight linking to future records:
  - expense
  - ingestion_run
  - outlet
  - employee

### Trigger

Reuse the common `updated_at` trigger pattern if already present in the repo.

### Soft delete

Tasks should use `deleted_at` and an `active_tasks` view, matching the rest of the app.

```sql
create or replace view public.active_tasks as
select *
from public.tasks
where deleted_at is null;
```

---

## RLS

Follow the existing partner / manager access model.

- Partners:
  - full read/write for tasks in accessible outlets
- Managers:
  - can read tasks for outlets they are assigned to
  - can create tasks for outlets they are assigned to
  - can update status/details of tasks in outlets they are assigned to
  - cannot hard delete

Policies should align with existing helper functions like `is_partner()` and outlet-membership checks already used elsewhere.

---

## Pages & Routes

| Route    | Component                  | Auth     | Notes           |
| -------- | -------------------------- | -------- | --------------- |
| `/tasks` | `app/(app)/tasks/page.tsx` | required | Main task panel |

### Page layout

The page should feel dense, operational, and quick to scan.

Top section:

- Page header: `Tasks`
- Subtitle: `Track pending work across outlets, people, and operating areas`
- Primary action: `New task`

Utility bar:

- outlet filter
- assignee filter
- area filter
- criticality filter
- status filter
- search input
- segmented control:
  - `All`
  - `Mine`
  - `Open`
  - `Done`

Main body:

- summary strip
  - Open
  - In progress
  - Blocked
  - Critical
- tasks table

---

## Table Spec

Columns:

1. Task
   - title
   - small details preview
2. Outlet
3. Area
4. Criticality
5. Assign to
6. Status
7. Due date
8. Updated
9. Actions

Row actions:

- Mark in progress
- Mark done
- Edit
- Delete

Visual behavior:

- Critical tasks should stand out with stronger pill color, not giant warning cards
- Overdue tasks show due date in red
- Done rows can be muted slightly

---

## Create / Edit Task Form

Modal or right-side sheet in v1.

Fields:

- `title` — required, single line
- `details` — optional, multiline
- `outlet_id` — required unless only one outlet available
- `area` — required select
- `criticality` — required segmented control or select
- `assignee_type` — required
  - `Person`
  - `Role`
- `assignee_user_id` or `assignee_role` — required based on type
- `status` — defaults to `open`
- `due_date` — optional

Default assignee choices expected in the UI:

- Saurabh
- Seema
- Shashi
- Store manager

Important implementation note:

- Named people must come from actual team membership records, not hardcoded strings
- The labels above are examples of what should appear if those users exist in the workspace

---

## Components

- `app/(app)/tasks/page.tsx` — server page
- `app/(app)/tasks/actions.ts` — server actions
- `app/(app)/tasks/_components/TaskTable.tsx`
- `app/(app)/tasks/_components/TaskFilters.tsx`
- `app/(app)/tasks/_components/TaskFormSheet.tsx`
- `app/(app)/tasks/_components/TaskStatusPill.tsx`
- `app/(app)/tasks/_components/TaskCriticalityPill.tsx`
- `app/(app)/tasks/_components/TaskSummaryStrip.tsx`

---

## Server Actions

```ts
createTask(input: CreateTaskInput): Promise<{ id: string }>;
updateTask(id: string, input: UpdateTaskInput): Promise<void>;
updateTaskStatus(id: string, status: TaskStatus): Promise<void>;
softDeleteTask(id: string): Promise<void>;
listTasks(filters: TaskFilters): Promise<PaginatedTasks>;
getTaskCounts(filters: TaskFilterScope): Promise<TaskCounts>;
```

### Activity logging

Every mutation should create an `activity_log` record:

- `task_created`
- `task_updated`
- `task_reassigned`
- `task_status_changed`
- `task_deleted`

---

## Shared Types / Zod

Add shared Zod types for:

- `taskStatusSchema`
- `taskCriticalitySchema`
- `taskAreaSchema`
- `taskAssigneeTypeSchema`
- `createTaskSchema`
- `updateTaskSchema`

Likely home:

- `packages/shared/src/zod/tasks.ts`

---

## Dashboard Integration (optional, not in v1 build scope)

Future low-cost integrations:

- dashboard tile: `Pending tasks`
- outlet-level alert: `3 critical tasks open`
- expense pending bill action: `Create task`
- ingestion failed run action: `Assign follow-up task`

These are intentionally deferred until the standalone panel works well.

---

## Open Questions

- [ ] Should managers be allowed to edit assignee, or only status/details?
- [ ] Do we want one org-wide task list or strictly outlet-scoped tasks in v1?
- [ ] Should done tasks auto-hide after 7 or 14 days?
- [ ] Should “Store manager” resolve to the current manager for the outlet, if available?

---

## Definition of Done

- `/tasks` exists and is reachable from the sidebar
- User can create a task in under 15 seconds
- Criticality, area, assignee, and status are all visible in the list without opening the row
- Partner can assign to named users or `store_manager`
- Manager can update task status for their outlets
- Soft delete works
- Activity log captures create, update, assign, close, delete
- Filters work for outlet, area, assignee, status, and criticality
