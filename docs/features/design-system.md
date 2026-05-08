# Feature: Design System v3

**Status:** Final — for v3 implementation
**Last updated:** 2026-05-08
**Supersedes:** earlier abstract design-system.md
**Visual reference:** `docs/design-exports/SteadyStrideOS_Redesign.html`

This is the canonical visual language for Stride OS. Every component and page must use these tokens. Values come directly from the Claude Design prototype.

---

## Tokens — Light Mode (default)

```css
:root {
  /* Paper / Ink palette */
  --paper: #f6f3ec;
  --paper-2: #efeae0;
  --ink: #14171c;
  --ink-2: #2a2f38;
  --muted: #6c7280;
  --line: #e2dccf;
  --line-strong: #cfc6b3;
  --card: #ffffff;

  /* Accent — coral */
  --accent: #ff5b3a;
  --accent-soft: #ffe4dc;

  /* Semantic */
  --green: #3a7d4e;
  --green-soft: #d8ecdc;
  --amber: #b8862c;
  --amber-soft: #f4e7c1;
  --red: #c83a2c;
  --red-soft: #f6dbd5;
  --blue: #2a5cd6;
  --blue-soft: #dbe4f7;
  --violet: #5b3a9e;
  --violet-soft: #e4dbf3;

  /* Geometry */
  --radius: 10px;
  --pad: 16px;

  /* Elevation */
  --shadow: 0 1px 0 rgba(20, 23, 28, 0.04), 0 0 0 1px var(--line);
  --shadow-elev: 0 12px 32px -16px rgba(20, 23, 28, 0.18), 0 1px 0 rgba(20, 23, 28, 0.05);
}
```

## Tokens — Dark Mode

```css
[data-theme="dark"] {
  --paper: #0e1014;
  --paper-2: #14171c;
  --ink: #f1ece1;
  --ink-2: #c9c2b1;
  --muted: #8a8f9a;
  --line: #23272f;
  --line-strong: #2f343d;
  --card: #14171c;

  --accent: #ff7a5c;
  --accent-soft: #3a1d15;

  --green: #6dc188;
  --green-soft: #16291c;
  --amber: #e0b35a;
  --amber-soft: #2c2412;
  --red: #ed6e60;
  --red-soft: #2c1612;
  --blue: #6e94f0;
  --blue-soft: #161e34;
  --violet: #a48de0;
  --violet-soft: #1f1830;

  --shadow: 0 1px 0 rgba(0, 0, 0, 0.3), 0 0 0 1px var(--line);
  --shadow-elev: 0 16px 36px -18px rgba(0, 0, 0, 0.6), 0 0 0 1px var(--line);
}
```

---

## Typography

Three families:

- **Inter** — body, UI text, numbers (with `tabular-nums`)
- **Instrument Serif** (italic) — page titles only, large display
- **JetBrains Mono** — numeric values where consistency matters (table numbers, IDs, amounts)

Sizes: 10 / 11 / 12 / 13 / 14 / 16 / 18 / 24 / 32 / 44px.

Headings:

- **Page title:** 44px Instrument Serif italic, weight 400, letter-spacing -0.02em
- **Page eyebrow:** 11px Inter, uppercase, letter-spacing 0.18em, color `--accent`, weight 600
- **Card title:** 12px Inter, uppercase, letter-spacing 0.12em, color `--muted`, weight 600

Body: 14px Inter, weight 400, line-height 1.4.

Add via `next/font` (Inter is already present):

```typescript
import { Instrument_Serif, JetBrains_Mono } from "next/font/google";
const serif = Instrument_Serif({
  weight: "400",
  style: "italic",
  subsets: ["latin"],
  variable: "--font-serif",
});
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
```

---

## Layout

- App grid: `grid-template-columns: 248px 1fr` (sidebar + main)
- Sidebar collapsed (rail) variant: 64px wide
- Top bar height: 64px, sticky, blurred background
- Page content max-width: 1480px
- Page padding: 24px 28px

---

## Components

### Card

```css
.card {
  background: var(--card);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: var(--pad);
}
.card.elev {
  box-shadow: var(--shadow-elev);
}
```

### Buttons

- `.btn` — default, white background, line border
- `.btn.primary` — ink background, paper text
- `.btn.accent` — coral background, white text
- `.btn.ghost` — transparent
- `.btn.sm` — smaller padding
- `.btn.danger` — soft-red background, red text

### Pills

- `.pill` — neutral default
- `.pill.green` / `.red` / `.amber` / `.blue` / `.violet` — semantic colors using soft backgrounds

### Stats

```css
.stat-num {
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.stat-num.lg {
  font-size: 44px;
}
.stat-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--muted);
  font-weight: 600;
}
.delta {
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.delta.up {
  color: var(--green);
}
.delta.down {
  color: var(--red);
}
```

### Sparkline

40px tall, full card width. Use Recharts `<AreaChart>` with no axes, no grid, accent color fill.

### Density tokens

```css
[data-density="compact"] {
  --pad: 12px;
}
[data-density="cozy"] {
  --pad: 16px;
} /* default */
[data-density="comfy"] {
  --pad: 22px;
}
```

---

## Sidebar Structure (v3)

Three sections:

```
MAIN
  Dashboard
  Sales            (Sales Analytics deep-dive)
  Expenses         ← new
  Inventory        ← new
  Customers

MANAGE
  Outlets
  Employees
  P&L Reports

SYSTEM
  Ingest
  Admin            ← new
```

Active item: `--ink` background, `--paper` text. Hover: `--paper-2` background.

---

## Navigation Icons (lucide-react)

- Dashboard → `LayoutDashboard`
- Sales → `TrendingUp`
- Expenses → `Receipt` (or `Wallet`)
- Inventory → `Package` (or `Box`)
- Customers → `Users`
- Outlets → `Store`
- Employees → `UserCog`
- P&L Reports → `FileText`
- Ingest → `Upload`
- Admin → `Settings`

---

## Implementation Checklist

- [ ] Replace `globals.css` token block with values above (light + dark)
- [ ] Update Tailwind config to expose all tokens via `theme.extend.colors`
- [ ] Add Instrument Serif and JetBrains Mono via `next/font`
- [ ] Update `<PageHeader>` component to use the eyebrow + serif title pattern
- [ ] Update sidebar component to use the three-section structure
- [ ] Add density token support (default `cozy`)
- [ ] Audit every page — no hardcoded colors, all via tokens
- [ ] Ensure dark mode toggle works flawlessly with no flash on reload

```

---
```
