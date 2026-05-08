import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@stride-os/ui";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import type { Outlet, OutletPhoto } from "@stride-os/shared";
import { getSignedOutletPhotoUrls } from "./photo-utils";
import { OutletListItem } from "./_components/OutletListItem";
import { PageHeader } from "@/components/layout/page-header";

export default async function OutletsPage() {
  const [supabase, role] = await Promise.all([createClient(), getRole()]);

  const { data: outlets } = await supabase
    .from("outlets")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const outletIds = (outlets ?? []).map((outlet) => outlet.id);
  const { data: coverPhotos } =
    outletIds.length > 0
      ? await supabase
          .from("outlet_photos")
          .select("*")
          .in("outlet_id", outletIds)
          .eq("is_cover", true)
      : { data: [] as OutletPhoto[] };
  const signedCoverPhotos = await getSignedOutletPhotoUrls((coverPhotos ?? []) as OutletPhoto[]);
  const coverPhotoMap = new Map(
    signedCoverPhotos.map((photo) => [photo.outlet_id, photo.signed_url])
  );

  const isEmpty = !outlets || outlets.length === 0;
  const isPartner = role === "partner";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manage · Portfolio"
        title="Outlets"
        subtitle="Portfolio view with cover photos, contact details, and live status."
        actions={
          isPartner ? (
            <Button asChild variant="accent">
              <Link href="/outlets/new">
                <Plus className="mr-1 h-4 w-4" />
                New outlet
              </Link>
            </Button>
          ) : null
        }
      />

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          {isPartner ? (
            <>
              <p className="text-muted-foreground mb-4">No outlets yet.</p>
              <Button asChild>
                <Link href="/outlets/new">Create your first outlet</Link>
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">
              You haven&apos;t been assigned to any outlets yet. Ask a partner to add you.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(outlets as Outlet[]).map((outlet) => (
            <OutletListItem
              key={outlet.id}
              outlet={outlet}
              coverUrl={coverPhotoMap.get(outlet.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
