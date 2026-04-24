import { DiscountCard } from "./DiscountCard";
import type { DiscountPerformanceData } from "../_lib/dashboard";

export function DiscountPerformanceSection({
  data,
  periodLabel,
}: {
  data: DiscountPerformanceData;
  periodLabel: string;
}) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="text-primary text-sm font-medium uppercase tracking-[0.22em]">Section 4</p>
        <h2 className="text-2xl font-semibold tracking-tight">Discount Performance</h2>
        <p className="text-muted-foreground text-sm">
          Discount incidence, magnitude, and AOV split for the current period selection.
        </p>
      </div>

      <DiscountCard data={data} periodLabel={periodLabel} />
    </section>
  );
}
