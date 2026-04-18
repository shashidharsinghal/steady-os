# Feature: Design System v1 + Dark Mode

Upgrade Stride OS from default-scaffold UI to a distinctive, modern,
information-dense design system. Fix dark mode. Establish patterns every
future feature will inherit.

This is UI/infrastructure work, not a user feature — but it's the highest-
leverage single session we can run because it improves every existing AND
every future screen.

---

## Inspiration

Target aesthetic: think Linear + Vercel dashboard + Notion, with a warm
Indian-hospitality-industry personality. Not Stripe-style corporate, not
Notion-style playful — something in between, trending modern.

Reference products to study before building:

- linear.app — density, typography, restrained color, motion
- vercel.com/dashboard — hierarchy, chart treatment, empty states
- posthog.com — multi-role internal tool with real data density
- cal.com — clean forms with personality

---

## Brand Tokens

Define these as CSS variables, used by Tailwind + shadcn/ui.

### Color system

- `--primary` — brand primary. Suggested: a warm saffron/amber
  (restaurant industry hint without being cliché). HSL to be chosen in the
  session; currently placeholder.
- `--secondary` — deep neutral / muted accent
- `--success` — green
- `--warning` — amber
- `--danger` — red
- Full neutral scale (50–950) for backgrounds, borders, text
- Both light and dark variants defined

Use HSL, not hex, so shadcn's alpha-mixing works correctly:
`--primary: 32 95% 44%;` (example: saffron)

### Typography

- Primary: **Inter** (or **Geist** if preferred — both sans with excellent numerals)
- Monospace: **JetBrains Mono** (for numbers, IDs, code)
- Scale: 12 / 13 / 14 / 16 / 18 / 20 / 24 / 32
- Line heights: tight on headers, generous on body
- Font weights used: 400, 500, 600 only. Avoid 700 except for rare headings.

### Spacing & sizing

- Base unit: 4px
- Container max-width: 1400px for list pages, 900px for forms, full-bleed for dashboards
- Card border-radius: 10px (softer than shadcn default 8)
- Input height: 36px
- Focus rings: 2px, primary color at 40% alpha

### Elevation

- Cards: no heavy shadows; use 1px border + subtle background shift
- Popovers / dialogs: single soft shadow
- Dark mode: use border tints instead of shadows

---

## Dark Mode — Correct Implementation

Most likely-broken pieces; audit and fix all:

1. `next-themes` installed; `<ThemeProvider attribute="class" defaultTheme="system" enableSystem>` wraps `<body>` in `app/layout.tsx`
2. `<html lang="en" suppressHydrationWarning>` at root
3. Tailwind config `darkMode: ["class"]`
4. `globals.css` defines `:root { --foo: ... }` and `.dark { --foo: ... }` with full token set
5. All components reference tokens via Tailwind classes (`bg-background`, `text-foreground`) — never hardcoded colors
6. Theme toggle in the app shell (top-right, icon button with Sun/Moon/Monitor options from lucide-react) using `useTheme()` from `next-themes`
7. System preference respected on first load; choice persists in localStorage
8. No flash-of-wrong-theme on refresh (the `suppressHydrationWarning` + class-based strategy handles this; verify)

---

## Layout Refresh

### App shell (`apps/web/app/(app)/layout.tsx`)

Current: basic sidebar. Upgrade to:

- **Collapsible sidebar** (icon-only collapsed state) with smooth transition
- **Sidebar sections:**
  - Top: Stride OS wordmark + small outlet switcher (if partner has multiple outlets visible)
  - Middle: nav links with icons + labels
  - Bottom: current user avatar + theme toggle + sign out menu
- **Top bar:** breadcrumb, search (cmd-K placeholder — no behavior yet), notifications icon (placeholder)
- **Main area:** consistent padding, max-width per page type

### Navigation icons

Use `lucide-react` consistently:

- Dashboard → `LayoutDashboard`
- Outlets → `Store`
- Employees → `Users`
- Contractors → `HardHat`
- Ingest → `Upload`
- Settings → `Settings`

---

## Component Upgrades

Replace or enhance in `packages/ui`:

### Cards

- Add subtle hover state (border lift, not shadow)
- Add variant: `interactive` for clickable cards

### Tables

- Zebra striping OFF by default (cleaner), ON as opt-in
- Sticky header
- Row hover state
- Empty state: centered illustration + message + CTA

### Forms

- Labels above inputs (not floating)
- Helper text muted, small, below input
- Error text in danger color with an inline icon
- Inline validation on blur, not on every keystroke

### Status badges

- Solid dot + text pattern (LED-style), not pill-shaped blocks
- Matches Linear's approach

### Empty states

- Every list page gets a designed empty state
- Pattern: subtle SVG illustration + heading + description + primary CTA

### Loading states

- Replace generic skeletons with content-shaped skeletons that match the actual layout

---

## Concrete Page-Level Changes

### `/outlets` (list)

- Grid of cards with cover photo on top (requires Outlet Photos feature)
- Name (large), brand (small muted), status dot + label
- Metadata row: 3 icons (Store / MapPin / Phone) with compact values
- Hover: card lifts slightly

### `/outlets/[id]` (detail)

- Hero: cover photo wide, overlaid name + status badge
- Tabs styled like Linear (underline, not boxed)
- Overview tab: metadata in a two-column grid, each field with icon + label + value
- Photo gallery in the overview tab

### `/employees` (list)

- Data-dense table by default (not cards) — feels more like a real ops tool
- Columns: Avatar + Name / Role / Position / Outlet / Phone / Joined / Status
- Filters as chips above the table
- Search input with cmd-K keyboard hint on the right

### Login page

- Full-bleed, centered card with product wordmark
- Subtle gradient background that respects theme
- "Sign in with Google" as the only button

---

## Implementation Order (one session, three phases)

### Phase 1 — Tokens + Dark Mode

- Define CSS variables in `globals.css`
- Fix `ThemeProvider` wiring
- Add theme toggle to app shell
- Verify every existing page in both modes
- Commit: `feat(design): tokens, dark mode, theme toggle`

### Phase 2 — Component Upgrades

- Upgrade Card, Table, Form, Badge, Empty-state primitives in `packages/ui`
- Update shadcn components to reference new tokens
- Commit: `feat(design): refreshed component primitives`

### Phase 3 — Page-Level Polish

- Outlet list/detail
- Employee list/detail
- Contractor list/detail
- App shell (sidebar + top bar)
- Login page
- Empty states everywhere
- Commit: `feat(design): page-level layout and polish`

---

## Out of Scope

- Marketing site / public landing page (doesn't exist yet, different domain)
- Mobile app (Phase 3)
- Animations beyond subtle hover/focus transitions
- Custom illustrations (use `lucide-react` + simple SVGs only)

---

## Definition of Done

- Every existing page looks deliberately designed, not scaffolded
- Dark mode works flawlessly across every page; no flash on reload; toggle persists
- Zero hardcoded colors in components; all via CSS variables
- `packages/ui` components are the only source of truth for visual primitives
- CLAUDE.md updated with a "Design System" section listing tokens and primitives to reuse
- Build + typecheck clean
