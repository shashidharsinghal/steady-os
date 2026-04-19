"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3 } from "lucide-react";
import { cn } from "@stride-os/ui";
import type { DashboardFreshnessState } from "../_lib/dashboard";

export function FreshnessBanner({
  state,
  headline,
  detail,
  href,
}: {
  state: DashboardFreshnessState;
  headline: string;
  detail: string | null;
  href: string;
}) {
  const tone =
    state === "fresh"
      ? "border-border/70 bg-card/80"
      : state === "stale"
        ? "border-warning/30 bg-warning/8"
        : state === "very-stale"
          ? "border-warning/35 bg-warning/12"
          : "border-destructive/30 bg-destructive/10";

  const Icon = state === "fresh" ? Clock3 : AlertTriangle;

  return (
    <div className={cn("rounded-[18px] border px-4 py-3", tone)}>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <div className="bg-background/70 mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border">
            <Icon className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{headline}</p>
            {detail ? <p className="text-muted-foreground text-xs">{detail}</p> : null}
          </div>
        </div>
        <Link
          href={href}
          className="text-primary inline-flex items-center gap-1 text-sm font-medium"
        >
          Upload now
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
