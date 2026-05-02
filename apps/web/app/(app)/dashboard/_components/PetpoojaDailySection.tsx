import { formatINRCompact } from "@stride-os/shared";
import { Card, CardContent } from "@stride-os/ui";
import type { ItemPerformanceData, PaymentMethodBreakdownRow } from "../_lib/dashboard";

function label(value: string): string {
  return value
    .replace("online_aggregator", "online")
    .replace("not_paid", "not paid")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function PetpoojaDailySection({
  itemPerformance,
  paymentBreakdown,
}: {
  itemPerformance: ItemPerformanceData;
  paymentBreakdown: PaymentMethodBreakdownRow[];
}) {
  const hasItems = itemPerformance.topItems.length > 0;
  const hasPayments = paymentBreakdown.length > 0;

  if (!hasItems && !hasPayments) return null;

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {hasPayments ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-sm font-semibold">Payment mix</p>
              <p className="text-muted-foreground text-xs">From Petpooja Payment Wise Summary</p>
            </div>
            <div className="space-y-3">
              {paymentBreakdown.map((row) => (
                <div key={row.method} className="space-y-1">
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span>{label(row.method)}</span>
                    <span className="font-medium">{formatINRCompact(row.totalPaise / 100)}</span>
                  </div>
                  <div className="bg-muted h-2 overflow-hidden rounded-full">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${Math.max(4, row.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {hasItems ? (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-sm font-semibold">Item performance</p>
              <p className="text-muted-foreground text-xs">Top items from Item Wise Bill reports</p>
            </div>
            <div className="space-y-3">
              {itemPerformance.topItems.slice(0, 6).map((row) => (
                <div key={`${row.item}-${row.category ?? ""}`} className="flex gap-4 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{row.item}</p>
                    <p className="text-muted-foreground text-xs">
                      {row.qty.toLocaleString("en-IN")} qty
                      {row.category ? ` · ${row.category}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium">
                    {formatINRCompact(row.revenuePaise / 100)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
