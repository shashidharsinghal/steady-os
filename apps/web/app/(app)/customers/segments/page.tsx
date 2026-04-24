import Link from "next/link";
import { formatINRCompact } from "@stride-os/shared";
import { Card, CardContent } from "@stride-os/ui";
import { getSegmentOverview } from "../actions";
import { SegmentBadge } from "../_components/SegmentBadge";

export default async function CustomerSegmentsPage() {
  const rows = await getSegmentOverview();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Customer segments</h1>
        <p className="text-muted-foreground text-sm">
          Segment counts and spend mix derived from the unified customer profile view.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <Card key={row.segment}>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between gap-3">
                <SegmentBadge segment={row.segment} />
                <Link
                  href={`/customers?segment=${row.segment}`}
                  className="text-primary text-sm font-medium"
                >
                  View
                </Link>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Metric label="Customers" value={row.customerCount.toLocaleString("en-IN")} />
                <Metric label="Spend" value={formatINRCompact(row.totalSpendPaise / 100)} />
                <Metric label="Avg orders" value={row.averageOrderCount.toFixed(1)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/60 rounded-[16px] border p-4">
      <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 font-mono text-lg font-semibold">{value}</p>
    </div>
  );
}
