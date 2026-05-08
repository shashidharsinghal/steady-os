"use server";

import { revalidatePath } from "next/cache";
import { investmentConfigSchema, type InvestmentConfigInput } from "@stride-os/shared";
import { createClient } from "@/lib/supabase/server";
import { requirePartner } from "@/lib/auth";

export async function configureInvestment(
  outletId: string,
  input: InvestmentConfigInput
): Promise<void> {
  await requirePartner();

  const parsed = investmentConfigSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid investment details");
  }

  const supabase = await createClient();
  const totalInvestedPaise = Math.round(parsed.data.total_invested_rupees * 100);

  const { error } = await supabase
    .from("outlets")
    .update({
      opened_on: parsed.data.opened_on,
      total_invested_paise: totalInvestedPaise,
      projected_breakeven_date: parsed.data.projected_breakeven_date || null,
    })
    .eq("id", outletId);

  if (error) {
    throw new Error("Failed to save investment details");
  }

  revalidatePath("/admin/outlets");
  revalidatePath("/dashboard");
}

export async function clearInvestment(outletId: string): Promise<void> {
  await requirePartner();

  const supabase = await createClient();
  const { error } = await supabase
    .from("outlets")
    .update({
      opened_on: null,
      total_invested_paise: null,
      projected_breakeven_date: null,
    })
    .eq("id", outletId);

  if (error) {
    throw new Error("Failed to clear investment details");
  }

  revalidatePath("/admin/outlets");
  revalidatePath("/dashboard");
}
