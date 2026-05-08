import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryItemForm } from "../_components/InventoryItemForm";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewInventoryItemPage({ searchParams }: PageProps) {
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

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow={`Inventory · ${outlet.name}`}
        title="Add inventory item"
        subtitle="Create a menu item master row with current selling price, cost to prepare, and optional stock metadata."
      />
      <InventoryItemForm outletId={outlet.id} />
    </div>
  );
}
