import type { Database, Tables } from "@stride-os/db";
import type {
  CreateTaskInput,
  TaskArea,
  TaskCriticality,
  TaskListRow,
  TaskRoleAssignee,
  TaskStatus,
} from "@stride-os/shared";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ViewerRole = "partner" | "manager";
type TaskRow = Tables<"tasks">;
type OutletOption = { id: string; name: string };
type AssigneeOption = { value: string; label: string };

export type TaskFilters = {
  outletId: string;
  status: string;
  area: string;
  criticality: string;
  assignee: string;
  q: string;
  view: "all" | "mine" | "open" | "done";
};

export type TaskPageData = {
  outlets: OutletOption[];
  selectedOutletId: string;
  assignees: AssigneeOption[];
  rows: TaskListRow[];
  counts: {
    open: number;
    inProgress: number;
    blocked: number;
    critical: number;
  };
};

const ROLE_ASSIGNEE_LABELS: Record<TaskRoleAssignee, string> = {
  store_manager: "Store manager",
};

function normalizeSearchQuery(value: string) {
  return value.trim();
}

function statusSortWeight(status: TaskStatus) {
  switch (status) {
    case "blocked":
      return 0;
    case "open":
      return 1;
    case "in_progress":
      return 2;
    case "done":
      return 3;
    case "cancelled":
      return 4;
    default:
      return 5;
  }
}

function compareTasks(a: TaskRow, b: TaskRow) {
  const dueA = a.due_date ?? "9999-12-31";
  const dueB = b.due_date ?? "9999-12-31";
  if (dueA !== dueB) return dueA.localeCompare(dueB);
  const statusDelta = statusSortWeight(a.status) - statusSortWeight(b.status);
  if (statusDelta !== 0) return statusDelta;
  return b.updated_at.localeCompare(a.updated_at);
}

async function listAccessibleOutlets(userId: string, role: ViewerRole): Promise<OutletOption[]> {
  const supabase = await createClient();
  if (role === "partner") {
    const { data } = await supabase
      .from("outlets")
      .select("id, name")
      .is("archived_at", null)
      .order("name");
    return (data ?? []) as OutletOption[];
  }

  const { data } = await supabase
    .from("outlet_members")
    .select("outlets!inner(id, name)")
    .eq("user_id", userId);

  return ((data ?? []) as Array<{ outlets: OutletOption | null }>)
    .map((row) => row.outlets)
    .filter((row): row is OutletOption => Boolean(row))
    .sort((left, right) => left.name.localeCompare(right.name));
}

async function listProfiles(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("user_id, full_name")
    .in("user_id", userIds);

  return new Map(
    ((data ?? []) as Array<{ user_id: string; full_name: string | null }>).map((row) => [
      row.user_id,
      row.full_name ?? row.user_id,
    ])
  );
}

async function listAssigneesForOutlets(outletIds: string[]): Promise<AssigneeOption[]> {
  if (outletIds.length === 0) return [{ value: "role:store_manager", label: "Store manager" }];
  const supabase = await createClient();
  const { data } = await supabase
    .from("outlet_members")
    .select("user_id")
    .in("outlet_id", outletIds);
  const userIds = Array.from(
    new Set(((data ?? []) as Array<{ user_id: string }>).map((row) => row.user_id))
  );
  const profileMap = await listProfiles(userIds);
  const people = userIds
    .map((userId) => ({ value: userId, label: profileMap.get(userId) ?? userId }))
    .sort((left, right) => left.label.localeCompare(right.label));

  return [{ value: "role:store_manager", label: "Store manager" }, ...people];
}

function matchesMine(
  task: TaskRow,
  userId: string,
  role: ViewerRole,
  managerOutletIds: Set<string>
) {
  if (task.assignee_user_id === userId) return true;
  return (
    role === "manager" &&
    task.assignee_role === "store_manager" &&
    managerOutletIds.has(task.outlet_id)
  );
}

function filterByView(
  task: TaskRow,
  filters: TaskFilters,
  userId: string,
  role: ViewerRole,
  managerOutletIds: Set<string>
) {
  if (filters.view === "mine") return matchesMine(task, userId, role, managerOutletIds);
  if (filters.view === "open") return task.status !== "done" && task.status !== "cancelled";
  if (filters.view === "done") return task.status === "done";
  return true;
}

