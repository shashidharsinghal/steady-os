import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { listInventoryImportCandidates } from "@/lib/inventory";
import { InventoryImportClient } from "../_components/InventoryImportClient";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InventoryImportPage({ searchParams }: PageProps) {
  const role = await getRole();
  if (role !== "partner") redirect("/inventory");

  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: outlets } = await supabase
    .from("outlets")
    .select("id, name")
    .is("archived_at", null)
    .order("name");

  const outletId = param(params.outletId) ?? outlets?.[0]?.id ?? null;
  if (!outletId) redirect("/outlets");
  const outlet = outlets?.find((row) => row.id === outletId) ?? outlets?.[0] ?? null;
  if (!outlet) redirect("/outlets");

  const candidates = await listInventoryImportCandidates(outlet.id);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow={`Inventory · ${outlet.name}`}
        title="Import from sales history"
        subtitle="Start from your committed sales line items so you only need to fill in costs afterwards."
      />

      {candidates.length === 0 ? (
        <div className="border-border bg-card text-muted-foreground shadow-card rounded-[28px] border p-8 text-sm">
          No committed sales line items were found for this outlet yet. Finish a sales ingest first,
          then come back here to bootstrap the item master.
        </div>
      ) : (
        <InventoryImportClient outletId={outlet.id} candidates={candidates} />
      )}
    </div>
  );
}
