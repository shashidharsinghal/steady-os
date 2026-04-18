# Feature: [Name]

**Status:** draft | ready | in-progress | done  
**Module priority:** #N  
**Who uses it:** partners | managers | both

## Overview

One paragraph — what problem this solves and what the user can do.

## User stories

- As a **partner**, I can … so that …
- As a **manager**, I can … so that …

## Scope

### In scope

-

### Out of scope (explicitly)

-

## Data model

List new tables, columns, or migrations needed. Reference existing tables from the schema where relevant.

```sql
-- example
alter table public.outlets add column ...;

create table public.new_table (
  id uuid primary key default uuid_generate_v4(),
  ...
);
```

**RLS:** describe who can read/write each new table.

## Pages & routes

| Route      | Component                    | Auth     | Notes |
| ---------- | ---------------------------- | -------- | ----- |
| `/feature` | `app/(app)/feature/page.tsx` | required |       |

## Components

List new UI components needed and where they live.

- `components/feature/FeatureList.tsx` — server component, renders …
- `components/feature/FeatureForm.tsx` — `"use client"`, react-hook-form + zod

## Server actions / API routes

| Action        | File                           | Description                  |
| ------------- | ------------------------------ | ---------------------------- |
| `createThing` | `app/(app)/feature/actions.ts` | Creates … validates with zod |

## Zod schemas

Note any shared schemas that should go in `packages/shared/src/zod/`.

## Open questions

- [ ] Question 1
- [ ] Question 2

## Decisions log

Record decisions made during spec or implementation so context isn't lost.

| Date       | Decision | Reason |
| ---------- | -------- | ------ |
| YYYY-MM-DD |          |        |
