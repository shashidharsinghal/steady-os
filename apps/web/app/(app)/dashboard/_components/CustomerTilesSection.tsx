import { CustomerTile } from "./CustomerTile";
import type { CustomerTilesData } from "../_lib/dashboard";

export function CustomerTilesSection({ data }: { data: CustomerTilesData }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-primary text-sm font-medium uppercase tracking-[0.22em]">Section 5</p>
        <h2 className="text-2xl font-semibold tracking-tight">Regulars & Newcomers</h2>
        <p className="text-muted-foreground text-sm">
          Aggregate customer movement here, with drill-downs living in the customer workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CustomerTile
          href="/customers?sort=first_seen&lastSeen=30d"
          title="New customers"
          value={data.newCount.toLocaleString("en-IN")}
          subtitle="Customers first seen during the selected period."
        />
        <CustomerTile
          href="/customers?sort=last_seen&lastSeen=30d"
          title="Returning customers"
          value={data.returningCount.toLocaleString("en-IN")}
          subtitle={
            data.repeatPct == null
              ? "No attributed returning customers in this period."
              : `${Math.round(data.repeatPct)}% of attributed customers were returning.`
          }
        />
        <CustomerTile
          href="/customers/segments"
          title="Regulars (3+ visits)"
          value={data.regularCount.toLocaleString("en-IN")}
          subtitle="Customers who showed up in this period and already have at least three total visits."
        />
        <CustomerTile
          href="/customers?hasDineIn=yes"
          title="Dine-in repeat rate"
          value={data.dineInRepeatPct == null ? "—" : `${Math.round(data.dineInRepeatPct)}%`}
          subtitle="Repeat rate based on Pine Labs UPI VPAs in the selected period."
        />
      </div>
    </section>
  );
}
