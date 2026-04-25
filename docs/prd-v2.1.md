# PRD: Stride OS v2.1 — Operator Truth & Action Layer

**Owner:** Partner / Steady Strides
**Author:** Product Review (Apr 2026)
**Status:** Draft for engineering kickoff
**Target release:** v2.1 (rolling, 6–8 weeks)
**Source app:** Stride OS (Next.js, routes: `/dashboard`, `/pnl`, `/customers`, `/outlets`, `/employees`, `/ingest`)

---

## 1. Context

Stride OS v2 is a thoughtfully designed operator dashboard for a multi-outlet F&B franchise (currently scoped to Gabru Di Chaap – Sector 84). It already delivers a "Morning Check," weekday-aware baselines, channel breakdowns, customer reconciliation across Pine Labs UPI VPAs and aggregator orders, and PDF-driven P&L ingestion.

A walkthrough as a partner/owner surfaced clear strengths and equally clear gaps that must close before the product becomes a daily operating tool rather than a weekly review tool.

This PRD captures the v2.1 scope: the highest-leverage fixes and feature extensions to move Stride OS from "shows what happened" to "shows what is happening and what to do."

---

## 2. Goals

- **G1 — Trust the numbers.** Eliminate inaccurate or stale displays. Channel commissions, fees, and freshness must be correct.
- **G2 — Daily relevance.** Make the dashboard usable every morning, including on mobile.
- **G3 — From data to decisions.** Surface anomalies, lapsed regulars, and P&L drivers as actionable cards.
- **G4 — Multi-outlet readiness.** Lay groundwork for portfolio rollups before more outlets onboard.
- **G5 — Complete the empty states.** No dead-end screens (Outlets profile, Employees, Settings, Contractors).

## 3. Non-goals (v2.1)

- Full recommendation engine ("Tier 3" slot stays a placeholder).
- Inventory / procurement / vendor module.
- Customer marketing/CRM outbound (SMS/WhatsApp campaigns).
- Native mobile app — responsive web only.

---

## 4. Success metrics

| Metric                                           | Baseline      | Target (90 days post-v2.1)     |
| ------------------------------------------------ | ------------- | ------------------------------ |
| Median data staleness on dashboard load          | ~25 days      | < 24 hours                     |
| Channel commission accuracy (Swiggy/Zomato)      | 0% (shows ₹0) | ≥ 98% vs source PDFs           |
| Daily active partner sessions                    | n/a           | ≥ 5 / week / partner           |
| % of regulars correctly merged across identities | unknown       | ≥ 85% precision on labeled set |
| Time-to-first-insight on AM open                 | n/a           | < 10 seconds                   |

---

## 5. Prioritized improvements

Numbered P0 → P3 in order of release.

### P0 — Trust fixes (must ship first)

1. **P0.1 Channel commission & fees parsing**
2. **P0.2 Data freshness automation + nags**
3. **P0.3 Today's Rush — fix or remove**
4. **P0.4 Remove dev artifacts** ("Stop Claude" button, unexplained "1 Issue" badge)

### P1 — Owner depth

5. **P1.1 P&L line-item breakdown + MoM trend**
6. **P1.2 Outlet profile completion (address, phone, cover photo, hours)**
7. **P1.3 Notifications & alerts center (bell icon becomes real)**

### P2 — Daily ergonomics

8. **P2.1 Mobile-first Morning Check view**
9. **P2.2 Period view: export, save view, share link**
10. **P2.3 Customer identity-merge improvements**

### P3 — Portfolio readiness

11. **P3.1 Portfolio rollup view (multi-outlet)**
12. **P3.2 Employees module v1 (CSV import, role templates, payroll cadence)**
13. **P3.3 Activate Contractors and Settings**

---

## 6. Detailed feature specs

### P0.1 — Channel commission & fees parsing

**Problem:** Channel Economics shows Swiggy ₹3.4K and Zomato ₹7.8K with `commission = ₹0`, `fees = ₹0`, `net per ₹100 = ₹100`. This is provably wrong and undermines the product's most differentiated view.

