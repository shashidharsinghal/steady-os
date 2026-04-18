import { notFound } from "next/navigation";
import Link from "next/link";
import { Building2, CalendarDays, MapPin, Pencil, Phone, Receipt, ShieldCheck } from "lucide-react";
import { Button, Card, CardContent, Tabs, TabsContent, TabsList, TabsTrigger } from "@stride-os/ui";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { ArchiveOutletButton } from "../_components/ArchiveOutletButton";
import { getSignedOutletPhotoUrls } from "../photo-utils";
import { OutletTeamTab } from "./_components/OutletTeamTab";
import { OutletHero } from "./_components/OutletHero";
import { OutletPhotoGallery } from "./_components/OutletPhotoGallery";
import type { Outlet, OutletPhoto } from "@stride-os/shared";

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
  const { data: photoData } = await supabase
    .from("outlet_photos")
    .select("*")
    .eq("outlet_id", outlet.id)
    .order("sort_order", { ascending: true });
  const signedPhotos = await getSignedOutletPhotoUrls((photoData ?? []) as OutletPhoto[]);
  const coverPhoto = signedPhotos.find((photo) => photo.is_cover) ?? signedPhotos[0] ?? null;

  return (
    <div className="space-y-6">
      <OutletHero
        name={outlet.name}
        brand={outlet.brand}
        status={outlet.status}
        address={outlet.address}
        phone={outlet.phone}
        coverUrl={coverPhoto?.signed_url}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">
            Photos, overview metadata, and roster for this outlet.
          </p>
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
        <TabsList className="bg-transparent p-0">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="employees">Team</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="space-y-6">
            <OutletPhotoGallery
              outletId={outlet.id}
              outletName={outlet.name}
              photos={signedPhotos}
              isPartner={isPartner}
            />

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <MetaCard icon={MapPin} label="Address" value={outlet.address} />
              <MetaCard icon={Phone} label="Phone" value={outlet.phone} />
              <MetaCard icon={CalendarDays} label="Opened on" value={outlet.opened_at} />
              <MetaCard icon={Receipt} label="Petpooja ID" value={outlet.petpooja_restaurant_id} />
              <MetaCard icon={Building2} label="GST Number" value={outlet.gst_number} />
              <MetaCard icon={ShieldCheck} label="FSSAI License" value={outlet.fssai_license} />
            </div>
          </div>
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

function MetaCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <Card className="border shadow-none">
      <CardContent className="space-y-3 p-5">
        <div className="text-muted-foreground flex items-center gap-2 text-sm">
          <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
            <Icon className="h-4 w-4" />
          </div>
          <span className="font-medium">{label}</span>
        </div>
        <p className="text-sm font-medium leading-6">
          {value ?? <span className="text-muted-foreground">Not added yet</span>}
        </p>
      </CardContent>
    </Card>
  );
}
