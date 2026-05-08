import type {
  CreateInventoryItemInput,
  InventoryCogsSummary,
  InventoryFilters,
  InventoryImportCandidate,
  InventoryItem,
  InventoryImportSelectionInput,
  UpdateInventoryItemInput,
} from "@stride-os/shared";
import { createInventoryItemSchema, updateInventoryItemSchema } from "@stride-os/shared";
import { createClient } from "@/lib/supabase/server";

type JoinedLineItem = {
  item_name: string;
  category: string | null;
  quantity: number;
  unit_price_paise: number;
  line_total_paise: number;
  raw_data: Record<string, unknown> | null;
  sales_orders: {
    outlet_id: string;
    ordered_at: string;
    status: string;
  } | null;
};

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function buildInventoryKey(itemName: string, variation: string | null | undefined) {
  const normalizedVariation = variation?.trim();
  return normalizeText(
    normalizedVariation ? `${itemName.trim()} (${normalizedVariation})` : itemName.trim()
  );
}

function readVariation(rawData: Record<string, unknown> | null | undefined, itemName: string) {
  const fromRaw =
    typeof rawData?.variation === "string"
      ? rawData.variation
      : typeof rawData?.Variation === "string"
        ? rawData.Variation
        : null;

  if (fromRaw && fromRaw.trim()) {
    return {
      baseName: itemName.replace(/\s+\([^)]*\)\s*$/, "").trim(),
      variation: fromRaw.trim(),
    };
  }

  const suffixMatch = itemName.match(/^(.*)\s+\(([^)]+)\)\s*$/);
  if (!suffixMatch) return { baseName: itemName.trim(), variation: null };

  return {
    baseName: suffixMatch[1]?.trim() ?? itemName.trim(),
    variation: suffixMatch[2]?.trim() ?? null,
  };
}

function toRupeesInput(value: number | null | undefined) {
  if (value == null) return "";
  return (value / 100).toFixed(2);
}

function applyInventoryFilters(items: InventoryItem[], filters: InventoryFilters) {
  const query = filters.q?.trim().toLowerCase() ?? "";
  const category = filters.category?.trim().toLowerCase() ?? "";
  const includeInactive = Boolean(filters.includeInactive);

  return items.filter((item) => {
    if (!includeInactive && !item.is_active) return false;
    if (category && (item.category ?? "").trim().toLowerCase() !== category) return false;
    if (!query) return true;
    const haystack =
      `${item.item_name} ${item.variation ?? ""} ${item.category ?? ""}`.toLowerCase();
    return haystack.includes(query);
  });
}

export function inventoryMarginPct(
  item: Pick<InventoryItem, "selling_price_paise" | "cost_to_prepare_paise">
) {
  if (item.cost_to_prepare_paise == null || item.selling_price_paise <= 0) return null;
  return Number(
    (
      ((item.selling_price_paise - item.cost_to_prepare_paise) / item.selling_price_paise) *
      100
    ).toFixed(2)
  );
}

export function inventoryFormDefaults(item?: InventoryItem) {
  return {
    outlet_id: item?.outlet_id ?? "",
    item_name: item?.item_name ?? "",
    category: item?.category ?? "",
    variation: item?.variation ?? "",
    selling_price_rupees: toRupeesInput(item?.selling_price_paise),
    cost_to_prepare_rupees: toRupeesInput(item?.cost_to_prepare_paise),
    current_stock: item?.current_stock?.toString() ?? "",
    reorder_level: item?.reorder_level?.toString() ?? "",
    unit: item?.unit ?? "pieces",
    is_active: item?.is_active ?? true,
  };
}

export async function listInventoryItems(outletId: string, filters: InventoryFilters = {}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("active_inventory_items")
    .select("*")
    .eq("outlet_id", outletId)
    .order("is_active", { ascending: false })
    .order("category", { ascending: true, nullsFirst: false })
    .order("item_name", { ascending: true });

  if (error) throw new Error("Failed to load inventory items");
  return applyInventoryFilters((data ?? []) as InventoryItem[], filters);
}

