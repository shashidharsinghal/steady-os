import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { AdminTabs } from "../_components/AdminTabs";
import { listExpenseCategories } from "@/lib/expense-categories";
import { AddExpenseCategoryForm, ExpenseCategoryRow } from "./_components/ExpenseCategoryRow";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminExpenseCategoriesPage({ searchParams }: PageProps) {
  const role = await getRole();
  if (role !== "partner") redirect("/dashboard");

  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: outlets } = await supabase
    .from("outlets")
    .select("id, name, brand")
    .is("archived_at", null)
    .order("name");

  const selectedOutletId = getParam(params.outletId) ?? outlets?.[0]?.id ?? null;
  if (!selectedOutletId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Admin"
          title="Expense categories"
          subtitle="Create an outlet first so category defaults have somewhere to live."
        />
        <AdminTabs />
      </div>
    );
  }

  const selectedOutlet =
    outlets?.find((outlet) => outlet.id === selectedOutletId) ?? outlets?.[0] ?? null;
  if (!selectedOutlet) redirect("/admin/outlets");

  const categories = await listExpenseCategories(selectedOutlet.id);
  const active = categories.filter((category) => category.is_active);
  const inactive = categories.filter((category) => !category.is_active);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Expense categories"
        subtitle="These category definitions will power the later expenses module and outlet budget reporting."
      />

      <AdminTabs />

      <section className="border-border bg-card shadow-card rounded-[24px] border p-5">
        <form action="/admin/expense-categories" className="flex flex-wrap items-center gap-3">
          <label className="text-muted-foreground text-sm font-medium">Outlet</label>
          <select
            name="outletId"
            defaultValue={selectedOutlet.id}
            className="border-border bg-background shadow-card h-11 min-w-[260px] rounded-[14px] border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.25)]"
          >
            {outlets?.map((outlet) => (
              <option key={outlet.id} value={outlet.id}>
                {outlet.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="border-border bg-foreground text-background rounded-[12px] border px-4 py-2.5 text-sm font-medium"
          >
            Load
          </button>
        </form>
      </section>

      <section className="border-border bg-card shadow-card rounded-[28px] border p-6">
        <div className="mb-5">
          <p className="section-card-title">Active categories</p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Reorder these now; category budgets and spend bars land in the later expenses phases.
          </p>
        </div>
        <div className="space-y-3">
          <AddExpenseCategoryForm outletId={selectedOutlet.id} />
          {active.map((category) => (
            <ExpenseCategoryRow
              key={category.id}
              outletId={selectedOutlet.id}
              category={category}
              orderedIds={active.map((row) => row.id)}
            />
          ))}
        </div>
      </section>

      <section className="border-border bg-card shadow-card rounded-[28px] border p-6">
        <div className="mb-5">
          <p className="section-card-title">Inactive categories</p>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            These stay out of the active spend rollups until you reactivate them.
          </p>
        </div>
        <div className="space-y-3">
          {inactive.length === 0 ? (
            <div className="border-border text-muted-foreground rounded-[18px] border border-dashed p-6 text-sm">
              No inactive categories yet.
            </div>
          ) : (
            inactive.map((category) => (
              <ExpenseCategoryRow
                key={category.id}
                outletId={selectedOutlet.id}
                category={category}
                orderedIds={inactive.map((row) => row.id)}
              />
            ))
          )}
        </div>
      </section>
    </div>
  );
}
