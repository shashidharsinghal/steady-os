import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@stride-os/ui";
import type { MorningCheckAlert } from "../_lib/dashboard";

export function AlertsStrip({ alerts }: { alerts: MorningCheckAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {alerts.map((alert) => {
        const Icon = alert.tone === "warn" ? AlertTriangle : Info;
        return (
          <div
            key={alert.id}
            className={cn(
              "rounded-[18px] border p-4",
              alert.tone === "warn"
                ? "border-amber-500/35 bg-amber-500/10"
                : "border-sky-500/25 bg-sky-500/10"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="bg-background/80 flex h-9 w-9 items-center justify-center rounded-xl border">
                <Icon className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold">{alert.headline}</p>
                <p className="text-muted-foreground text-sm">{alert.detail}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