**Scope**

- Update aggregator parsers (`/ingest` → `swiggy_settlement`, `zomato_settlement` document types) to extract: gross, commission, payment gateway fees, taxes withheld, promo cost share, net payout.
- Persist on each `order` row: `gross`, `commission`, `fees`, `net_to_us`.
- Recompute Channel Economics table from `SUM(net_to_us) / SUM(gross) * 100`.
- If a row has no settlement data, mark it `pending_settlement` and exclude from net calculations (do not silently set to ₹0).

**Data contract**

```ts
type OrderEconomics = {
  order_id: string;
  channel: "dine_in" | "takeaway" | "swiggy" | "zomato" | "other";
  gross: number;
  commission: number | null; // null when not yet settled
  fees: number | null;
  taxes_withheld: number | null;
  promo_share: number | null;
  net_to_us: number | null;
  settlement_status: "settled" | "pending" | "unknown";
};
```

**UI changes (`/dashboard` Section 3)**

- Replace ₹0 placeholders with `—` and a tooltip: "Awaiting settlement file."
- Add a small "X of Y orders settled" badge under the table.
- Add a "Take-home leak" sub-card: highlight the channel with the largest gross-to-net delta this period.

**Acceptance**

- Upload a real Swiggy settlement xlsx → `net per ₹100` for Swiggy lands within ±1 of the figure on the settlement sheet.
- Orders without a matching settlement render `—`, never `₹0`.

---

### P0.2 — Data freshness automation

**Problem:** Dashboard shows orders dated 31 Mar 2026 on a 25 Apr 2026 visit. The "1 day old" banner is a lie.

**Scope**

- Compute true staleness: `now() - max(order.created_at)` per outlet.
- Show staleness in three buckets with color: `< 36h` green, `36h–7d` amber, `> 7d` red.
- Add a "Connect Petpooja" / "Connect Pine Labs" CTA in `/ingest` for API-based pulls (stub OK if APIs are not yet contracted — back with a daily reminder email/WhatsApp via existing notifications channel).
- Daily 9:00 AM IST cron: if any outlet's staleness > 48h, send the partner a reminder via the notifications channel and email.

**Acceptance**

- Banner copy reflects true staleness (no hardcoded "1 day old").
- Reminder fires once per day per outlet until fresh data is uploaded.

---

### P0.3 — Today's Rush

**Problem:** Hourly bars 11:00–23:00 always show dashes ("Rush pattern will appear after more data") even when there are 4+ Saturdays of history.

**Scope**

- Lower min-sample threshold to 2 weekdays of the same DOW with ≥ 3 orders each.
- If still insufficient, replace the hourly card with a single sentence baseline (`"Typical Saturday peak hour: 20:00 (4.2 orders/hr)"`) instead of an empty grid.
- Bug: confirm the `orders_master` ingest is populating the hour-of-day column; back-fill if missing.

**Acceptance**

- Card lights up for any DOW with ≥ 2 prior weeks of data.
- Empty state never shows 13 dashed rows.

---

### P0.4 — Remove dev artifacts

- Remove the "Stop Claude" button from `/outlets` (and any other route).
- Make the bottom-left "1 Issue" badge openable; it should route to the new Notifications panel (P1.3) or be removed if it has no source.

---

### P1.1 — P&L line-item breakdown

**Problem:** `/pnl` shows only Sales and Net loss. Owners need the lines.

**Scope**

- Parse franchise P&L PDF into a normalized chart of accounts:

> **Note:** The original PRD content available in this conversation
> was truncated at this point. The detailed spec for P1.1 and all
> subsequent items (P1.2, P1.3, P2.1–P2.3, P3.1–P3.3) was not
> captured in chat. The implementation plan in
> `docs/v2.1-implementation-plan.md` reflects the operative scope
> decisions including how items P3.2 and P3.3 are reconciled with
> already-shipped Employees and Contractors features.
>
> If you have the full PRD text elsewhere, paste the remaining
> content into this file replacing this note.