export async function getTaskPageData(args: {
  userId: string;
  role: ViewerRole;
  filters: TaskFilters;
}): Promise<TaskPageData> {
  const outlets = await listAccessibleOutlets(args.userId, args.role);
  const accessibleOutletIds = outlets.map((outlet) => outlet.id);
  const selectedOutletId =
    args.filters.outletId === "all"
      ? "all"
      : accessibleOutletIds.includes(args.filters.outletId)
        ? args.filters.outletId
        : (accessibleOutletIds[0] ?? "all");

  const supabase = await createClient();
  let query = supabase.from("active_tasks").select("*");

  if (selectedOutletId !== "all") query = query.eq("outlet_id", selectedOutletId);
  if (args.filters.status) query = query.eq("status", args.filters.status as TaskStatus);
  if (args.filters.area) query = query.eq("area", args.filters.area as TaskArea);
  if (args.filters.criticality) {
    query = query.eq("criticality", args.filters.criticality as TaskCriticality);
  }
  if (args.filters.assignee) {
    if (args.filters.assignee.startsWith("role:")) {
      query = query
        .eq("assignee_type", "role")
        .eq("assignee_role", args.filters.assignee.replace("role:", "") as TaskRoleAssignee);
    } else {
      query = query.eq("assignee_user_id", args.filters.assignee);
    }
  }
  const q = normalizeSearchQuery(args.filters.q);
  if (q) query = query.or(`title.ilike.%${q}%,details.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load tasks: ${error.message}`);

  const managerOutletIds = new Set(accessibleOutletIds);
  const filtered = ((data ?? []) as TaskRow[])
    .filter((task) => filterByView(task, args.filters, args.userId, args.role, managerOutletIds))
    .sort(compareTasks);

  const profileIds = Array.from(
    new Set(
      filtered
        .flatMap((task) => [task.assignee_user_id, task.created_by])
        .filter((value): value is string => Boolean(value))
    )
  );
  const profileMap = await listProfiles(profileIds);
  const outletMap = new Map(outlets.map((outlet) => [outlet.id, outlet.name]));

  return {
    outlets,
    selectedOutletId,
    assignees: await listAssigneesForOutlets(
      selectedOutletId === "all" ? accessibleOutletIds : selectedOutletId ? [selectedOutletId] : []
    ),
    rows: filtered.map((task) => ({
      ...task,
      outlet_name: outletMap.get(task.outlet_id) ?? "Outlet",
      assignee_name:
        task.assignee_type === "role"
          ? (ROLE_ASSIGNEE_LABELS[task.assignee_role as TaskRoleAssignee] ?? "Role")
          : task.assignee_user_id
            ? (profileMap.get(task.assignee_user_id) ?? task.assignee_user_id)
            : null,
      creator_name: profileMap.get(task.created_by) ?? null,
    })),
    counts: {
      open: filtered.filter((task) => task.status === "open").length,
      inProgress: filtered.filter((task) => task.status === "in_progress").length,
      blocked: filtered.filter((task) => task.status === "blocked").length,
      critical: filtered.filter(
        (task) =>
          task.status !== "done" && task.status !== "cancelled" && task.criticality === "critical"
      ).length,
    },
  };
}

async function assertOutletAccess(userId: string, role: ViewerRole, outletId: string) {
  const outlets = await listAccessibleOutlets(userId, role);
  if (!outlets.some((outlet) => outlet.id === outletId)) {
    throw new Error("You do not have access to that outlet");
  }
}

async function validateAssignee(outletId: string, input: CreateTaskInput) {
  if (input.assignee_type !== "user" || !input.assignee_user_id) return;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("outlet_members")
    .select("user_id")
    .eq("outlet_id", outletId)
    .eq("user_id", input.assignee_user_id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Selected assignee is not a member of that outlet");
}

async function logTaskActivity(args: {
  outletId: string;
  userId: string;
  action: string;
  targetId: string;
  details?: Record<string, string | null>;
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("activity_log").insert({
    outlet_id: args.outletId,
    user_id: args.userId,
    action: args.action,
    target_type: "task",
    target_id: args.targetId,
    details: args.details ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function createTask(
  input: CreateTaskInput,
  actor: { userId: string; role: ViewerRole }
) {
  await assertOutletAccess(actor.userId, actor.role, input.outlet_id);
  await validateAssignee(input.outlet_id, input);

  const supabase = await createClient();
  const payload = {
    outlet_id: input.outlet_id,
    title: input.title,
    details: input.details ?? null,
    area: input.area,
    criticality: input.criticality,
    status: input.status,
    assignee_type: input.assignee_type,
    assignee_user_id: input.assignee_type === "user" ? input.assignee_user_id : null,
    assignee_role: input.assignee_type === "role" ? (input.assignee_role ?? null) : null,
    due_date: input.due_date ?? null,
    created_by: actor.userId,
  } satisfies Database["public"]["Tables"]["tasks"]["Insert"];

  const { data, error } = await supabase.from("tasks").insert(payload).select("id").single();
  if (error || !data) throw new Error(error?.message || "Failed to create task");

  await logTaskActivity({
    outletId: input.outlet_id,
    userId: actor.userId,
    action: "task_created",
    targetId: data.id,
    details: {
      title: input.title,
      status: input.status,
      assignee_type: input.assignee_type,
    },
  });
}

export async function updateTaskStatus(
  id: string,
  outletId: string,
  status: TaskStatus,
  actor: { userId: string; role: ViewerRole }
) {
  await assertOutletAccess(actor.userId, actor.role, outletId);
  const supabase = await createClient();
  const patch = {
    status,
    completed_at: status === "done" ? new Date().toISOString() : null,
    completed_by: status === "done" ? actor.userId : null,
  };
  const { error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .eq("outlet_id", outletId);
  if (error) throw new Error(error.message);

  await logTaskActivity({
    outletId,
    userId: actor.userId,
    action: "task_status_changed",
    targetId: id,
    details: { status },
  });
}

export async function softDeleteTask(
  id: string,
  outletId: string,
  actor: { userId: string; role: ViewerRole }
) {
  await assertOutletAccess(actor.userId, actor.role, outletId);
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("outlet_id", outletId);
  if (error) throw new Error(error.message);

  await logTaskActivity({
    outletId,
    userId: actor.userId,
    action: "task_deleted",
    targetId: id,
  });
}
