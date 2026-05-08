import type { ExpenseCategory } from "@stride-os/shared";
import { createClient } from "@/lib/supabase/server";

export async function listExpenseCategories(outletId: string): Promise<ExpenseCategory[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("outlet_id", outletId)
    .order("display_order", { ascending: true });

  return (data ?? []) as ExpenseCategory[];
}
