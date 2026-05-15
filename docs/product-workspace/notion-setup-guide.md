# Notion Setup Guide

The Notion MCP server is configured for Codex, but this running session did not hot-load callable Notion page/database tools. After restarting Codex, these files can be pushed into your Notion workspace directly.

Workspace:

`https://www.notion.so/Stride-OS-Product-Workspace-361a761364d28163b134ec7515969e47`

## Recommended Pages

Create one parent page:

`Stride OS Product Workspace`

Recommended child pages:

- `Product Home`
- `Feature Tracker`
- `Issue Tracker`
- `Product Ideation`
- `Release Notes`
- `Decisions Log`
- `Meeting Notes`

## Recommended Databases

### Feature Tracker

Properties:

- `Feature` as title
- `Area` as select
- `Priority` as select: P0, P1, P2, P3
- `Status` as select: Shipped, In Review, Partial, Planned, Deferred, Archived
- `Owner` as person or text
- `Spec` as URL/text
- `Route` as text
- `Next Step` as text
- `Last Updated` as date

Views:

- By status
- By area
- P0/P1 only
- Review queue

### Issue Tracker

Properties:

- `Issue` as title
- `Area` as select
- `Severity` as select: Critical, High, Medium, Low
- `Status` as select: Open, In Progress, Ready for QA, Closed, Deferred
- `Owner` as person or text
- `Reported` as date
- `Source` as select: Partner, Screenshot, Logs, Spec review, Production
- `Expected` as text
- `Next Action` as text

Views:

- Open critical/high
- Ready for QA
- By area
- Closed this week

### Product Ideation

Properties:

- `Idea` as title
- `Area` as select
- `Impact` as select: High, Medium, Low
- `Effort` as select: Small, Medium, Large
- `Confidence` as select: High, Medium, Low
- `Status` as select: Candidate, Planned, Deferred, Rejected
- `Decision` as text

Views:

- Candidate ideas
- Planned ideas
- Deferred ideas
- High impact / small effort

### Decisions Log

Properties:

- `Decision` as title
- `Area` as select
- `Date` as date
- `Status` as select: Proposed, Accepted, Superseded
- `Rationale` as text
- `Linked Feature` as relation to Feature Tracker

Seed decisions:

- Use deterministic metrics as Tier 1 before LLM insights.
- Do not silently show zero for missing settlement or bill amounts.
- Use Gmail/manual file ingestion while Petpooja API access is unavailable.
- Keep ingestion auditable with run lifecycle, rollback, and source files.
- Human approval remains required for scanned bills and future recommendations.

## Codex Follow-Up After Restart

After restarting Codex, ask:

`Push docs/product-workspace into my Notion workspace as pages and databases.`

Expected Codex behavior:

1. Search/fetch the workspace page.
2. Create or update child pages.
3. Create databases for features, issues, ideas, and decisions if they do not exist.
4. Populate the initial rows from these Markdown files.
5. Link the product home page to all databases.