export async function getInventoryItem(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("active_inventory_items")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw new Error("Failed to load inventory item");
  return data as InventoryItem;
}

export async function listInventoryCategories(outletId: string) {
  const items = await listInventoryItems(outletId, { includeInactive: true });
  return Array.from(
    new Set(
      items.map((item) => item.category?.trim()).filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right));
}

export async function createInventoryItem(input: CreateInventoryItemInput, userId: string) {
  const parsed = createInventoryItemSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid inventory item");

  const supabase = await createClient();
  const payload = {
    outlet_id: parsed.data.outlet_id,
    item_name: parsed.data.item_name.trim(),
    category: parsed.data.category?.trim() || null,
    variation: parsed.data.variation?.trim() || null,
    selling_price_paise: Math.round(parsed.data.selling_price_rupees * 100),
    cost_to_prepare_paise:
      parsed.data.cost_to_prepare_rupees == null
        ? null
        : Math.round(parsed.data.cost_to_prepare_rupees * 100),
    current_stock: parsed.data.current_stock ?? null,
    reorder_level: parsed.data.reorder_level ?? null,
    unit: parsed.data.unit ?? "pieces",
    is_active: parsed.data.is_active ?? true,
    created_by: userId,
    updated_by: userId,
  };

  const { data, error } = await supabase
    .from("inventory_items")
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("This outlet already has that item/variation.");
    throw new Error("Failed to create inventory item");
  }
  return data as InventoryItem;
}

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemInput,
  userId: string
) {
  const parsed = updateInventoryItemSchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid inventory item");

  const supabase = await createClient();
  const payload = {
    outlet_id: parsed.data.outlet_id,
    item_name: parsed.data.item_name.trim(),
    category: parsed.data.category?.trim() || null,
    variation: parsed.data.variation?.trim() || null,
    selling_price_paise: Math.round(parsed.data.selling_price_rupees * 100),
    cost_to_prepare_paise:
      parsed.data.cost_to_prepare_rupees == null
        ? null
        : Math.round(parsed.data.cost_to_prepare_rupees * 100),
    current_stock: parsed.data.current_stock ?? null,
    reorder_level: parsed.data.reorder_level ?? null,
    unit: parsed.data.unit ?? "pieces",
    is_active: parsed.data.is_active ?? true,
    updated_by: userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("inventory_items")
    .update(payload)
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("This outlet already has that item/variation.");
    throw new Error("Failed to update inventory item");
  }
  return data as InventoryItem;
}

