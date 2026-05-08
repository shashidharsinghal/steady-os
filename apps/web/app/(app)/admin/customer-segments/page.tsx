import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { AdminTabs } from "../_components/AdminTabs";
import { SegmentDefinitionCard } from "./_components/SegmentDefinitionCard";
import {
  listSegmentDefinitions,
  previewSegmentMatchCount,
} from "@/lib/customer-segment-definitions";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCustomerSegmentsPage({ searchParams }: PageProps) {
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
          title="Customer segments"
          subtitle="Create an outlet first so segment definitions have somewhere to live."
        />
        <AdminTabs />
      </div>
    );
  }

  const selectedOutlet =
    outlets?.find((outlet) => outlet.id === selectedOutletId) ?? outlets?.[0] ?? null;
  if (!selectedOutlet) redirect("/admin/outlets");

  const definitions = await listSegmentDefinitions(selectedOutlet.id);
  const previewCounts = await Promise.all(
    definitions.map((definition) => previewSegmentMatchCount(selectedOutlet.id, definition))
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Customer segments"
        subtitle="These four definitions will drive the dashboard customer movement tiles once that phase lands."
      />

      <AdminTabs />

      <section className="border-border bg-card shadow-card rounded-[24px] border p-5">
        <form action="/admin/customer-segments" className="flex flex-wrap items-center gap-3">
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

      <section className="grid gap-5 xl:grid-cols-2">
        {definitions.map((definition, index) => (
          <SegmentDefinitionCard
            key={definition.id}
            outletId={selectedOutlet.id}
            definition={definition}
            initialPreviewCount={previewCounts[index] ?? 0}
          />
        ))}
      </section>
    </div>
  );
}
