"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePartner } from "@/lib/auth";
import {
  createOutletSchema,
  updateOutletSchema,
  type CreateOutletInput,
  type UpdateOutletInput,
} from "@stride-os/shared";

export async function createOutlet(input: CreateOutletInput): Promise<{ id: string }> {
  await requirePartner();

  const parsed = createOutletSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid outlet data");
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outlets")
    .insert({
      name: parsed.data.name,
      brand: parsed.data.brand,
      status: parsed.data.status,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      petpooja_restaurant_id: parsed.data.petpooja_restaurant_id ?? null,
      gst_number: parsed.data.gst_number ?? null,
      fssai_license: parsed.data.fssai_license ?? null,
      opened_at: parsed.data.opened_at ?? null,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Another outlet already uses this Petpooja restaurant ID.");
    }
    throw new Error("Failed to create outlet. Please try again.");
  }

  revalidatePath("/outlets");
  return { id: data.id };
}

export async function updateOutlet(id: string, input: UpdateOutletInput): Promise<void> {
  await requirePartner();

  const parsed = updateOutletSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid outlet data");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("outlets")
    .update({
      name: parsed.data.name,
      brand: parsed.data.brand,
      status: parsed.data.status,
      address: parsed.data.address ?? null,
      phone: parsed.data.phone ?? null,
      petpooja_restaurant_id: parsed.data.petpooja_restaurant_id ?? null,
      gst_number: parsed.data.gst_number ?? null,
      fssai_license: parsed.data.fssai_license ?? null,
      opened_at: parsed.data.opened_at ?? null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      throw new Error("Another outlet already uses this Petpooja restaurant ID.");
    }
    throw new Error("Failed to update outlet. Please try again.");
  }

  revalidatePath("/outlets");
  revalidatePath(`/outlets/${id}`);
}

export async function archiveOutlet(id: string): Promise<void> {
  await requirePartner();

  const supabase = await createClient();
  const { error } = await supabase
    .from("outlets")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    throw new Error("Failed to archive outlet. Please try again.");
  }

  revalidatePath("/outlets");
  revalidatePath(`/outlets/${id}`);
}
