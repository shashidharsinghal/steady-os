# Feature: Inventory Items

**Status:** Final draft — for v3
**Module priority:** #5
**Who uses it:** partners (full), managers (read-only on costs)
**Last updated:** 2026-05-08
**Related:** Dashboard v3 (profit card uses this), Sales Analytics (margin column), Sales ingestion (item-level feed)

---

## Overview

A simple master list of menu items with their selling price, cost-to-prepare, and margin. Once configured, the dashboard can compute estimated COGS and profit per period, and the Sales deep-dive page can rank items by margin.

This is intentionally minimal — not a full inventory/stock management system. The MVP tracks unit economics, not stock movements.

---

## User Stories

- As a partner, I see every menu item with its margin so I know which dishes are most profitable
- As a partner, I edit cost-to-prepare for any item so margin numbers stay accurate as ingredient costs change
- As a partner, I mark items inactive when removed from the menu
- As a partner, I optionally track stock levels and reorder thresholds (Phase 2 fields)

---

## Scope

### In scope (v3 launch)

- Item list: name, category, variation, selling price, cost-to-prepare, margin %, active flag
- Add / edit / soft-delete items
- Auto-derive items from `sales_line_items` for fast initial setup ("import from sales history")
- Margin auto-computed and displayed live as user types
- Color-coded margin badge (green > 60%, amber 40–60%, red < 40%)
- Filter by category; search by name

### Out of scope (Phase 2)

- Stock level tracking with movements
- Reorder alerts
- Recipe / BOM (bill of materials)
- Multi-unit conversions
- Vendor linking

---

## Data Model

```sql
CREATE TABLE public.inventory_items (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id                uuid NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,

  item_name                text NOT NULL,
  category                 text,
  variation                text,                       -- 'Half' | 'Full' | NULL

  selling_price_paise      bigint NOT NULL CHECK (selling_price_paise >= 0),
  cost_to_prepare_paise    bigint CHECK (cost_to_prepare_paise IS NULL OR cost_to_prepare_paise >= 0),

  -- Phase 2 fields, nullable in v3
  current_stock            int,
  reorder_level            int,
  unit                     text DEFAULT 'pieces',

  is_active                boolean NOT NULL DEFAULT true,

  created_by               uuid REFERENCES auth.users(id),
  updated_by               uuid REFERENCES auth.users(id),
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz,

  UNIQUE (outlet_id, item_name, variation, deleted_at)
);

CREATE INDEX idx_inventory_outlet_active ON public.inventory_items (outlet_id, is_active)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_inventory_outlet_category ON public.inventory_items (outlet_id, category)
  WHERE deleted_at IS NULL;

CREATE VIEW public.active_inventory_items AS
  SELECT
    *,
    CASE
      WHEN cost_to_prepare_paise IS NULL OR selling_price_paise = 0 THEN NULL
      ELSE ROUND(
        ((selling_price_paise - cost_to_prepare_paise)::numeric / selling_price_paise) * 100,
        2
      )
    END AS profit_margin_pct
  FROM public.inventory_items
  WHERE deleted_at IS NULL;
```

**RLS:** Partners read+write; managers read-only.

---

## Pages & Routes

| Route               | Component                             | Auth                |
| ------------------- | ------------------------------------- | ------------------- |
| `/inventory`        | `app/(app)/inventory/page.tsx`        | partner+manager     |
| `/inventory/new`    | dialog                                | partner only        |
| `/inventory/[id]`   | dialog or page                        | partner only (edit) |
| `/inventory/import` | `app/(app)/inventory/import/page.tsx` | partner only        |

---

## UI Layout

**Page header:** standard design system header.

**Top toolbar:**

- Search input (cmd-K hint)
- Category dropdown filter
- "Show inactive" toggle (default off)
- "+ Add item" primary button
- "Import from sales" secondary button (visible if any sales data exists)

**Main area — table:**
| Column | Width | Notes |
|---|---|---|
| Item | flex | Name + variation as small muted suffix |
| Category | 140px | Pill style |
| Selling price | 120px | mono right-aligned |
| Cost | 120px | mono right-aligned; "—" if null with edit pencil |
| Margin | 100px | Color-coded pill (green/amber/red) |
| Status | 80px | LED dot + Active/Inactive |
| Actions | 60px | Edit / Archive icon buttons |

**Empty state:** "No items yet. Either [+ Add item] manually, or [Import from sales history] to bootstrap from your past orders."

**Add/Edit form:**

- Item name \* (text)
- Category (text or dropdown if existing values)
- Variation (text, optional)
- Selling price \* (₹, paise validated)
- Cost to prepare (₹, optional)
- **Live margin display** below cost field — updates as user types
- Active toggle (default on)
- Stock fields (collapsed under "Advanced")
- Submit / Cancel

---

## Import-From-Sales Flow

When `inventory_items` is empty for an outlet:

1. Query `DISTINCT item_name, variation FROM sales_line_items WHERE outlet_id = $1`
2. Show a table preview: each unique item with most recent selling price found in sales
3. Partner can deselect any rows
4. Partner clicks "Import N items" → bulk insert with `cost_to_prepare_paise = NULL`
5. Partner is taken to inventory list with all items present, costs blank, ready to fill in

---

## Server Actions

```typescript
createInventoryItem(input: CreateInventoryInput): Promise<InventoryItem>;
updateInventoryItem(id: string, input: UpdateInventoryInput): Promise<InventoryItem>;
deleteInventoryItem(id: string): Promise<void>;
toggleActive(id: string): Promise<InventoryItem>;
listInventoryItems(outletId: string, filters: InventoryFilters): Promise<InventoryItem[]>;

importFromSalesHistory(outletId: string, selections: Array<{
  itemName: string;
  variation: string | null;
  category: string | null;
  sellingPricePaise: bigint;
}>): Promise<{ created: number; skipped: number }>;

getCogsForPeriod(outletId: string, start: Date, end: Date): Promise<{
  cogsPaise: bigint;
  itemsCovered: number;
  itemsMissingCost: number;
  coveragePct: number;
}>;
```

---

## Open Questions

- [ ] Track historical costs? Recommend: NO in v3. When cost is updated, all historical COGS calcs use current cost. Add `cost_history` only if partners ask.
- [ ] How do variations interact (Half vs Full)? `(item_name, variation)` is the unique key — each variation has its own cost.
- [ ] Combo / meal items? Out of scope for v3. Treat as single line item with single cost.

---

## Definition of Done

- Items page accessible from sidebar
- Add / edit / delete works
- Import from sales history works
- Margin computed live and displayed correctly
- Profit card on dashboard reads `getCogsForPeriod` correctly
- Sales Analytics page shows margin column when data exists
- Empty state designed

```

---
```
