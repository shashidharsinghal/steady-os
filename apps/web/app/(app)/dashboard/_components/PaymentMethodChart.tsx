"use client";

import { useState } from "react";
import { formatINRCompact } from "@stride-os/shared";
import { Button } from "@stride-os/ui";
import type { DashboardPaymentBreakdown } from "../_lib/dashboard";

export function PaymentMethodChart({ rows }: { rows: DashboardPaymentBreakdown[] }) {
  const [mode, setMode] = useState<"amount" | "count">("amount");
  const maxValue = Math.max(
    ...rows.map((row) => (mode === "amount" ? row.amountPaise : row.count)),
    1
  );

  return (
    <div className="bg-card space-y-4 rounded-[22px] border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Payment method breakdown</p>
          <p className="text-muted-foreground text-sm">
            Switch between transaction value and order count.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "amount" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("amount")}
          >
            Amount
          </Button>
          <Button
            type="button"
            variant={mode === "count" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("count")}
          >
            Count
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {rows.map((row) => {
          const value = mode === "amount" ? row.amountPaise : row.count;
          const width = (value / maxValue) * 100;
          return (
            <div key={row.key} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span>{row.label}</span>
                <span className="font-medium">
                  {mode === "amount"
                    ? formatINRCompact(row.amountPaise / 100)
                    : row.count.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="bg-muted/45 h-3 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--primary)),hsl(var(--secondary)))]"
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
