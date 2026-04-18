import Link from "next/link";
import { Building2, MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@stride-os/ui";
import type { Outlet } from "@stride-os/shared";
import { OutletCoverImage } from "./OutletCoverImage";
import { OutletStatusBadge } from "./OutletStatusBadge";

export function OutletListItem({ outlet, coverUrl }: { outlet: Outlet; coverUrl?: string | null }) {
  return (
    <Link href={`/outlets/${outlet.id}`}>
      <Card className="hover:border-primary/35 hover:bg-muted/30 group cursor-pointer overflow-hidden border shadow-none transition-all duration-200 hover:-translate-y-0.5">
        <OutletCoverImage name={outlet.name} coverUrl={coverUrl} />
        <CardContent className="space-y-4 p-5">
          <div className="space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h2 className="truncate text-lg font-semibold tracking-tight">{outlet.name}</h2>
                <p className="text-muted-foreground text-sm">{outlet.brand}</p>
              </div>
              <OutletStatusBadge status={outlet.status} />
            </div>
          </div>

          <div className="grid gap-2 text-sm">
            <MetaRow icon={Building2} value={outlet.brand} />
            <MetaRow icon={MapPin} value={outlet.address ?? "Address not added"} />
            <MetaRow icon={Phone} value={outlet.phone ?? "Phone not added"} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function MetaRow({ icon: Icon, value }: { icon: typeof Building2; value: string }) {
  return (
    <div className="text-muted-foreground bg-muted/40 flex items-center gap-2 rounded-lg border border-transparent px-3 py-2">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  );
}
