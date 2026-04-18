import { notFound } from "next/navigation";
import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button, Tabs, TabsContent, TabsList, TabsTrigger } from "@stride-os/ui";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { OutletStatusBadge } from "../_components/OutletStatusBadge";
import { ArchiveOutletButton } from "../_components/ArchiveOutletButton";
import { OutletTeamTab } from "./_components/OutletTeamTab";
import type { Outlet } from "@stride-os/shared";

export default async function OutletDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [supabase, role] = await Promise.all([createClient(), getRole()]);

  const { data } = await supabase
    .from("outlets")
    .select("*")
    .eq("id", id)
    .is("archived_at", null)
    .single();

  if (!data) notFound();

  const outlet = data as Outlet;
  const isPartner = role === "partner";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{outlet.name}</h1>
            <OutletStatusBadge status={outlet.status} />
          </div>
          <p className="text-muted-foreground text-sm">{outlet.brand}</p>
        </div>
        {isPartner && (
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href={`/outlets/${outlet.id}/edit`}>
                <Pencil className="mr-1 h-4 w-4" />
                Edit
              </Link>
            </Button>
            <ArchiveOutletButton id={outlet.id} name={outlet.name} />
          </div>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Employees</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <DetailRow label="Address" value={outlet.address} />
            <DetailRow label="Phone" value={outlet.phone} />
            <DetailRow label="Opened on" value={outlet.opened_at} />
            <DetailRow label="Petpooja ID" value={outlet.petpooja_restaurant_id} />
            <DetailRow label="GST Number" value={outlet.gst_number} />
            <DetailRow label="FSSAI License" value={outlet.fssai_license} />
          </dl>
        </TabsContent>

        <TabsContent value="employees" className="mt-4">
          <OutletTeamTab outletId={outlet.id} />
        </TabsContent>

        <TabsContent value="sales" className="mt-4">
          <p className="text-muted-foreground text-sm">Coming soon.</p>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-muted-foreground font-medium">{label}</dt>
      <dd className="mt-0.5">{value ?? <span className="text-muted-foreground">—</span>}</dd>
    </div>
  );
}
