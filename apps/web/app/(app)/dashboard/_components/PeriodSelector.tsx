"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, Input, cn } from "@stride-os/ui";
import type { DashboardPeriodKey } from "../_lib/dashboard";

const PERIOD_OPTIONS: Array<{ key: DashboardPeriodKey; label: string }> = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "mtd", label: "MTD" },
  { key: "custom", label: "Custom" },
];

export function PeriodSelector({
  period,
  customStart,
  customEnd,
}: {
  period: DashboardPeriodKey;
  customStart?: string;
  customEnd?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [start, setStart] = useState(customStart ?? "");
  const [end, setEnd] = useState(customEnd ?? "");

  useEffect(() => {
    setStart(customStart ?? "");
    setEnd(customEnd ?? "");
  }, [customStart, customEnd]);

  function push(next: URLSearchParams) {
    router.push(`/dashboard?${next.toString()}`);
  }

  function setPeriod(nextPeriod: DashboardPeriodKey) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", nextPeriod);
    if (nextPeriod !== "custom") {
      params.delete("start");
      params.delete("end");
    } else {
      if (start) params.set("start", start);
      if (end) params.set("end", end);
    }
    push(params);
  }

  function applyCustom() {
    const params = new URLSearchParams(searchParams.toString());
    params.set("period", "custom");
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    push(params);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((option) => (
          <Button
            key={option.key}
            type="button"
            variant={period === option.key ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriod(option.key)}
            className={cn(period === option.key && "shadow-none")}
          >
            {option.label}
          </Button>
        ))}
      </div>
      {period === "custom" ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Start</p>
            <Input type="date" value={start} onChange={(event) => setStart(event.target.value)} />
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">End</p>
            <Input type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
          </div>
          <Button type="button" size="sm" onClick={applyCustom}>
            Apply
          </Button>
        </div>
      ) : null}
    </div>
  );
}
