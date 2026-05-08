import type { INVENTORY_UNITS, INVENTORY_MARGIN_TONES } from "../constants/inventory";

export type InventoryUnit = (typeof INVENTORY_UNITS)[number];
export type InventoryMarginTone = (typeof INVENTORY_MARGIN_TONES)[number];

export interface InventoryItem {
  id: string;
  outlet_id: string;
  item_name: string;
  category: string | null;
  variation: string | null;
  selling_price_paise: number;
  cost_to_prepare_paise: number | null;
  current_stock: number | null;
  reorder_level: number | null;
  unit: InventoryUnit;
  is_active: boolean;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  profit_margin_pct?: number | null;
}

export interface InventoryFilters {
  q?: string;
  category?: string;
  includeInactive?: boolean;
}

export interface InventoryItemInput {
  outlet_id: string;
  item_name: string;
  category?: string | null;
  variation?: string | null;
  selling_price_rupees: number;
  cost_to_prepare_rupees?: number | null;
  current_stock?: number | null;
  reorder_level?: number | null;
  unit?: InventoryUnit;
  is_active?: boolean;
}

export interface InventoryImportCandidate {
  itemName: string;
  category: string | null;
  variation: string | null;
  sellingPricePaise: number;
  sourceOrderCount: number;
  lastOrderedAt: string;
}

export interface InventoryCogsSummary {
  cogsPaise: number;
  itemsCovered: number;
  itemsMissingCost: number;
  coveragePct: number;
}
