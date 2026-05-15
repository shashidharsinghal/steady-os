# Product Ideation

Use this as a Notion database or page for ideas that are not yet committed to implementation. Suggested properties: `Idea`, `Area`, `Why`, `Impact`, `Effort`, `Confidence`, `Status`, `Decision`.

## Near-Term Ideas

| Idea                                                  | Area           | Why It Matters                                                                       | Impact     | Effort | Status    | Decision                                                               |
| ----------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------ | ---------- | ------ | --------- | ---------------------------------------------------------------------- |
| Manual bill/photo upload with OCR plus LLM extraction | Expenses       | Partner wants to upload photos or PDFs of bills directly, not only Gmail attachments | High       | Medium | Candidate | Build after Gmail invoice extraction stabilizes                        |
| Bill extraction diagnostics drawer                    | Expenses       | Partners need to know why amount/due date/category was missing                       | High       | Small  | Candidate | Add source text, confidence, extracted fields, and reason for review   |
| Pending bill approval queue improvements              | Expenses       | Current pending bills need fast approve/reject and correction before commit          | High       | Medium | Candidate | Add edit-before-approve and bulk actions                               |
| Production Gmail sync health page                     | Data           | Gmail ingestion is business-critical and hard to debug from UI alone                 | High       | Medium | Candidate | Add last scan, matched messages, skipped messages, extraction failures |
| True notification center                              | Platform       | Bell icon should surface ingest failures, stale data, overdue bills, and tasks       | High       | Medium | Candidate | Start with deterministic app events                                    |
| Daily partner digest                                  | Communications | Partners want morning summary without opening app                                    | Medium     | Medium | Deferred  | Use email first, Slack/WhatsApp later                                  |
| Slack notification group                              | Communications | Easier than WhatsApp group automation for internal alerts                            | Medium     | Medium | Deferred  | Revisit when notification center exists                                |
| WhatsApp partner group notification                   | Communications | Partner-preferred channel, but group webhook is not straightforward                  | Medium     | High   | Deferred  | Revisit with approved provider and compliance                          |
| Deterministic insights on dashboard                   | Analytics      | Gives value before LLM insights and validates insight UX                             | High       | Medium | Planned   | Use SQL-only patterns first                                            |
| Tier 2 LLM insights                                   | AI             | Narrative explanations over deterministic findings                                   | Medium     | Medium | Planned   | Requires evidence trace and cost caps                                  |
| Tier 3 recommendation workflow                        | AI             | Weekly action recommendations for partners                                           | Medium     | High   | Deferred  | Depends on Tier 2 and approval workflow                                |
| Multi-outlet portfolio rollup                         | Analytics      | Needed when additional outlets go live                                               | High later | Medium | Deferred  | Build close to next outlet launch                                      |
| Inventory stock and reorder thresholds                | Inventory      | Moves inventory from cost catalog to operating tool                                  | Medium     | Medium | Deferred  | Build when store ops process is ready                                  |
| Employee incentives/payroll extensions                | People         | Useful once employee data is actively maintained                                     | Medium     | Medium | Deferred  | Treat as Employees v2                                                  |
| Customer reactivation workflow                        | CRM            | Lapsed regulars can become actionable campaigns                                      | Medium     | High   | Deferred  | Needs communication compliance and merge precision                     |
| Save/export/share period views                        | Analytics      | Useful for partner reviews                                                           | Medium     | Medium | Deferred  | Add after dashboard/sales analytics stabilizes                         |

## Product Questions To Resolve

- Should pending scanned bills create zero-amount records, or should amount be required before approval?
- Should Gmail invoice scanning be limited to known senders/subjects first, or classify all attachments broadly?
- Should manual bill upload and Gmail bill scanning share the exact same extraction pipeline?
- Which notification channel should be the first production channel: email, Slack, WhatsApp, or in-app only?
- What is the acceptable confidence threshold for auto-approval of scanned expenses?
- Which partner tasks require reminders versus simple status tracking?
- When should the product introduce multi-outlet rollups: before or after the second outlet has real data?

## Idea Intake Template

```md
## Idea

## User

Partner / manager / accountant / store manager

## Problem

## Proposed solution

## Why now

## Success signal

## Risks / unknowns

## Decision

Explore / plan / defer / reject
```
