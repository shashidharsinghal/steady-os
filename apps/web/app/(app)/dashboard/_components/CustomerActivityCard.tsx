import { formatINRCompact } from "@stride-os/shared";
import { Card, CardContent } from "@stride-os/ui";
import type { DashboardCustomerActivity } from "../_lib/dashboard";

export function CustomerActivityCard({ customers }: { customers: DashboardCustomerActivity }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <p className="text-sm font-semibold">Customer activity</p>
          <p className="text-muted-foreground text-sm">Based on attributed customer IDs only.</p>
        </div>

        {customers.topSpender ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label="New customers" value={customers.newCustomers.toLocaleString("en-IN")} />
            <Stat
              label="Returning customers"
              value={customers.returningCustomers.toLocaleString("en-IN")}
            />
            <Stat
              label="Repeat rate"
              value={
                customers.repeatRatePct == null ? "—" : `${customers.repeatRatePct.toFixed(1)}%`
              }
            />
            <div className="bg-background/50 rounded-[16px] border p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">
                Top spender
              </p>
              <p className="mt-2 text-sm font-medium">
                {customers.topSpender.name ?? "Customer"}{" "}
                {customers.topSpender.phoneLast4 ? `···${customers.topSpender.phoneLast4}` : ""}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {formatINRCompact(customers.topSpender.spendPaise / 100)} across{" "}
                {customers.topSpender.orders} orders
              </p>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground rounded-[16px] border border-dashed p-5 text-sm">
            Customer tracking begins with aggregator orders that carry a customer ID.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/50 rounded-[16px] border p-4">
      <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}
