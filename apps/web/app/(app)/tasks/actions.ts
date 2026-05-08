"use server";

import { revalidatePath } from "next/cache";
import { createTaskSchema, deleteTaskSchema, updateTaskStatusSchema } from "@stride-os/shared";
import { getRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createTask, softDeleteTask, updateTaskStatus } from "@/lib/tasks";

async function getActor() {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    role,
  ] = await Promise.all([supabase.auth.getUser(), getRole()]);

  if (!user) throw new Error("Not authenticated");
  return { userId: user.id, role };
}

export async function createTaskAction(formData: FormData) {
  const actor = await getActor();
  const parsed = createTaskSchema.safeParse({
    outlet_id: formData.get("outlet_id"),
    title: formData.get("title"),
    details: formData.get("details"),
    area: formData.get("area"),
    criticality: formData.get("criticality"),
    status: formData.get("status"),
    assignee_type: formData.get("assignee_type"),
    assignee_user_id: formData.get("assignee_user_id"),
    assignee_role: formData.get("assignee_role") || null,
    due_date: formData.get("due_date"),
  });
  if (!parsed.success) throw new Error("Invalid task");

  await createTask(parsed.data, actor);
  revalidatePath("/tasks");
}

export async function updateTaskStatusAction(formData: FormData) {
  const actor = await getActor();
  const parsed = updateTaskStatusSchema.safeParse({
    id: formData.get("id"),
    outlet_id: formData.get("outlet_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) throw new Error("Invalid task status");

  await updateTaskStatus(parsed.data.id, parsed.data.outlet_id, parsed.data.status, actor);
  revalidatePath("/tasks");
}

export async function deleteTaskAction(formData: FormData) {
  const actor = await getActor();
  if (actor.role !== "partner") throw new Error("Only partners can delete tasks");
  const parsed = deleteTaskSchema.safeParse({
    id: formData.get("id"),
    outlet_id: formData.get("outlet_id"),
  });
  if (!parsed.success) throw new Error("Invalid task");

  await softDeleteTask(parsed.data.id, parsed.data.outlet_id, actor);
  revalidatePath("/tasks");
}
