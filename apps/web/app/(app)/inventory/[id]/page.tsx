import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { getInventoryItem } from "@/lib/inventory";
import { InventoryItemForm } from "../_components/InventoryItemForm";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function InventoryItemDetailPage({ params }: PageProps) {
  const role = await getRole();
  if (role !== "partner") redirect("/inventory");

  const { id } = await params;
  const item = await getInventoryItem(id);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow={`Inventory · ${item.item_name}`}
        title="Edit item economics"
        subtitle="Update the current cost key that downstream profit and margin views will use."
      />
      <InventoryItemForm outletId={item.outlet_id} item={item} />
    </div>
  );
}
