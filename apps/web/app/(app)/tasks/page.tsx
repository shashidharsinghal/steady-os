import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertTriangle, CheckCircle2, Clock3, ListTodo } from "lucide-react";
import type { TaskArea, TaskCriticality, TaskStatus } from "@stride-os/shared";
import { formatDate } from "@stride-os/shared";
import { Button, Card, CardContent } from "@stride-os/ui";
import { cn } from "@stride-os/ui/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { getRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createTaskAction, deleteTaskAction, updateTaskStatusAction } from "./actions";
import { getTaskPageData } from "@/lib/tasks";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const AREA_OPTIONS: Array<{ value: TaskArea; label: string }> = [
  { value: "operations", label: "Operations" },
  { value: "food", label: "Food" },
  { value: "accounts", label: "Accounts" },
  { value: "maintenance", label: "Maintenance" },
  { value: "people", label: "People" },
  { value: "vendors", label: "Vendors" },
  { value: "marketing", label: "Marketing" },
  { value: "compliance", label: "Compliance" },
  { value: "other", label: "Other" },
];

const CRITICALITY_OPTIONS: Array<{ value: TaskCriticality; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "blocked", label: "Blocked" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function titleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function viewHref(current: URLSearchParams, view: string) {
  const next = new URLSearchParams(current);
  next.set("view", view);
  return `/tasks?${next.toString()}`;
}

function dueLabel(value: string | null) {
  if (!value) return "—";
  return formatDate(value, "dd MMM yyyy");
}

export default async function TasksPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const role = await getRole();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const filters = {
    outletId: param(params.outletId) || "all",
    status: param(params.status),
    area: param(params.area),
    criticality: param(params.criticality),
    assignee: param(params.assignee),
    q: param(params.q),
    view: (param(params.view) || "all") as "all" | "mine" | "open" | "done",
  };

  const data = await getTaskPageData({
    userId: user.id,
    role,
    filters,
  });

  if (data.outlets.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Tasks"
          title="Pending work."
          subtitle="Create an outlet first so tasks have somewhere to live."
        />
      </div>
    );
  }

  const selectedOutletName =
    data.selectedOutletId === "all"
      ? "All outlets"
      : (data.outlets.find((outlet) => outlet.id === data.selectedOutletId)?.name ?? "Tasks");

  const filterParams = new URLSearchParams();
  if (data.selectedOutletId) filterParams.set("outletId", data.selectedOutletId);
  if (filters.status) filterParams.set("status", filters.status);
  if (filters.area) filterParams.set("area", filters.area);
  if (filters.criticality) filterParams.set("criticality", filters.criticality);
  if (filters.assignee) filterParams.set("assignee", filters.assignee);
  if (filters.q) filterParams.set("q", filters.q);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow={`Tasks · ${selectedOutletName}`}
        title="Pending work."
        subtitle="Track operational follow-ups, ownership, and closures without leaving Stride."
      />

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard
          label="Open"
          value={String(data.counts.open)}
          note="Ready to pick up"
          icon={Clock3}
        />
        <SummaryCard
          label="In progress"
          value={String(data.counts.inProgress)}
          note="Being worked on"
          icon={ListTodo}
          tone="blue"
        />
        <SummaryCard
          label="Blocked"
          value={String(data.counts.blocked)}
          note="Needs unblocking"
          icon={AlertTriangle}
          tone="amber"
        />
        <SummaryCard
          label="Critical"
          value={String(data.counts.critical)}
          note="Highest attention"
          icon={CheckCircle2}
          tone="red"
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="page-eyebrow">New task</p>
              <h2 className="section-card-title">Capture pending work fast</h2>
            </div>
            <form action={createTaskAction} className="space-y-3">
              <label className="text-muted-foreground block space-y-1 text-xs font-medium">
                Task
                <input
                  name="title"
                  required
                  placeholder="Follow up on Airtel invoice mismatch"
                  className="border-border bg-background text-foreground h-10 w-full rounded-[10px] border px-3 text-sm"
                />
              </label>
              <label className="text-muted-foreground block space-y-1 text-xs font-medium">
                Details
                <textarea
                  name="details"
                  rows={3}
                  placeholder="What needs to happen, and what is blocking it right now?"
                  className="border-border bg-background text-foreground w-full rounded-[10px] border px-3 py-2 text-sm"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-muted-foreground space-y-1 text-xs font-medium">
                  Outlet
                  <select
                    name="outlet_id"
                    defaultValue={
                      data.selectedOutletId === "all"
                        ? (data.outlets[0]?.id ?? "")
                        : data.selectedOutletId
                    }
                    className="border-border bg-background text-foreground h-10 w-full rounded-[10px] border px-3 text-sm"
                  >
                    {data.outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-muted-foreground space-y-1 text-xs font-medium">
                  Status
                  <select
                    name="status"
                    defaultValue="open"
                    className="border-border bg-background text-foreground h-10 w-full rounded-[10px] border px-3 text-sm"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-muted-foreground space-y-1 text-xs font-medium">
                  Area
                  <select
                    name="area"
                    defaultValue="operations"
                    className="border-border bg-background text-foreground h-10 w-full rounded-[10px] border px-3 text-sm"
                  >
                    {AREA_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-muted-foreground space-y-1 text-xs font-medium">
                  Criticality
                  <select
                    name="criticality"
                    defaultValue="medium"
                    className="border-border bg-background text-foreground h-10 w-full rounded-[10px] border px-3 text-sm"
                  >
                    {CRITICALITY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-muted-foreground space-y-1 text-xs font-medium">
                  Assign by
                  <select
                    name="assignee_type"
                    defaultValue="user"
                    className="border-border bg-background text-foreground h-10 w-full rounded-[10px] border px-3 text-sm"
                  >
                    <option value="user">Person</option>
                    <option value="role">Role</option>
                  </select>
                </label>
                <label className="text-muted-foreground space-y-1 text-xs font-medium">
                  Due date
                  <input
                    type="date"
                    name="due_date"
                    className="border-border bg-background text-foreground h-10 w-full rounded-[10px] border px-3 text-sm"
                  />
                </label>
              </div>
              <label className="text-muted-foreground block space-y-1 text-xs font-medium">
                Person assignee
                <select
                  name="assignee_user_id"
                  defaultValue={
                    data.assignees.find((option) => !option.value.startsWith("role:"))?.value ?? ""
                  }
                  className="border-border bg-background text-foreground h-10 w-full rounded-[10px] border px-3 text-sm"
                >
                  {data.assignees
                    .filter((option) => !option.value.startsWith("role:"))
                    .map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-muted-foreground block space-y-1 text-xs font-medium">
                Role assignee
                <select
                  name="assignee_role"
                  defaultValue="store_manager"
                  className="border-border bg-background text-foreground h-10 w-full rounded-[10px] border px-3 text-sm"
                >
                  <option value="store_manager">Store manager</option>
                </select>
              </label>
              <Button type="submit" variant="primary" className="w-full">
                Create task
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="border-border bg-paper-subtle flex flex-wrap items-center gap-2 rounded-[14px] border p-1">
            {(["all", "mine", "open", "done"] as const).map((view) => (
              <Link
                key={view}
                href={viewHref(filterParams, view)}
                className={cn(
                  "rounded-[10px] px-4 py-2 text-sm font-semibold",
                  filters.view === view ? "bg-foreground text-background" : "text-muted-foreground"
                )}
              >
                {titleCase(view)}
              </Link>
            ))}
          </div>

          <Card>
            <CardContent className="space-y-4 p-5">
              <form
                action="/tasks"
                className="grid gap-3 lg:grid-cols-[1.1fr_repeat(4,minmax(0,160px))_140px]"
              >
                <select
                  name="outletId"
                  defaultValue={data.selectedOutletId}
                  className="border-border bg-background text-foreground h-10 rounded-[10px] border px-3 text-sm"
                >
                  <option value="all">All outlets</option>
                  {data.outlets.map((outlet) => (
                    <option key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </option>
                  ))}
                </select>
                <select
                  name="status"
                  defaultValue={filters.status}
                  className="border-border bg-background text-foreground h-10 rounded-[10px] border px-3 text-sm"
                >
                  <option value="">All status</option>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  name="area"
                  defaultValue={filters.area}
                  className="border-border bg-background text-foreground h-10 rounded-[10px] border px-3 text-sm"
                >
                  <option value="">All areas</option>
                  {AREA_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  name="criticality"
                  defaultValue={filters.criticality}
                  className="border-border bg-background text-foreground h-10 rounded-[10px] border px-3 text-sm"
                >
                  <option value="">All criticality</option>
                  {CRITICALITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <select
                  name="assignee"
                  defaultValue={filters.assignee}
                  className="border-border bg-background text-foreground h-10 rounded-[10px] border px-3 text-sm"
                >
                  <option value="">All assignees</option>
                  {data.assignees.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input type="hidden" name="view" value={filters.view} />
                  <input
                    name="q"
                    defaultValue={filters.q}
                    placeholder="Search tasks"
                    className="border-border bg-background text-foreground h-10 min-w-0 flex-1 rounded-[10px] border px-3 text-sm"
                  />
                  <Button type="submit" variant="outline" size="sm">
                    Filter
                  </Button>
                </div>
              </form>

              <div className="border-border overflow-hidden rounded-[18px] border">
                <table className="w-full text-sm">
                  <thead className="bg-paper-subtle text-muted-foreground text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                    <tr>
                      <th className="px-4 py-3">Task</th>
                      <th className="px-4 py-3">Outlet</th>
                      <th className="px-4 py-3">Area</th>
                      <th className="px-4 py-3">Criticality</th>
                      <th className="px-4 py-3">Assign to</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Due</th>
                      <th className="px-4 py-3">Updated</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.length === 0 ? (
                      <tr className="border-border border-t">
                        <td className="text-muted-foreground px-4 py-8 text-center" colSpan={9}>
                          No tasks match this view yet.
                        </td>
                      </tr>
                    ) : (
                      data.rows.map((task) => (
                        <tr key={task.id} className="border-border border-t align-top">
                          <td className="px-4 py-4">
                            <div className="space-y-1">
                              <p className="font-semibold">{task.title}</p>
                              {task.details ? (
                                <p className="text-muted-foreground max-w-md">{task.details}</p>
                              ) : null}
                            </div>
                          </td>
                          <td className="text-muted-foreground px-4 py-4">{task.outlet_name}</td>
                          <td className="px-4 py-4">
                            <AreaPill area={task.area} />
                          </td>
                          <td className="px-4 py-4">
                            <CriticalityPill criticality={task.criticality} />
                          </td>
                          <td className="text-muted-foreground px-4 py-4">
                            {task.assignee_name ?? "—"}
                          </td>
                          <td className="px-4 py-4">
                            <StatusPill status={task.status} />
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={cn(
                                task.due_date &&
                                  task.due_date < new Date().toISOString().slice(0, 10) &&
                                  task.status !== "done" &&
                                  "text-[hsl(var(--red))]"
                              )}
                            >
                              {dueLabel(task.due_date)}
                            </span>
                          </td>
                          <td className="text-muted-foreground px-4 py-4 font-mono text-xs">
                            {formatDate(task.updated_at, "dd MMM yyyy")}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex justify-end gap-2">
                              <form
                                action={updateTaskStatusAction}
                                className="flex items-center gap-2"
                              >
                                <input type="hidden" name="id" value={task.id} />
                                <input type="hidden" name="outlet_id" value={task.outlet_id} />
                                <select
                                  name="status"
                                  defaultValue={task.status}
                                  className="border-border bg-background text-foreground h-9 rounded-[10px] border px-2 text-xs"
                                >
                                  {STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                                <Button type="submit" variant="outline" size="sm">
                                  Save
                                </Button>
                              </form>
                              {role === "partner" ? (
                                <form action={deleteTaskAction}>
                                  <input type="hidden" name="id" value={task.id} />
                                  <input type="hidden" name="outlet_id" value={task.outlet_id} />
                                  <Button
                                    type="submit"
                                    variant="ghost"
                                    size="sm"
                                    className="text-[hsl(var(--red))]"
                                  >
                                    Delete
                                  </Button>
                                </form>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  note,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  note: string;
  icon: typeof Clock3;
  tone?: "default" | "blue" | "amber" | "red";
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="page-eyebrow !mb-0">{label}</p>
            <p
              className={cn(
                "mt-2 font-mono text-3xl font-semibold tracking-[-0.04em]",
                tone === "blue" && "text-[hsl(var(--blue))]",
                tone === "amber" && "text-[hsl(var(--amber))]",
                tone === "red" && "text-[hsl(var(--red))]"
              )}
            >
              {value}
            </p>
          </div>
          <Icon className="text-muted-foreground h-5 w-5" />
        </div>
        <p className="text-muted-foreground text-sm">{note}</p>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: TaskStatus }) {
  const tone =
    status === "done"
      ? "green"
      : status === "blocked"
        ? "red"
        : status === "in_progress"
          ? "blue"
          : status === "cancelled"
            ? "ink"
            : "amber";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
        tone === "green" && "bg-[hsl(var(--green-soft))] text-[hsl(var(--green))]",
        tone === "red" && "bg-[hsl(var(--red-soft))] text-[hsl(var(--red))]",
        tone === "blue" && "bg-[hsl(var(--blue-soft))] text-[hsl(var(--blue))]",
        tone === "amber" && "bg-[hsl(var(--amber-soft))] text-[hsl(var(--amber))]",
        tone === "ink" && "bg-paper-subtle text-foreground"
      )}
    >
      {titleCase(status)}
    </span>
  );
}

function CriticalityPill({ criticality }: { criticality: TaskCriticality }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
        criticality === "low" && "bg-paper-subtle text-muted-foreground",
        criticality === "medium" && "bg-[hsl(var(--blue-soft))] text-[hsl(var(--blue))]",
        criticality === "high" && "bg-[hsl(var(--amber-soft))] text-[hsl(var(--amber))]",
        criticality === "critical" && "bg-[hsl(var(--red-soft))] text-[hsl(var(--red))]"
      )}
    >
      {criticality}
    </span>
  );
}

function AreaPill({ area }: { area: TaskArea }) {
  return (
    <span className="bg-paper-subtle text-muted-foreground inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
      {titleCase(area)}
    </span>
  );
}
