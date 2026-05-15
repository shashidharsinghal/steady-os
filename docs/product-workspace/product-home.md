# Product Home

## Product Summary

Stride OS is an owner-operator command center for a multi-outlet food business. It ingests sales, payment, P&L, Gmail invoices, and operating data into one trusted workspace so partners can understand performance, review pending bills, track tasks, and make daily decisions without stitching together Petpooja, aggregator dashboards, Gmail, and spreadsheets.

## Current Product Thesis

The product should be the morning operating layer for partners:

- Show what happened yesterday and whether anything needs attention.
- Keep source data honest, fresh, and auditable.
- Convert messy reports and emails into structured operating records.
- Let partners track tasks, bills, expenses, outlets, people, customers, and inventory in one place.

## Target Users

| User                    | Needs                                                                     | Access Pattern                               |
| ----------------------- | ------------------------------------------------------------------------- | -------------------------------------------- |
| Partners                | Full visibility, configuration, review, approvals, exports, task tracking | Daily morning check and periodic deep review |
| Managers                | Outlet-scoped uploads, read-only operating data, task follow-up           | Operational updates                          |
| Future accountant/admin | Expense review, P&L reconciliation, bill approval support                 | Weekly/monthly finance workflow              |

## Product Pillars

| Pillar                       | Description                                                                                                         | Primary Modules                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Trusted data foundation      | Ingest files and emails into canonical tables with audit trail, rollback, dedupe, and freshness checks              | Ingest, Gmail auto-sync, P&L, sales ingestion                      |
| Daily operating dashboard    | Surface sales, orders, rush patterns, channels, customers, discounts, payments, and health alerts                   | Dashboard, sales analytics                                         |
| Expense and bill control     | Capture manual, recurring, Gmail-scanned, gas, rent, Airtel, merchant, and P&L-derived expense data                 | Expenses, admin categories, Gmail invoice scanning                 |
| People and outlet operations | Track outlets, photos, investments, employees, contractors, and outlet configuration                                | Outlets, outlet photos, investments, employees, contractors, admin |
| Customer intelligence        | Merge identities across phone, UPI, cards, and aggregator data to understand regulars and lapsed customers          | Customers, merge queue, segments                                   |
| Execution tracking           | Capture partner/store tasks with area, criticality, owner, and status                                               | Tasks                                                              |
| Future AI layer              | Use deterministic metrics first, then LLM insights and recommendation workflows with auditability and cost controls | AI stack, insights, recommendations                                |

## Current Implementation Snapshot

Implemented or materially present in the app:

- Authenticated app shell and refreshed v3 visual language
- Dashboard v3 with morning check, trend, channel, item, customer, discount, and payment sections
- Sales analytics page
- Shared ingestion framework with preview, commit, rollback, soft delete, and archive flows
- Sales ingestion for Petpooja/Pine Labs/Swiggy patterns, plus Petpooja daily paired reports
- Gmail auto-ingest for Petpooja reports and scanned invoice candidates
- P&L PDF ingestion and P&L pages
- Expenses page with spend overview, manual expenses, recurring expenses, and pending bills
- OCR plus LLM-assisted bill extraction path for invoice scanning
- Admin pages for integrations, outlets, team, customer segments, expense categories, data export, and activity
- Inventory items and import flow
- Outlets, photos, employees, contractors, customer intelligence, and tasks

## Product Principles

- Never show misleading zeros when data is missing. Use explicit empty, pending, or awaiting states.
- Every ingested row should be traceable to a source run or source message.
- Review workflows should be delete/reject friendly, because partners need to correct messy source data.
- AI should assist extraction and review, not silently mutate trusted business data.
- Partners should be able to understand the app state without reading logs.

## Source Links

- V3 complete spec: `docs/STRIDE_OS_V3_COMPLETE_SPEC.md`
- Feature specs: `docs/features`
- v2.1 PRD: `docs/prd-v2.1.md`
- v2.1 implementation plan: `docs/v2.1-implementation-plan.md`
