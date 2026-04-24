import { formatINRCompact } from "@stride-os/shared";
import type { DiscountPerformanceData } from "../_lib/dashboard";

export function DiscountCard({
  data,
  periodLabel,
}: {
  data: DiscountPerformanceData;
  periodLabel: string;
}) {
  const totalOrders = data.discountedOrders + data.fullPriceOrders;

  return (
    <div className="bg-card rounded-[24px] border p-5">
      <div className="space-y-1">
        <p className="text-base font-semibold">Discount Performance · {periodLabel}</p>
        <p className="text-muted-foreground text-sm">
          Deterministic read on what happened, without pretending causality.
        </p>
      </div>

      {totalOrders === 0 ? (
        <div className="text-muted-foreground mt-5 rounded-[18px] border border-dashed p-5 text-sm">
          No orders landed in this period, so discount performance is empty too.
        </div>
      ) : (
        <div className="mt-5 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <Stat
              label="Discounted orders"
              value={`${data.discountedOrders.toLocaleString("en-IN")} (${Math.round((data.discountedOrders / totalOrders) * 100)}%)`}
            />
            <Stat label="Discount given" value={formatINRCompact(data.totalDiscountPaise / 100)} />
            <Stat
              label="Average discount"
              value={
                data.averageDiscountPct == null
                  ? "—"
                  : `${Math.round(data.averageDiscountPct)}% off`
              }
            />
            <Stat
              label="AOV"
              value={`Discounted ${data.discountedAovPaise != null ? formatINRCompact(data.discountedAovPaise / 100) : "—"} · Undiscounted ${data.fullPriceAovPaise != null ? formatINRCompact(data.fullPriceAovPaise / 100) : "—"}`}
            />
          </div>

          <div className="bg-background/60 rounded-[18px] border p-4">
            <p className="text-sm font-semibold">Coupon view</p>
            {data.topCoupons.length > 0 ? (
              <div className="mt-3 space-y-3">
                {data.topCoupons.map((coupon) => (
                  <div
                    key={coupon.code}
                    className="flex items-center justify-between gap-4 text-sm"
                  >
                    <div>
                      <p className="font-medium">{coupon.code}</p>
                      <p className="text-muted-foreground">{coupon.orders} orders</p>
                    </div>
                    <p className="font-mono font-semibold">
                      {formatINRCompact(coupon.discountPaise / 100)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground mt-3 text-sm">
                Coupon-level labels were not reliably present in the ingested files for this period,
                so this card sticks to order-level discount economics.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/60 rounded-[18px] border p-4">
      <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
