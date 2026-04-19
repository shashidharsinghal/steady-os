"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button, cn } from "@stride-os/ui";
import type { DashboardAlert } from "../_lib/dashboard";

const STORAGE_KEY = "stride-dashboard-dismissed-alerts";

export function AlertCard({ alert }: { alert: DashboardAlert }) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;
    try {
      const values = JSON.parse(stored) as string[];
      setDismissed(values.includes(alert.id));
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [alert.id]);

  function dismiss() {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const values = stored ? ((JSON.parse(stored) as string[]) ?? []) : [];
    const next = Array.from(new Set([...values, alert.id]));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setDismissed(true);
  }

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "rounded-[18px] border px-4 py-3",
        alert.severity === "warn" ? "border-warning/35 bg-warning/10" : "border-border bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="bg-background/70 flex h-9 w-9 items-center justify-center rounded-xl border">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">Actionable signal</p>
            <p className="text-muted-foreground text-sm">{alert.message}</p>
          </div>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={dismiss}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
