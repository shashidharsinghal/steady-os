"use server";

import { revalidatePath } from "next/cache";
import {
  createExpenseCategorySchema,
  updateExpenseCategorySchema,
  type CreateExpenseCategoryInput,
  type UpdateExpenseCategoryInput,
} from "@stride-os/shared";
import { createClient } from "@/lib/supabase/server";
import { requirePartner } from "@/lib/auth";
import { listExpenseCategories } from "@/lib/expense-categories";

export async function getExpenseCategories(outletId: string) {
  await requirePartner();
  return listExpenseCategories(outletId);
}

export async function createExpenseCategory(outletId: string, input: CreateExpenseCategoryInput) {
  await requirePartner();
  const parsed = createExpenseCategorySchema.safeParse({ ...input, outlet_id: outletId });
  if (!parsed.success) throw new Error("Invalid expense category");

  const existing = await listExpenseCategories(outletId);
  const displayOrder = existing.length + 1;

  const supabase = await createClient();
  const { error } = await supabase.from("expense_categories").insert({
    outlet_id: outletId,
    name: parsed.data.name,
    color_token: parsed.data.color_token,
    is_active: true,
    display_order: displayOrder,
  });

  if (error) {
    if (error.code === "23505") throw new Error("A category with this name already exists.");
    throw new Error("Failed to create expense category");
  }

  revalidatePath("/admin/expense-categories");
}

export async function updateExpenseCategory(id: string, input: UpdateExpenseCategoryInput) {
  await requirePartner();
  const parsed = updateExpenseCategorySchema.safeParse(input);
  if (!parsed.success) throw new Error("Invalid expense category");

  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_categories")
    .update({
      name: parsed.data.name,
      color_token: parsed.data.color_token,
      is_active: parsed.data.is_active,
      display_order: parsed.data.display_order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) throw new Error("Failed to update expense category");

  revalidatePath("/admin/expense-categories");
}

export async function deactivateExpenseCategory(id: string, outletId: string) {
  await requirePartner();
  const supabase = await createClient();
  const { error } = await supabase
    .from("expense_categories")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("outlet_id", outletId);

  if (error) throw new Error("Failed to deactivate expense category");
  revalidatePath("/admin/expense-categories");
}

export async function reorderExpenseCategories(outletId: string, orderedIds: string[]) {
  await requirePartner();
  const supabase = await createClient();

  for (const [index, id] of orderedIds.entries()) {
    const { error } = await supabase
      .from("expense_categories")
      .update({ display_order: index + 1, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("outlet_id", outletId);

    if (error) throw new Error("Failed to reorder expense categories");
  }

  revalidatePath("/admin/expense-categories");
}
