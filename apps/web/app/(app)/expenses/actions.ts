"use server";

import { revalidatePath } from "next/cache";
import { addManualExpenseSchema, upsertExpenseBudgetSchema } from "@stride-os/shared";
import { requirePartner } from "@/lib/auth";
import {
  addManualExpense,
  approveBill,
  deleteExpense,
  markExpensePaid,
  rejectBill,
  updateExpenseComment,
  upsertBudget,
} from "@/lib/expenses";

export async function upsertBudgetAction(formData: FormData) {
  await requirePartner();
  const parsed = upsertExpenseBudgetSchema.safeParse({
    outlet_id: formData.get("outlet_id"),
    category_id: formData.get("category_id"),
    monthly_budget_rupees: formData.get("monthly_budget_rupees"),
  });

  if (!parsed.success) throw new Error("Invalid budget");

  await upsertBudget(
    parsed.data.outlet_id,
    parsed.data.category_id,
    Math.round(parsed.data.monthly_budget_rupees * 100)
  );
  revalidatePath("/expenses");
}

export async function addManualExpenseAction(formData: FormData) {
  const userId = await requirePartner();
  const parsed = addManualExpenseSchema.safeParse({
    outlet_id: formData.get("outlet_id"),
    category_id: formData.get("category_id"),
    vendor_name: formData.get("vendor_name"),
    description: formData.get("description"),
    comment: formData.get("comment"),
    amount_rupees: formData.get("amount_rupees"),
    tax_rupees: formData.get("tax_rupees") || 0,
    invoice_date: formData.get("invoice_date"),
    due_date: formData.get("due_date"),
    paid_date: formData.get("paid_date"),
    is_recurring: formData.get("is_recurring") === "on",
    recurrence_period: formData.get("recurrence_period") || null,
    next_due_date: formData.get("next_due_date"),
  });

  if (!parsed.success) throw new Error("Invalid expense");

  await addManualExpense(parsed.data, userId);
  revalidatePath("/expenses");
}

export async function markExpensePaidAction(formData: FormData) {
  await requirePartner();
  const id = String(formData.get("id") ?? "");
  const outletId = String(formData.get("outlet_id") ?? "");
  const paidDate = String(formData.get("paid_date") ?? "");
  if (!id || !outletId || !paidDate) throw new Error("Missing paid expense fields");

  await markExpensePaid(id, {
    outletId,
    paidDate,
    paidVia: String(formData.get("paid_via") ?? "") || null,
    reference: String(formData.get("paid_reference") ?? "") || null,
  });
  revalidatePath("/expenses");
}

export async function deleteExpenseAction(formData: FormData) {
  await requirePartner();
  const id = String(formData.get("id") ?? "");
  const outletId = String(formData.get("outlet_id") ?? "");
  if (!id || !outletId) throw new Error("Missing expense");

  await deleteExpense(id, outletId);
  revalidatePath("/expenses");
}

export async function approveBillAction(formData: FormData) {
  const userId = await requirePartner();
  const id = String(formData.get("id") ?? "");
  const outletId = String(formData.get("outlet_id") ?? "");
  if (!id || !outletId) throw new Error("Missing bill");
  await approveBill(id, outletId, userId);
  revalidatePath("/expenses");
}

export async function rejectBillAction(formData: FormData) {
  await requirePartner();
  const id = String(formData.get("id") ?? "");
  const outletId = String(formData.get("outlet_id") ?? "");
  if (!id || !outletId) throw new Error("Missing bill");
  await rejectBill(id, outletId);
  revalidatePath("/expenses");
}

export async function updateExpenseCommentAction(formData: FormData) {
  await requirePartner();
  const id = String(formData.get("id") ?? "");
  const outletId = String(formData.get("outlet_id") ?? "");
  const comment = String(formData.get("comment") ?? "").trim() || null;
  if (!id || !outletId) throw new Error("Missing expense");

  await updateExpenseComment(id, { outletId, comment });
  revalidatePath("/expenses");
}
