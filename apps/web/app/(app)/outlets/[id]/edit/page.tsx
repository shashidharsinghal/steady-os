import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { OutletForm } from "../../_components/OutletForm";
import type { Outlet } from "@stride-os/shared";

export default async function EditOutletPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getRole();

  if (role !== "partner") {
    redirect("/outlets?error=unauthorized");
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("outlets")
    .select("*")
    .eq("id", id)
    .is("archived_at", null)
    .single();

  if (!data) notFound();

  const outlet = data as Outlet;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit outlet</h1>
        <p className="text-muted-foreground text-sm">{outlet.name}</p>
      </div>
      <OutletForm mode="edit" outlet={outlet} />
    </div>
  );
}