export async function deleteInventoryItem(id: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .update({
      deleted_at: new Date().toISOString(),
      updated_by: userId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw new Error("Failed to archive inventory item");
}

export async function toggleInventoryItemActive(id: string, isActive: boolean, userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_items")
    .update({ is_active: isActive, updated_by: userId, updated_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) throw new Error("Failed to update item status");
  return data as InventoryItem;
}

export async function listInventoryImportCandidates(
  outletId: string
): Promise<InventoryImportCandidate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sales_line_items")
    .select(
      "item_name, category, unit_price_paise, raw_data, sales_orders!inner(outlet_id, ordered_at, status)"
    )
    .eq("sales_orders.outlet_id", outletId)
    .eq("sales_orders.status", "success");

  if (error) throw new Error("Failed to load sales history items");

  const byKey = new Map<string, InventoryImportCandidate>();

  for (const row of (data ?? []) as JoinedLineItem[]) {
    const orderedAt = row.sales_orders?.ordered_at;
    if (!orderedAt) continue;
    const { baseName, variation } = readVariation(row.raw_data, row.item_name);
    const key = `${normalizeText(baseName)}|${normalizeText(variation)}`;
    const candidate = byKey.get(key);

    if (!candidate) {
      byKey.set(key, {
        itemName: baseName,
        category: row.category?.trim() || null,
        variation,
        sellingPricePaise: row.unit_price_paise,
        sourceOrderCount: 1,
        lastOrderedAt: orderedAt,
      });
      continue;
    }

    candidate.sourceOrderCount += 1;
    if (new Date(orderedAt).getTime() >= new Date(candidate.lastOrderedAt).getTime()) {
      candidate.lastOrderedAt = orderedAt;
      candidate.sellingPricePaise = row.unit_price_paise;
      candidate.category = row.category?.trim() || candidate.category;
    }
  }

  return Array.from(byKey.values()).sort((left, right) =>
    `${left.itemName} ${left.variation ?? ""}`.localeCompare(
      `${right.itemName} ${right.variation ?? ""}`
    )
  );
}

export async function importFromSalesHistory(
  outletId: string,
  selections: Array<InventoryImportCandidate | InventoryImportSelectionInput>,
  userId: string
) {
  const supabase = await createClient();
  const existing = await listInventoryItems(outletId, { includeInactive: true });
  const existingKeys = new Set(
    existing.map((item) => buildInventoryKey(item.item_name, item.variation))
  );
  const seenInBatch = new Set<string>();

  const rows = selections
    .filter((selection) => {
      const key = buildInventoryKey(selection.itemName, selection.variation);
      if (existingKeys.has(key) || seenInBatch.has(key)) return false;
      seenInBatch.add(key);
      return true;
    })
    .map((selection) => ({
      outlet_id: outletId,
      item_name: selection.itemName.trim(),
      category: selection.category?.trim() || null,
      variation: selection.variation?.trim() || null,
      selling_price_paise: selection.sellingPricePaise,
      cost_to_prepare_paise: null,
      is_active: true,
      unit: "pieces",
      created_by: userId,
      updated_by: userId,
    }));

  if (rows.length === 0) {
    return { created: 0, skipped: selections.length };
  }

  const { error } = await supabase.from("inventory_items").insert(rows);
  if (error) throw new Error("Failed to import items from sales history");

  return {
    created: rows.length,
    skipped: selections.length - rows.length,
  };
}

export async function getCogsForPeriod(
  outletId: string,
  start: Date,
  end: Date
): Promise<InventoryCogsSummary> {
  const supabase = await createClient();
  const [items, { data, error }] = await Promise.all([
    listInventoryItems(outletId, { includeInactive: true }),
    supabase
      .from("sales_line_items")
      .select(
        "item_name, quantity, line_total_paise, raw_data, sales_orders!inner(outlet_id, ordered_at, status)"
      )
      .eq("sales_orders.outlet_id", outletId)
      .eq("sales_orders.status", "success")
      .gte("sales_orders.ordered_at", start.toISOString())
      .lte("sales_orders.ordered_at", end.toISOString()),
  ]);

  if (error) throw new Error("Failed to compute COGS");

  const costByKey = new Map<string, number | null>();
  for (const item of items) {
    costByKey.set(
      buildInventoryKey(item.item_name, item.variation),
      item.cost_to_prepare_paise ?? null
    );
  }

  let cogsPaise = 0;
  let coveredLines = 0;
  const coveredItemKeys = new Set<string>();
  const missingItemKeys = new Set<string>();

  for (const row of (data ?? []) as Array<
    Pick<JoinedLineItem, "item_name" | "quantity" | "raw_data">
  >) {
    const { baseName, variation } = readVariation(row.raw_data, row.item_name);
    const key = buildInventoryKey(baseName, variation);
    const cost = costByKey.get(key) ?? null;
    if (cost == null) {
      missingItemKeys.add(key);
      continue;
    }

    cogsPaise += cost * row.quantity;
    coveredLines += 1;
    coveredItemKeys.add(key);
  }

  const totalLines = (data ?? []).length;
  return {
    cogsPaise,
    itemsCovered: coveredItemKeys.size,
    itemsMissingCost: missingItemKeys.size,
    coveragePct: totalLines === 0 ? 0 : Number(((coveredLines / totalLines) * 100).toFixed(1)),
  };
}
