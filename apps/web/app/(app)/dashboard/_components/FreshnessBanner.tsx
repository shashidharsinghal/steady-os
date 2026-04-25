import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3 } from "lucide-react";
import { cn } from "@stride-os/ui";
import type { DashboardFreshness } from "../_lib/dashboard";

export function FreshnessBanner({ freshness }: { freshness: DashboardFreshness }) {
  const tone =
    freshness.state === "fresh"
      ? "border-emerald-500/20 bg-emerald-500/6 text-emerald-950 dark:text-emerald-100"
      : freshness.state === "stale"
        ? "border-amber-500/35 bg-amber-500/12 text-amber-950 dark:text-amber-100"
        : "border-red-500/35 bg-red-500/12 text-red-950 dark:text-red-100";

  const Icon = freshness.state === "fresh" ? Clock3 : AlertTriangle;

  return (
    <div className={cn("rounded-[20px] border px-4 py-3", tone)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-background/80 mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl border">
            <Icon className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{freshness.headline}</p>
            {freshness.detail ? <p className="text-xs opacity-80">{freshness.detail}</p> : null}
          </div>
        </div>
        <Link
          href={freshness.href}
          className="text-primary inline-flex items-center gap-1 text-sm font-medium"
        >
          Upload now
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
