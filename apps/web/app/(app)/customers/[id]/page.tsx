import { notFound } from "next/navigation";
import { formatINRCompact } from "@stride-os/shared";
import { Card, CardContent } from "@stride-os/ui";
import { CustomerIdentitiesCard } from "../_components/CustomerIdentitiesCard";
import { CustomerTimeline } from "../_components/CustomerTimeline";
import { SegmentBadge } from "../_components/SegmentBadge";
import { getCustomer, getCustomerTimeline } from "../actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await getCustomer(id);
  if (!detail) notFound();

  const timeline = await getCustomerTimeline(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {detail.profile.primary_identifier}
            </h1>
            <SegmentBadge segment={detail.profile.highest_segment} />
          </div>
          <p className="text-muted-foreground text-sm">
            {detail.profile.total_orders} interactions ·{" "}
            {formatINRCompact(detail.profile.total_spend_paise / 100)} lifetime spend
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2">
            <Stat label="First seen" value={formatDate(detail.customer.first_seen_at)} />
            <Stat label="Last seen" value={formatDate(detail.customer.last_seen_at)} />
            <Stat label="Orders" value={detail.customer.total_orders.toLocaleString("en-IN")} />
            <Stat
              label="Lifetime spend"
              value={formatINRCompact(detail.customer.total_spend_paise / 100)}
            />
          </CardContent>
        </Card>
        <CustomerIdentitiesCard identities={detail.identities} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <CustomerTimeline rows={timeline} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-background/60 rounded-[16px] border p-4">
      <p className="text-muted-foreground text-xs uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-2 font-mono text-xl font-semibold">{value}</p>
    </div>
  );
}
