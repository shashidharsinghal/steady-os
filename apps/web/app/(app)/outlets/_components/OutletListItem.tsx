import Link from "next/link";
import { MapPin, Phone } from "lucide-react";
import { Card, CardContent } from "@stride-os/ui";
import type { Outlet } from "@stride-os/shared";
import { OutletStatusBadge } from "./OutletStatusBadge";

export function OutletListItem({ outlet }: { outlet: Outlet }) {
  return (
    <Link href={`/outlets/${outlet.id}`}>
      <Card className="hover:bg-muted/50 cursor-pointer transition-colors">
        <CardContent className="flex items-start justify-between gap-4 p-4">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold">{outlet.name}</span>
              <OutletStatusBadge status={outlet.status} />
            </div>
            <p className="text-muted-foreground text-sm">{outlet.brand}</p>
            {outlet.address && (
              <p className="text-muted-foreground flex items-center gap-1 text-sm">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{outlet.address}</span>
              </p>
            )}
            {outlet.phone && (
              <p className="text-muted-foreground flex items-center gap-1 text-sm">
                <Phone className="h-3 w-3 shrink-0" />
                {outlet.phone}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
