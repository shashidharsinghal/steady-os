"use server";

import { revalidatePath } from "next/cache";
import type {
  CreateInventoryItemInput,
  InventoryImportSelectionInput,
  UpdateInventoryItemInput,
} from "@stride-os/shared";
import { inventoryImportSelectionSchema } from "@stride-os/shared";
import { requirePartner } from "@/lib/auth";
import {
  createInventoryItem,
  deleteInventoryItem,
  importFromSalesHistory,
  listInventoryImportCandidates,
  listInventoryItems,
  toggleInventoryItemActive,
  updateInventoryItem,
} from "@/lib/inventory";

export async function getInventoryItems(outletId: string) {
  await requirePartner();
  return listInventoryItems(outletId, { includeInactive: true });
}

export async function getInventoryImportCandidates(outletId: string) {
  await requirePartner();
  return listInventoryImportCandidates(outletId);
}

export async function createInventoryItemAction(input: CreateInventoryItemInput) {
  const userId = await requirePartner();
  const item = await createInventoryItem(input, userId);
  revalidatePath("/inventory");
  revalidatePath("/inventory/import");
  return item;
}

export async function updateInventoryItemAction(id: string, input: UpdateInventoryItemInput) {
  const userId = await requirePartner();
  const item = await updateInventoryItem(id, input, userId);
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  return item;
}

export async function deleteInventoryItemAction(id: string) {
  const userId = await requirePartner();
  await deleteInventoryItem(id, userId);
  revalidatePath("/inventory");
}

export async function toggleInventoryItemActiveAction(id: string, nextState: boolean) {
  const userId = await requirePartner();
  const item = await toggleInventoryItemActive(id, nextState, userId);
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  return item;
}

export async function importInventoryFromSalesAction(
  outletId: string,
  selections: InventoryImportSelectionInput[]
) {
  const userId = await requirePartner();
  const parsed = selections.map((selection) => inventoryImportSelectionSchema.parse(selection));
  const result = await importFromSalesHistory(outletId, parsed, userId);
  revalidatePath("/inventory");
  revalidatePath("/inventory/import");
  return result;
}
