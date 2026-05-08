import { z } from "zod";
import { INVENTORY_UNITS } from "../constants/inventory";

export const inventoryItemSchema = z.object({
  outlet_id: z.string().uuid(),
  item_name: z.string().trim().min(1, "Item name is required"),
  category: z.string().trim().optional().nullable(),
  variation: z.string().trim().optional().nullable(),
  selling_price_rupees: z.coerce.number().min(0, "Selling price cannot be negative"),
  cost_to_prepare_rupees: z.coerce.number().min(0).optional().nullable(),
  current_stock: z.coerce.number().int().min(0).optional().nullable(),
  reorder_level: z.coerce.number().int().min(0).optional().nullable(),
  unit: z.enum(INVENTORY_UNITS).default("pieces"),
  is_active: z.boolean().default(true),
});

export const createInventoryItemSchema = inventoryItemSchema;

export const updateInventoryItemSchema = inventoryItemSchema.partial().extend({
  outlet_id: z.string().uuid(),
  item_name: z.string().trim().min(1, "Item name is required"),
  selling_price_rupees: z.coerce.number().min(0, "Selling price cannot be negative"),
});

export const inventoryFiltersSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  includeInactive: z.boolean().optional(),
});

export const inventoryImportSelectionSchema = z.object({
  itemName: z.string().min(1),
  category: z.string().nullable(),
  variation: z.string().nullable(),
  sellingPricePaise: z.number().int().nonnegative(),
});

export type CreateInventoryItemInput = z.infer<typeof createInventoryItemSchema>;
export type UpdateInventoryItemInput = z.infer<typeof updateInventoryItemSchema>;
export type InventoryFiltersInput = z.infer<typeof inventoryFiltersSchema>;
export type InventoryImportSelectionInput = z.infer<typeof inventoryImportSelectionSchema>;
