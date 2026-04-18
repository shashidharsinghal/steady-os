# Feature Specs

Each file in this folder describes one feature of Stride OS — what it does, who it's for,
the data model, the pages/components needed, and any open questions.

Specs are written before implementation and kept updated as the feature evolves.
Claude reads these files when building a feature; treat them as the source of truth.

## How to use

1. Copy `_template.md` → `<feature-slug>.md`
2. Fill in the sections. Leave open questions as `[ ]` checkboxes until resolved.
3. When starting implementation, paste the spec path into the prompt:
   > "Implement the spec in docs/features/ingest.md"
4. Update the spec if the implementation diverges (data model changes, scope cuts, etc.)

## Module build order (from CLAUDE.md)

| #   | Slug                | Status         |
| --- | ------------------- | -------------- |
| 1   | [ingest](ingest.md) | 🔲 spec        |
| 2   | knowledge-base      | ⬜ not started |
| 3   | employees           | ⬜ not started |
| 4   | expenses            | ⬜ not started |
| 5   | sales-pnl           | ⬜ not started |
| 6   | dashboard           | ⬜ not started |
| 7   | recommendations     | ⬜ not started |
| 8   | tasks               | ⬜ not started |
| 9   | roles-security      | ⬜ not started |
