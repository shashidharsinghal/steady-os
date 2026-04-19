# Architecture: The Three-Tier AI Stack

**Status:** Architecture reference
**Last updated:** 2026-04-19
**Related:** `dashboard-v2.md`, `customer-intelligence.md`, `ai-admin-panel.md`,
`insights-engine.md`, `recommendations-engine.md`

This document is the architectural spine for the AI-augmented features in
Stride OS. Read it before any of the feature specs that reference it — it
explains the separation of concerns, what each tier is allowed to do, and
why the boundaries matter.

---

## The Three Tiers

```
┌──────────────────────────────────────────────────────────────┐
│  TIER 3 — RECOMMENDATIONS                                     │
│  "Here's what to do about it."                                │
│                                                                │
│  Orchestrated workflow combining internal findings + external │
│  research. Produces structured recommendations with citations  │
│  and required human approval before any action.               │
│                                                                │
│  Cadence: Weekly batch. On-demand also available.             │
│  Model: Opus-tier (stronger reasoning + tool use).            │
│  Cost: ~₹150-350 per run.                                     │
│  Auditability: Every step logged; citations are URLs.         │
└──────────────────────────────────────────────────────────────┘
                           ▲
                           │ depends on
                           │
┌──────────────────────────────────────────────────────────────┐
│  TIER 2 — INSIGHTS                                            │
│  "Why did this happen? What does the pattern mean?"           │
│                                                                │
│  Nightly LLM-based narrative synthesis over pre-computed      │
│  deterministic findings. Outputs short, evidence-backed       │
│  observations.                                                 │
│                                                                │
│  Cadence: Daily batch. On-demand also available.              │
│  Model: Sonnet or GPT-4o tier (narrative, not reasoning).     │
│  Cost: ~₹5-15 per run.                                        │
│  Auditability: Every insight cites its source findings.       │
└──────────────────────────────────────────────────────────────┘
                           ▲
                           │ depends on
                           │
┌──────────────────────────────────────────────────────────────┐
│  TIER 1 — METRICS & DATA VIEWS                                │
│  "What happened?"                                              │
│                                                                │
│  Deterministic SQL aggregations over the canonical schema.    │
│  Instant, auditable, reproducible. Powers dashboards and      │
│  serves as input to Tiers 2 and 3.                            │
│                                                                │
│  Cadence: On demand (request-time).                           │
│  Model: None — pure SQL + application code.                   │
│  Cost: Negligible.                                             │
│  Auditability: SQL queries are inspectable; results are       │
│  reproducible.                                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## Why Three Tiers, Not One

Three reasons this separation matters:

### 1. Different latency requirements

- **Metrics** are request-time. You load a dashboard page; queries run; numbers render. Target: under 1 second.
- **Insights** are overnight. You check them with morning chai. Target: available by 6 AM IST.
- **Recommendations** are weekly. You act on them in Monday partner meetings. Target: available Monday 5 AM IST.

Trying to serve all three from the same code path either makes metrics slow or recommendations rushed. Separation lets each serve its latency target naturally.

### 2. Different trust characteristics

- **Metrics** are deterministic. A given query against the same data always produces the same number. You can audit the SQL. You can trust it completely.
- **Insights** are LLM-generated. Different runs may produce slightly different framings. They must carry evidence traces so humans can verify — and the system must guard against hallucination via structured output and grounding.
- **Recommendations** are agentic compositions. They synthesize internal data with external research and propose actions. They must be treated as drafts, not directives — humans approve before any action is taken.

Collapsing these into one UI is how "AI dashboards" become confusing — users can't tell which number is guaranteed versus which is model-generated. Stride OS separates them explicitly.

### 3. Different failure modes

- **Metrics bug** → a SQL error. Fixable. Bounded.
- **Insights bug** → hallucinated observation. Requires guardrails, eval sets, evidence traces, feedback loops.
- **Recommendations bug** → wasted management attention, eroded trust. Requires human review gates, citation verification, explicit assumptions.

Each tier has its own testing strategy. Mixing them makes all three harder to test.

---

## What Each Tier Can and Cannot Do

Strict boundaries, enforced in code structure:

### Tier 1 — Metrics

**Can:** Run SQL, compute aggregates, format results for display, serve dashboard views.
**Cannot:** Call an LLM. Invoke external APIs. Produce narrative prose. Draw conclusions.

Tier 1 code lives in `packages/metrics/` and feature-specific query modules. It's pure data computation. Output is typed data structures, never strings of English prose.

### Tier 2 — Insights

**Can:** Read Tier 1 results. Call an LLM once per insight run. Store results. Cite source metrics.
**Cannot:** Invoke web search or external research tools. Make recommendations. Suggest actions. Trigger side effects (emails, WhatsApp, etc).

Tier 2 code lives in `packages/insights/`. Each run is a single LLM call with structured input (findings) and structured output (insights). No loops, no tool use.

### Tier 3 — Recommendations

**Can:** Read Tier 1 results and Tier 2 insights. Invoke web search. Invoke web fetch for specific URLs. Run multi-step workflows. Cite external sources. Produce structured recommendations with assumptions and counterpoints.
**Cannot:** Auto-execute actions. Send communications. Mutate business data directly. Loop indefinitely.

Tier 3 code lives in `packages/recommendations/`. Workflows are explicitly coded — no autonomous "let the agent figure it out" loops. Each step is a named function with a typed input and output.

---

## Implementation Technology

### Runtime

**All three tiers run in the same Next.js codebase.** No separate Python service, no microservices, no LangGraph runtime.

- **Tier 1** is Server Components + server actions with SQL via Supabase.
- **Tier 2** is scheduled jobs via `pg_cron` + Supabase Edge Functions, or Vercel Cron. The job calls an internal API route that runs the insights pipeline.
- **Tier 3** is the same scheduling mechanism, just with longer-running jobs and external tool invocation.

### LLM abstraction

We use the **Vercel AI SDK** (`ai` npm package) for all model calls. Reasons:

- Provider-agnostic (OpenAI, Anthropic, Google, open-source) — matches our configurable-model requirement
- Native TypeScript, Zod-validated structured outputs
- Built-in tool-use support (needed for Tier 3)
- Production-quality streaming and error handling

Every LLM call in Stride OS goes through a shared helper:

```typescript
// packages/ai/src/call-llm.ts
export async function callLLM<T extends z.ZodType>(config: {
  feature: AIFeatureId; // e.g., 'insights' | 'recommendations'
  modelConfig: ModelConfig; // resolved from ai_feature_configs
  prompt: string | Message[];
  schema: T;
  tools?: ToolSet;
  maxCostPaise?: number;
}): Promise<{
  result: z.infer<T>;
  usage: TokenUsage;
  costPaise: number;
  runId: string;
}>;
```

This helper handles:

- Provider routing (OpenAI / Anthropic / etc)
- Cost tracking — writes to `ai_runs` table
- Cost cap enforcement — aborts if projected cost exceeds `maxCostPaise`
- Retry logic with exponential backoff
- Structured error types the caller can handle

No feature code calls the OpenAI/Anthropic SDK directly. Ever.

### Why not LangGraph or similar

LangGraph and similar frameworks are designed for:

- Cyclic workflows ("keep refining until output passes checks")
- Complex state machines (dozens of nodes, conditional transitions)
- Multi-agent collaboration (specialized agents negotiating)

None of this describes what Stride OS needs. Our Tier 3 workflow is linear and deterministic in structure: "gather signals → research each → synthesize → rank → persist." Writing that in plain TypeScript with named async functions is clearer, cheaper, more debuggable, and doesn't add a framework dependency that competes with our existing stack.

**Revisit if:** 6 months in, we find a genuine need for cyclic refinement, adaptive planning, or multi-agent negotiation. Don't adopt frameworks speculatively.

---

## Cost Management

### Per-run cost tracking

Every LLM call records: input tokens, output tokens, model used, cost in paise (INR at current exchange rate). Stored in `ai_runs` table (see `ai-admin-panel.md` for schema).

### Hard caps

Each feature has a per-run cost cap configurable via the admin panel. If projected cost exceeds the cap, the run aborts with an error. This prevents runaway costs from bad prompts or runaway loops.

### Monthly ceiling

Each feature also has a monthly ceiling. The scheduler checks month-to-date spend before dispatching a scheduled run. Exceeding it marks the feature as "paused — cap reached" until the next month or manual reset.

### Model choice as cost lever

Since models are configurable per feature, cost can be tuned independently of code. If Recommendations become too expensive on Opus, switch to Sonnet and see if quality holds. No code change.

### Default budgets

Suggested starting budgets (assumptions: 1 outlet, current data volume):

| Feature                  | Per-run cap | Monthly cap |
| ------------------------ | ----------- | ----------- |
| Insights (daily)         | ₹25         | ₹600        |
| Recommendations (weekly) | ₹500        | ₹2,500      |

Total AI spend: ~₹3,000/month at start. Adjustable up or down via admin panel.

---

## Auditability Requirements (cross-cutting)

Every Tier 2 and Tier 3 output must be traceable to its inputs.

### For insights

Each insight record stores:

- The metric(s) it references, as structured references (not strings)
- The prompt template version used
- The model used
- The run ID that produced it
- The token usage and cost

Effect: a partner seeing "Saturday revenue dropped 22% vs 4-week average" can click the insight and see exactly which SQL query was referenced, which metric value was computed, what prompt was used, what the raw model response looked like. No black boxes.

### For recommendations

Each recommendation stores everything above, plus:

- External sources cited (URLs with fetched-at timestamps)
- Assumptions stated explicitly
- The "why this might be wrong" section
- The approval status (pending / approved / dismissed / snoozed) + who acted on it + when

Effect: a recommendation that says "run a WhatsApp campaign to lapsed regulars, industry benchmark suggests 12–18% reactivation" is clickable down to the article it cited and the precise query that identified the lapsed-regulars list.

---

## Data Flow, Concretely

### Daily 6 AM IST — Insights run

1. Cron triggers `runInsights` Edge Function
2. Function queries Tier 1 — loads yesterday's metrics + 4-week baselines + anomaly candidates
3. Formats into a structured context object
4. Single LLM call with strict JSON output schema
5. Insights written to `insights` table
6. Dashboard v2's Insights panel displays them on next load

### Monday 5 AM IST — Recommendations run

1. Cron triggers `runRecommendations` Edge Function
2. Step 1: Gather deterministic signals (reuses metric queries)
3. Step 2: LLM call — rank signals by investigability, pick top 5
4. Step 3: For each signal, an LLM call with web-search tool enabled to find external grounding
5. Step 4: LLM call per signal — compose structured recommendation with citations
6. Step 5: Persist to `recommendations` table with status `pending`
7. WhatsApp notification to partners: "3 new recommendations to review"
8. Partners review in `/recommendations` UI, approve or dismiss

### On-demand

Admin panel "Run now" button invokes the same function as the cron job, with the same cost tracking. Useful for experimentation and for demonstrating the feature.

---

## Security Considerations

### API keys

LLM provider API keys (OpenAI, Anthropic) stored in Supabase Vault or Vercel environment variables — never in source code, never in the database beyond Vault. Admin panel surface "configured / not configured" but never displays the key.

### Prompt injection

A real risk when we pass raw user data (customer names, reviews if ingested later) into LLM prompts. Mitigations:

- Sanitize inputs to strip obvious injection attempts
- Use structured prompts — user data is clearly delimited from instructions
- Output schemas are strictly typed — if the model generates outside the schema, the call fails rather than succeeds with weird data
- Never let LLM output trigger side effects directly; all side effects require human approval

### Web search / fetch in Tier 3

The recommendation agent can search the web and fetch URLs. Guardrails:

- Domain allowlist for fetches (trusted industry publications, not arbitrary URLs)
- Rate limits per run
- Content is treated as untrusted — not executed, not mixed with instructions

### Data leakage

Stride OS data is private. We must not include customer PII in LLM prompts where we can avoid it. Specifically:

- Customer names and full phone numbers never go into prompts
- Phone hashes are fine (they're not reversible by the model)
- Aggregate numbers (revenue, order counts) are fine
- If a specific customer case needs to be referenced, use anonymized IDs ("Customer A", "Customer B")

---

## Evaluation and Quality

AI output quality is hard to measure without deliberate investment. Minimum viable evaluation:

### For insights

- After each run, a partner can thumb up / thumb down each insight
- Feedback is stored with the insight
- Monthly review: look at low-scored insights, identify patterns, adjust prompts
- Target: >70% of insights marked useful after 3 months of tuning

### For recommendations

- Every recommendation has an approval flow. Approved / Dismissed / Snoozed is the signal.
- Approved: "this is worth acting on"
- Dismissed: "this is wrong, generic, or irrelevant"
- Snoozed: "maybe later, not now"
- Dismissal rate is the quality metric. Target: <30% dismissal after tuning.

### Regression prevention

- When prompt templates change, they're versioned. Previous versions stay in the DB.
- A small set of "golden examples" (curated by partners) runs on every prompt change. If output quality degrades, the new prompt is rejected.

This evaluation work is not v1 scope — but the hooks for it (feedback fields, prompt versioning, eval suite structure) are designed in from day one.

---

## What This Architecture Does NOT Do (deliberately)

- **No autonomous agents.** No "the AI decided to run this action." All actions require human approval.
- **No real-time LLM calls on request paths.** Dashboards load instantly because they never wait on a model. LLMs run in batches.
- **No cross-feature coordination.** Insights don't know about recommendations and vice versa. They're independent pipelines with shared infrastructure, not a coordinated system. If a partner dismisses an insight, recommendations don't automatically suppress related topics. This keeps each pipeline understandable in isolation.
- **No continuous learning.** The system doesn't train on its own feedback. Prompt improvements are manual decisions by partners and developers. This is intentional — automated prompt evolution is a separate class of risk we're not taking on.

---

## Evolution Path

When do we revisit this architecture?

- **When latency demands change** — if partners want live-during-session insights (e.g., "analyze this upload right now"), we add a request-time Tier 2 path. Not at launch.
- **When multi-outlet scales** — if Stride OS runs 10+ outlets and insights become too coupled, we may need per-outlet isolation or aggregation tiers.
- **When costs force trade-offs** — if monthly AI spend becomes meaningful vs revenue impact, we invest in prompt caching, result caching, model distillation, etc.
- **When quality plateaus** — if dismissal rates stay >30% after 6 months of tuning, we revisit whether the recommendations engine is delivering enough value to keep.

Until any of these trigger, keep the architecture simple.
