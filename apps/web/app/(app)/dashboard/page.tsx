import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Upload } from "lucide-react";
import { Button, Card, CardContent } from "@stride-os/ui";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { FreshnessBanner } from "./_components/FreshnessBanner";
import { MorningCheckStrip } from "./_components/MorningCheckStrip";
import { TrendReviewStrip } from "./_components/TrendReviewStrip";
import { DecisionSurfaceStrip } from "./_components/DecisionSurfaceStrip";
import {
  buildFreshnessMessage,
  chooseDashboardOutlet,
  getDashboardOverview,
  getDashboardPeriodPayload,
  resolveDashboardPeriod,
} from "./_lib/dashboard";

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
          <h1 className="text-2xl font-semibold tracking-tight">Sales dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Start with an outlet so the morning check has somewhere to pull from.
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
            <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl border">
              <Upload className="h-6 w-6" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold">No active outlets yet</p>
              <p className="text-muted-foreground max-w-xl text-sm leading-6">
                Create an outlet first, then ingest sales files to unlock the dashboard.
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

  const [overview, payload] = await Promise.all([
    getDashboardOverview(selectedOutlet.id),
    getDashboardPeriodPayload(selectedOutlet.id, period, compare),
  ]);

  if (!overview) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="text-primary text-sm font-medium uppercase tracking-[0.18em]">
            Sales dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{selectedOutlet.name}</h1>
          <p className="text-muted-foreground text-sm">
            {selectedOutlet.brand ?? "Outlet"} is ready for its first sales ingestion run.
          </p>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-lg font-semibold">No committed sales data yet</p>
                <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                  Upload Petpooja, Pine Labs, or Swiggy files from the ingest workspace. Once a run
                  is committed, this dashboard will surface freshness, trends, and decision cues.
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
                <p>Freshness banner with honest staleness messaging</p>
                <p>Yesterday revenue, orders, and AOV with trailing context</p>
                <p>Trend review by period, channel mix, and decision heatmap</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const freshnessMessage = buildFreshnessMessage(overview.freshness);

  return (
    <div className="space-y-6">
      <section className="bg-card space-y-4 rounded-[24px] border p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="text-primary text-sm font-medium uppercase tracking-[0.2em]">
              Sales dashboard
            </p>
            <div className="space-y-1">
              <h1 className="text-3xl font-semibold tracking-tight">{selectedOutlet.name}</h1>
              <p className="text-muted-foreground text-sm leading-6">
                Morning check first, then trend review and channel decisions for{" "}
                {selectedOutlet.brand ?? "this outlet"}.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/ingest">Upload sales files</Link>
            </Button>
            <Button asChild>
              <Link href="/outlets">
                Review outlet
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <FreshnessBanner
          state={overview.freshness.state}
          headline={freshnessMessage.headline}
          detail={freshnessMessage.detail}
          href={freshnessMessage.href}
        />
      </section>

      <MorningCheckStrip overview={overview} />
      <TrendReviewStrip period={period} compare={compare} payload={payload} />
      <DecisionSurfaceStrip payload={payload} />
    </div>
  );
}
