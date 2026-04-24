"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePartner } from "@/lib/auth";

function revalidatePnlSurfaces() {
  revalidatePath("/pnl");
  revalidatePath("/dashboard");
  revalidatePath("/ingest");
}

export async function softDeletePnlReports(reportIds: string[]): Promise<void> {
  const userId = await requirePartner();
  const supabase = await createClient();
  const uniqueIds = Array.from(new Set(reportIds)).filter(Boolean);

  if (uniqueIds.length === 0) return;

  const { error } = await supabase
    .from("pnl_reports")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    })
    .in("id", uniqueIds)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  revalidatePnlSurfaces();
}

export async function undoDeletePnlReport(reportId: string): Promise<void> {
  await requirePartner();
  const supabase = await createClient();

  const { error } = await supabase
    .from("pnl_reports")
    .update({
      deleted_at: null,
      deleted_by: null,
    })
    .eq("id", reportId);

  if (error) throw new Error(error.message);
  revalidatePnlSurfaces();
}
