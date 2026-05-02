import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Upload } from "lucide-react";
import { Button, Card, CardContent, Skeleton } from "@stride-os/ui";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { MorningCheckSection } from "./_components/MorningCheckSection";
import { PeriodViewSection } from "./_components/PeriodViewSection";
import { ChannelEconomicsSection } from "./_components/ChannelEconomicsSection";
import { DiscountPerformanceSection } from "./_components/DiscountPerformanceSection";
import { CustomerTilesSection } from "./_components/CustomerTilesSection";
import { PetpoojaDailySection } from "./_components/PetpoojaDailySection";
import {
  chooseDashboardOutlet,
  getChannelEconomics,
  getCustomerTiles,
  getDiscountPerformance,
  getItemPerformance,
  getMorningCheck,
  getPaymentMethodBreakdown,
  getPeriodView,
  resolveDashboardPeriod,
  type DashboardPeriod,
} from "./_lib/dashboard";

// Each section is fetched + rendered in its own async server component so that
// `<Suspense>` can stream them individually. Previously the page awaited all 7
// queries with `Promise.all` and only painted once the slowest one returned —
// users stared at the route-level skeleton for several seconds even though the
// morning check (the most important section) was usually ready first.

async function PeriodViewLoader({
  outletId,
  period,
  compare,
}: {
  outletId: string;
  period: DashboardPeriod;
  compare: boolean;
}) {
  const data = await getPeriodView(outletId, period, compare);
  return <PeriodViewSection data={data} compare={compare} />;
}

async function PetpoojaDailyLoader({
  outletId,
  period,
}: {
  outletId: string;
  period: DashboardPeriod;
}) {
  const [itemPerformance, paymentBreakdown] = await Promise.all([
    getItemPerformance(outletId, period),
    getPaymentMethodBreakdown(outletId, period),
  ]);
  return (
    <PetpoojaDailySection itemPerformance={itemPerformance} paymentBreakdown={paymentBreakdown} />
  );
}

async function ChannelEconomicsLoader({
  outletId,
  period,
}: {
  outletId: string;
  period: DashboardPeriod;
}) {
  const data = await getChannelEconomics(outletId, period);
  return <ChannelEconomicsSection rows={data} />;
}

async function DiscountPerformanceLoader({
  outletId,
  period,
}: {
  outletId: string;
  period: DashboardPeriod;
}) {
  const data = await getDiscountPerformance(outletId, period);
  return <DiscountPerformanceSection data={data} periodLabel={period.label} />;
}

async function CustomerTilesLoader({
  outletId,
  period,
}: {
  outletId: string;
  period: DashboardPeriod;
}) {
  const data = await getCustomerTiles(outletId, period);
  return <CustomerTilesSection data={data} />;
}

function SectionSkeleton({ height }: { height: string }) {
  return <Skeleton className={`${height} w-full rounded-[24px]`} />;
}

type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const [supabase, role] = await Promise.all([createClient(), getRole()]);

  if (role !== "partner") redirect("/outlets");

  const { data: outlets } = await supabase
    .from("outlets")
    .select("id, name, brand")
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  const selectedOutlet = chooseDashboardOutlet(
    outlets ?? [],
    typeof resolvedSearchParams.outletId === "string" ? resolvedSearchParams.outletId : null
  );

  if (!selectedOutlet) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="text-primary text-sm font-medium uppercase tracking-[0.22em]">
            Sales dashboard v2
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">No outlet selected yet</h1>
          <p className="text-muted-foreground text-sm">
            Create an outlet first, then ingest sales data to unlock the morning check.
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl border">
              <Upload className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold">Start with an outlet</p>
              <p className="text-muted-foreground max-w-xl text-sm leading-6">
                The v2 dashboard is built for outlet-level operational decisions. Create an outlet,
                then ingest Petpooja, Pine Labs, or Swiggy files.
              </p>
            </div>
            <Button asChild>
              <Link href="/outlets/new">
                Create outlet
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const period = resolveDashboardPeriod(resolvedSearchParams);
  const compare =
    (Array.isArray(resolvedSearchParams.compare)
      ? resolvedSearchParams.compare[0]
      : resolvedSearchParams.compare) === "true";

  // Only the morning check is awaited synchronously — the empty-state UI below
  // depends on its result. Every other section streams in via <Suspense>.
  const morningCheck = await getMorningCheck(selectedOutlet.id);

  if (!morningCheck) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-primary text-sm font-medium uppercase tracking-[0.22em]">
            Sales dashboard v2
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{selectedOutlet.name}</h1>
          <p className="text-muted-foreground text-sm">
            {selectedOutlet.brand ?? "This outlet"} is ready for its first committed sales
            ingestion.
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-lg font-semibold">No committed sales data yet</p>
                <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                  Upload sales files from the ingest workspace. Once a run is committed, this
                  dashboard will answer the five questions from the v2 spec: how you did given the
                  day, when the rush hits, who is returning, what channels really net, and how
                  discounts behaved.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild>
                  <Link href="/ingest">
                    Open ingest
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/outlets">Review outlets</Link>
                </Button>
              </div>
            </div>

            <div className="bg-background/70 rounded-[20px] border p-5">
              <p className="text-sm font-semibold">What unlocks after the first commit</p>
              <div className="text-muted-foreground mt-3 grid gap-2 text-sm">
                <p>Day-of-week-aware morning check instead of a naive trailing average</p>
                <p>Period view with comparison, DoW ribbon, and channel trend decomposition</p>
                <p>Channel take-home economics, discount performance, and customer tiles</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      <section className="bg-card relative overflow-hidden rounded-[28px] border p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_42%),radial-gradient(circle_at_bottom_right,hsl(var(--secondary)/0.12),transparent_40%)]" />
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-primary text-sm font-medium uppercase tracking-[0.22em]">
              Sales dashboard v2
            </p>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight">{selectedOutlet.name}</h1>
              <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                Morning check first, then period context, channel take-home, discounts, and customer
                movement for {selectedOutlet.brand ?? "this outlet"}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/ingest">Upload sales files</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/customers">Open customers</Link>
            </Button>
            <Button asChild>
              <Link href="/outlets">
                Review outlet
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <MorningCheckSection data={morningCheck} />

      <Suspense fallback={<SectionSkeleton height="h-[480px]" />}>
        <PeriodViewLoader outletId={selectedOutlet.id} period={period} compare={compare} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton height="h-[360px]" />}>
        <PetpoojaDailyLoader outletId={selectedOutlet.id} period={period} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton height="h-[300px]" />}>
        <ChannelEconomicsLoader outletId={selectedOutlet.id} period={period} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton height="h-[260px]" />}>
        <DiscountPerformanceLoader outletId={selectedOutlet.id} period={period} />
      </Suspense>

      <Suspense fallback={<SectionSkeleton height="h-[170px]" />}>
        <CustomerTilesLoader outletId={selectedOutlet.id} period={period} />
      </Suspense>
      {/* TODO: Add a compact P&L summary card here once monthly report history is deep enough to be decision-useful. */}
    </div>
  );
}
