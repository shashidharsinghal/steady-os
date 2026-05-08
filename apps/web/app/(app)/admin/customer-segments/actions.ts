"use server";

import { revalidatePath } from "next/cache";
import {
  customerSegmentDefinitionSchema,
  type CustomerSegmentDefinitionInput,
} from "@stride-os/shared";
import { createClient } from "@/lib/supabase/server";
import { requirePartner } from "@/lib/auth";
import {
  listSegmentDefinitions,
  previewSegmentMatchCount as previewCount,
} from "@/lib/customer-segment-definitions";

export async function getSegmentDefinitions(outletId: string) {
  await requirePartner();
  return listSegmentDefinitions(outletId);
}

export async function updateSegmentDefinition(id: string, input: CustomerSegmentDefinitionInput) {
  await requirePartner();

  const parsed = customerSegmentDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid segment definition");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_segment_definitions")
    .update({
      name: parsed.data.name,
      color_token: parsed.data.color_token,
      rule_type: parsed.data.rule_type,
      rule_params: parsed.data.rule_params,
      display_order: parsed.data.display_order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error("Failed to update segment definition");
  }

  revalidatePath("/admin/customer-segments");
  revalidatePath("/dashboard");
}

export async function previewSegmentMatchCount(
  outletId: string,
  input: CustomerSegmentDefinitionInput
) {
  await requirePartner();
  const parsed = customerSegmentDefinitionSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid segment definition");
  }
  return previewCount(outletId, parsed.data);
}
