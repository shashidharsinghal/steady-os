import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, CheckCircle2, ChevronRight, Download, Info, Upload } from "lucide-react";
import { formatINR, formatINRCompact } from "@stride-os/shared";
import { Button, Card, CardContent } from "@stride-os/ui";
import { cn } from "@stride-os/ui/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { getInvestmentRecovery } from "@/lib/outlet-investments";
import {
  chooseDashboardOutlet,
  getStatStrip,
  getTrendData,
  getChannelEconomics,
  getCustomerTiles,
  getDiscountPerformance,
  getItemPerformance,
  getMorningCheck,
  getPaymentMethodBreakdown,
  getPeriodView,
  resolveDashboardCompareMode,
  resolveDashboardPeriod,
  type DashboardCompareMode,
  type ChannelEconomicsRow,
  type DashboardChannel,
  type DashboardPeriod,
  type DashboardTrendMetric,
  type ItemPerformanceData,
  type MorningCheckAlert,
  type MorningCheckData,
  type PaymentMethodBreakdownRow,
  type PeriodViewData,
  type TrendData,
} from "./_lib/dashboard";

type DashboardBreakdown = "all" | "weekday" | "weekend";
type DashboardPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const CHANNEL_META: Record<DashboardChannel, { label: string; color: string }> = {
  dine_in: { label: "Dine-in", color: "hsl(var(--ink))" },
  takeaway: { label: "Takeaway", color: "hsl(var(--accent))" },
  swiggy: { label: "Swiggy", color: "hsl(var(--green))" },
  zomato: { label: "Zomato", color: "hsl(var(--blue))" },
  other: { label: "Other", color: "hsl(var(--violet))" },
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const [supabase, role] = await Promise.all([createClient(), getRole()]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, outletResult] = await Promise.all([
    supabase.from("profiles").select("full_name").single(),
    role === "partner"
      ? supabase
          .from("outlets")
          .select("id, name, brand")
          .is("archived_at", null)
          .order("created_at", { ascending: true })
      : supabase
          .from("outlet_members")
          .select("outlets!inner(id, name, brand)")
          .eq("user_id", user.id)
          .eq("role", "manager"),
  ]);

  const outlets =
    role === "partner"
      ? ((outletResult.data ?? []) as Array<{ id: string; name: string; brand: string | null }>)
      : (
          (outletResult.data ?? []) as Array<{
            outlets: { id: string; name: string; brand: string | null } | null;
          }>
        )
          .map((row) => row.outlets)
          .filter((row): row is { id: string; name: string; brand: string | null } => Boolean(row));

  const selectedOutlet = chooseDashboardOutlet(
    outlets ?? [],
    typeof resolvedSearchParams.outletId === "string" ? resolvedSearchParams.outletId : null
  );

  if (!selectedOutlet) {
    return (
      <div className="space-y-6">
        <DashboardHeroShell
          eyebrow={formatHeaderEyebrow(new Date())}
          title={`Good morning, ${getFirstName(profile?.full_name, user?.email)}.`}
          subtitle="Create your first outlet to unlock the morning briefing."
          actions={
            <Button asChild variant="primary">
              <Link href="/outlets/new">
                Create outlet
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        />

        <Card className="rounded-[28px]">
          <CardContent className="grid gap-6 p-8 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-4">
              <p className="page-eyebrow">Workspace</p>
              <h2 className="text-3xl font-semibold tracking-tight">No outlet selected yet</h2>
              <p className="text-muted-foreground max-w-2xl text-sm leading-7">
                The new dashboard expects an outlet, committed ingestion runs, and a recent sales
                window. Once you add an outlet, we can start bringing the rest of the V3 design to
                life against real operating data.
              </p>
            </div>
            <div className="border-border bg-card rounded-[20px] border p-5">
              <p className="section-card-title">What unlocks next</p>
              <div className="text-muted-foreground mt-4 space-y-3 text-sm">
                <p>Morning check narrative versus weekday baseline</p>
                <p>Channel take-home, customer movement, and payment mix</p>
                <p>Ingest-linked operational alerts for the partner dashboard</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const period = resolveDashboardPeriod(resolvedSearchParams);
  const compareMode = resolveDashboardCompareMode(resolvedSearchParams);
  const compare = compareMode !== "off";
  const metric = toDashboardMetric(getSingleParam(resolvedSearchParams.metric));
  const breakdown = toDashboardBreakdown(getSingleParam(resolvedSearchParams.breakdown));

  const [
    morningCheck,
    periodView,
    channelEconomics,
    discountPerformance,
    customerTiles,
    itemData,
    paymentBreakdown,
    investmentRecovery,
    statStrip,
    trend,
  ] = await Promise.all([
    getMorningCheck(selectedOutlet.id),
    getPeriodView(selectedOutlet.id, period, compare),
    getChannelEconomics(selectedOutlet.id, period),
    getDiscountPerformance(selectedOutlet.id, period),
    getCustomerTiles(selectedOutlet.id, period),
    getItemPerformance(selectedOutlet.id, period),
    getPaymentMethodBreakdown(selectedOutlet.id, period),
    getInvestmentRecovery(selectedOutlet.id),
    getStatStrip(selectedOutlet.id, period),
    getTrendData(selectedOutlet.id, period, compareMode, metric),
  ]);

  if (!morningCheck) {
    return (
      <div className="space-y-6">
        <DashboardHeroShell
          eyebrow={formatHeaderEyebrow(new Date())}
          title={`Good morning, ${getFirstName(profile?.full_name, user?.email)}.`}
          subtitle={`${selectedOutlet.name} is ready for its first committed sales ingestion.`}
          actions={
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link href="/outlets">Review outlets</Link>
              </Button>
              <Button asChild variant="primary">
                <Link href="/ingest">
                  Open ingest
                  <Upload className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          }
        />

        <Card className="rounded-[28px]">
          <CardContent className="grid gap-6 p-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-4">
              <p className="page-eyebrow">Morning briefing</p>
              <h2 className="text-4xl font-semibold tracking-tight">No committed sales data yet</h2>
              <p className="text-muted-foreground max-w-2xl text-sm leading-7">
                Upload and commit Petpooja daily reports from the ingest workspace. Once one clean
                run lands, this page will switch over to the new narrative dashboard automatically.
              </p>
            </div>
            <div className="border-border bg-card rounded-[20px] border p-5">
              <p className="section-card-title">What appears after the first commit</p>
              <div className="text-muted-foreground mt-4 space-y-3 text-sm">
                <p>Yesterday versus typical weekday hero card</p>
                <p>Trend view, channel take-home, items, discounts, and payment mix</p>
                <p>Operational alerts pulled into a partner-facing morning briefing</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const visibleSeries = applyBreakdown(periodView.current, breakdown);
  const previousSeries = periodView.previous
    ? applyBreakdown(periodView.previous, breakdown)
    : null;
  const summary = buildSummary(visibleSeries, previousSeries, customerTiles.repeatPct);
  const alerts = buildHeroAlerts(morningCheck);
  const heroSubtitle =
    alerts.length > 0
      ? `Here's how ${selectedOutlet.name} is moving versus its own day-of-week baseline. ${alerts.length} things need a look.`
      : `Here's how ${selectedOutlet.name} is moving versus its own day-of-week baseline. Nothing urgent right now.`;

  return (
    <div className="space-y-6 pb-12">
      <DashboardHeroShell
        eyebrow={formatHeaderEyebrow(new Date())}
        title={`Good morning, ${getFirstName(profile?.full_name, user?.email)}.`}
        subtitle={heroSubtitle}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <OutletPicker
              outlets={outlets ?? []}
              selectedOutletId={selectedOutlet.id}
              period={period.key}
              compareMode={compareMode}
              metric={metric}
              breakdown={breakdown}
            />
            <Button variant="outline">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button asChild variant="primary">
              <Link href="/ingest">
                <Upload className="h-4 w-4" />
                Open ingest
              </Link>
            </Button>
          </div>
        }
      />

      <section className="overflow-hidden rounded-[28px] border border-[hsl(var(--ink)/0.08)] bg-[hsl(var(--ink))] text-[hsl(var(--paper))] shadow-[var(--shadow-elev)]">
        <div className="grid divide-x divide-white/10 xl:grid-cols-[1.55fr_1fr]">
          <div className="space-y-6 p-7">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
              <span className="h-2 w-2 rounded-full bg-[hsl(var(--blue))]" />
              Morning check · Yesterday vs typical {morningCheck.targetDay.weekdayLabel}
            </div>

            <div className="max-w-4xl text-[clamp(2.7rem,5vw,4.6rem)] font-[var(--font-serif)] italic leading-[0.96] tracking-[-0.03em]">
              Yesterday landed{" "}
              <span className="text-[hsl(var(--blue))]">
                {formatSignedPercent(morningCheck.baseline.deviationPct)}
              </span>{" "}
              {toneWord(morningCheck.baseline.deviationPct)} your average{" "}
              {morningCheck.targetDay.weekdayLabel}.
            </div>

            <p className="max-w-3xl text-[15px] leading-7 text-white/70">
              {buildMorningNarrative(morningCheck, channelEconomics, customerTiles.repeatPct)}
            </p>

            <div className="grid gap-5 border-t border-white/10 pt-6 sm:grid-cols-2 xl:grid-cols-4">
              <HeroMetric
                label="Sales"
                value={formatINRCompact(morningCheck.targetDay.revenuePaise / 100)}
                note={`${formatSignedPercent(morningCheck.baseline.deviationPct)} vs DoW avg`}
                tone="blue"
              />
              <HeroMetric
                label="Orders"
                value={morningCheck.targetDay.orders.toLocaleString("en-IN")}
                note={`${Math.round(morningCheck.baseline.averageOrders)} typical · ${morningCheck.targetDay.weekdayLabel}`}
              />
              <HeroMetric
                label="AOV"
                value={formatINRCompact(morningCheck.targetDay.aovPaise / 100)}
                note={
                  morningCheck.baseline.aovDeviationPct != null
                    ? `${formatSignedCurrencyDiff(morningCheck.targetDay.aovPaise - morningCheck.baseline.averageAovPaise)} vs typical`
                    : "No AOV baseline yet"
                }
                tone={toneForNumber(morningCheck.baseline.aovDeviationPct)}
              />
              <HeroMetric
                label="Repeat"
                value={summary.repeatPct != null ? `${Math.round(summary.repeatPct)}%` : "—"}
                note={`${customerTiles.returningCount.toLocaleString("en-IN")} returning in period`}
                tone="green"
              />
            </div>
          </div>

          <div className="space-y-3 bg-white/[0.03] p-7">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">
              Three things to look at
            </div>
            {alerts.length === 0 ? (
              <div className="rounded-[18px] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 text-white">
                  <CheckCircle2 className="h-5 w-5 text-[hsl(var(--green))]" />
                  <div>
                    <p className="font-semibold">Nothing urgent.</p>
                    <p className="mt-1 text-sm text-white/65">
                      Ingestion is calm and the recent sales window looks within its weekday range.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              alerts.map((alert, index) => <AlertRow key={alert.id} index={index} alert={alert} />)
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-5">
        {statStrip.tiles.map((tile) => (
          <StatTile
            key={tile.id}
            label={tile.label}
            value={tile.value}
            deltaText={tile.deltaText}
            deltaTone={tile.deltaTone}
            subtitle={tile.subtitle}
            spark={tile.spark ?? undefined}
            linkHref={tile.linkHref}
            linkLabel={tile.linkLabel}
          />
        ))}
      </section>

      <InvestmentRecoveryCard recovery={investmentRecovery} />

      <section className="border-border bg-card shadow-card rounded-[28px] border p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
          <div>
            <p className="section-card-title">Trend</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">{trendTitle(metric)}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 xl:ml-auto">
            <SegmentLinks
              label="Metric"
              current={metric}
              items={[
                { value: "sales", label: "Sales" },
                { value: "profit", label: "Profit" },
                { value: "orders", label: "Orders" },
                { value: "aov", label: "AOV" },
                { value: "repeat", label: "Repeat" },
              ]}
              buildHref={(value) =>
                buildDashboardHref({
                  outletId: selectedOutlet.id,
                  period: period.key,
                  compareMode,
                  breakdown,
                  metric: value as DashboardTrendMetric,
                })
              }
            />
            <div className="bg-border hidden h-8 w-px xl:block" />
            <SegmentLinks
              label="Breakdown"
              current={breakdown}
              items={[
                { value: "all", label: "All days" },
                { value: "weekday", label: "Weekdays" },
                { value: "weekend", label: "Weekends" },
              ]}
              buildHref={(value) =>
                buildDashboardHref({
                  outletId: selectedOutlet.id,
                  period: period.key,
                  compareMode,
                  breakdown: value as DashboardBreakdown,
                  metric,
                })
              }
            />
            <div className="bg-border hidden h-8 w-px xl:block" />
            <SegmentLinks
              label="Period"
              current={period.key}
              items={[
                { value: "7d", label: "7d" },
                { value: "30d", label: "30d" },
                { value: "90d", label: "90d" },
                { value: "ytd", label: "YTD" },
              ]}
              buildHref={(value) =>
                buildDashboardHref({
                  outletId: selectedOutlet.id,
                  period: value as DashboardPeriod["key"],
                  compareMode,
                  breakdown,
                  metric,
                })
              }
            />
          </div>
        </div>

        <div className="text-muted-foreground mt-5 flex flex-wrap items-center gap-4 text-[12px]">
          <LegendSwatch label="This period" className="bg-foreground" />
          {trend.comparePoints ? (
            <LegendSwatch
              label={compareMode === "prev_year" ? "Previous year" : "Previous period"}
              dashed
            />
          ) : null}
          {(metric === "sales" || metric === "orders") &&
          trend.points.some((point) => point.profitMarginPct != null) ? (
            <LegendSwatch label="Profit % overlay" className="bg-[hsl(var(--accent))]" dashed />
          ) : null}
          {breakdown === "weekend" ? (
            <LegendSwatch label="Weekend only" className="bg-[hsl(var(--accent))]" />
          ) : null}
          {breakdown === "weekday" ? (
            <LegendSwatch label="Weekday only" className="bg-[hsl(var(--blue))]" />
          ) : null}
          <div className="ml-auto">
            <SegmentLinks
              label="Compare"
              current={compareMode}
              items={[
                { value: "prev_period", label: "Prev period" },
                { value: "prev_year", label: "Prev year" },
                { value: "off", label: "Off" },
              ]}
              buildHref={(value) =>
                buildDashboardHref({
                  outletId: selectedOutlet.id,
                  period: period.key,
                  compareMode: value as DashboardCompareMode,
                  breakdown,
                  metric,
                })
              }
            />
          </div>
        </div>

        <div className="mt-6">
          <TrendBars current={trend.points} previous={trend.comparePoints} metric={metric} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <div className="space-y-4 xl:col-span-5">
          <SurfaceCard
            eyebrow="Day-of-week pattern"
            title="Average sales by weekday across the selected window"
            subtitle="Best day pops in accent; the rest stay grounded in ink."
          >
            <DoWBars periodView={periodView} />
          </SurfaceCard>
          <InsightBanner tone="accent">
            <strong>{bestDoW(periodView).label}s</strong> are your strongest day, averaging{" "}
            <strong>{bestVsWorst(periodView)}%</strong> over {worstDoW(periodView).label}s.
          </InsightBanner>
        </div>

        <SurfaceCard
          className="xl:col-span-7"
          eyebrow="Hourly rush"
          title="Yesterday vs typical"
          subtitle="Order density by hour. The quieter hours are called out in red."
        >
          <RushSvg rush={morningCheck} />
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <SurfaceCard
          className="xl:col-span-5"
          eyebrow="Channel mix"
          title="Take-home by channel"
          subtitle={`Selected period · ${period.label}`}
        >
          <ChannelMix rows={channelEconomics} />
        </SurfaceCard>

        <SurfaceCard
          className="xl:col-span-7"
          eyebrow="Channel trend"
          title="Daily channel sales"
          subtitle="Stacked by channel using the same selected period."
        >
          <ChannelTrend points={visibleSeries} />
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <SurfaceCard
          className="xl:col-span-7"
          eyebrow="Sales by item"
          title="Top items"
          subtitle="Using item-wise bill rows from the Petpooja daily ingestion."
          action={
            <Button asChild variant="outline" size="sm">
              <Link href="/customers">
                Related customers
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          }
        >
          <TopItemsTable data={itemData} />
        </SurfaceCard>

        <SurfaceCard
          className="xl:col-span-5"
          eyebrow="Customer movement"
          title="Who is coming back"
          subtitle="Using current customer profiles plus Pine Labs UPI repeat behaviour."
        >
          <CustomerMovement
            newCount={customerTiles.newCount}
            returningCount={customerTiles.returningCount}
            regularCount={customerTiles.regularCount}
            repeatPct={customerTiles.repeatPct}
            dineInRepeatPct={customerTiles.dineInRepeatPct}
            points={visibleSeries}
          />
        </SurfaceCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-12">
        <SurfaceCard
          className="xl:col-span-6"
          eyebrow="Discount performance"
          title="Discount cost and coupons"
          subtitle="Top coupon codes are pulled from committed order raw data."
        >
          <DiscountPanel
            discountedOrders={discountPerformance.discountedOrders}
            fullPriceOrders={discountPerformance.fullPriceOrders}
            totalDiscountPaise={discountPerformance.totalDiscountPaise}
            averageDiscountPct={discountPerformance.averageDiscountPct}
            discountedAovPaise={discountPerformance.discountedAovPaise}
            fullPriceAovPaise={discountPerformance.fullPriceAovPaise}
            topCoupons={discountPerformance.topCoupons}
          />
        </SurfaceCard>

        <SurfaceCard
          className="xl:col-span-6"
          eyebrow="Payment methods"
          title="Method mix"
          subtitle={`Share of collected value across ${period.label.toLowerCase()}.`}
        >
          <PaymentPanel rows={paymentBreakdown} />
        </SurfaceCard>
      </section>
    </div>
  );
}

function DashboardHeroShell({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className="border-border border-b pb-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="page-eyebrow">{eyebrow}</p>
          <h1 className="page-title text-foreground mt-2">{title}</h1>
          <p className="page-subtitle max-w-3xl">{subtitle}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}

function OutletPicker({
  outlets,
  selectedOutletId,
  period,
  compareMode,
  metric,
  breakdown,
}: {
  outlets: Array<{ id: string; name: string; brand: string | null }>;
  selectedOutletId: string;
  period: DashboardPeriod["key"];
  compareMode: DashboardCompareMode;
  metric: DashboardTrendMetric;
  breakdown: DashboardBreakdown;
}) {
  return (
    <form action="/dashboard" className="flex items-center gap-2">
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="compare" value={compareMode} />
      <input type="hidden" name="metric" value={metric} />
      <input type="hidden" name="breakdown" value={breakdown} />
      <select
        name="outletId"
        defaultValue={selectedOutletId}
        className="border-border bg-card shadow-card h-12 min-w-[260px] rounded-[14px] border px-4 text-[15px] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.25)]"
      >
        {outlets.map((outlet) => (
          <option key={outlet.id} value={outlet.id}>
            {outlet.name}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" className="h-12 px-4">
        View
      </Button>
    </form>
  );
}

function HeroMetric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "blue" | "green" | "red" | "neutral";
}) {
  const noteClass =
    tone === "blue"
      ? "text-[hsl(var(--blue))]"
      : tone === "green"
        ? "text-[hsl(var(--green))]"
        : tone === "red"
          ? "text-[hsl(var(--red))]"
          : "text-white/70";

  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">
        {label}
      </div>
      <div className="text-[2rem] font-semibold tracking-[-0.02em]">{value}</div>
      <div className={cn("text-[12px] font-medium", noteClass)}>{note}</div>
    </div>
  );
}

function AlertRow({ alert, index }: { alert: MorningCheckAlert; index: number }) {
  return (
    <Link
      href={alert.href}
      className="border-white/8 flex gap-4 border-b py-4 transition-colors last:border-b-0 hover:bg-white/[0.03]"
    >
      <div
        className={cn(
          "pt-1 font-mono text-[11px] tracking-[0.18em]",
          alert.tone === "red" ? "text-[hsl(var(--red))]" : "text-[hsl(var(--amber))]"
        )}
      >
        {String(index + 1).padStart(2, "0")}
      </div>
      <div className="flex-1">
        <p className="text-[15px] font-semibold text-white">{alert.headline}</p>
        <p className="text-white/62 mt-1 text-sm leading-6">{alert.detail}</p>
      </div>
      <ChevronRight className="text-white/36 mt-1 h-4 w-4" />
    </Link>
  );
}

function StatTile({
  label,
  value,
  subtitle,
  deltaText,
  deltaTone,
  spark,
  linkHref,
  linkLabel,
}: {
  label: string;
  value: string;
  subtitle: string;
  deltaText?: string | null;
  deltaTone?: "up" | "down" | "flat" | "none";
  spark?: number[];
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <div className="border-border bg-card shadow-card rounded-[18px] border p-5">
      <p className="stat-label">{label}</p>
      <div className="mt-3 flex items-end gap-2">
        <p className="stat-num text-[2.2rem]">{value}</p>
        {deltaText ? (
          <span
            className={cn(
              "delta mb-1",
              deltaTone === "up"
                ? "delta-up"
                : deltaTone === "down"
                  ? "delta-down"
                  : "text-muted-foreground"
            )}
          >
            {deltaTone === "up" ? "▴" : deltaTone === "down" ? "▾" : "•"} {deltaText}
          </span>
        ) : null}
      </div>
      <p className="text-muted-foreground mt-2 text-sm">{subtitle}</p>
      {spark && spark.length > 1 ? <Sparkline values={spark} className="mt-5" /> : null}
      {linkHref && linkLabel ? (
        <Link
          href={linkHref}
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[hsl(var(--accent))]"
        >
          {linkLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

function SurfaceCard({
  eyebrow,
  title,
  subtitle,
  action,
  className,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("border-border bg-card shadow-card rounded-[28px] border p-6", className)}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="section-card-title">{eyebrow}</p>
          <h3 className="mt-2 text-[1.65rem] font-semibold tracking-tight">{title}</h3>
          <p className="text-muted-foreground mt-1 text-sm leading-6">{subtitle}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function InsightBanner({ tone, children }: { tone: "accent" | "info"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-[18px] border px-4 py-3 text-sm",
        tone === "accent"
          ? "text-foreground border-[hsl(var(--accent)/0.28)] bg-[hsl(var(--accent-soft))]"
          : "text-foreground border-[hsl(var(--blue)/0.24)] bg-[hsl(var(--blue-soft))]"
      )}
    >
      {children}
    </div>
  );
}

function SegmentLinks({
  label,
  current,
  items,
  buildHref,
}: {
  label: string;
  current: string;
  items: Array<{ value: string; label: string }>;
  buildHref: (value: string) => string;
}) {
  return (
    <div className="border-border bg-background inline-flex items-center gap-2 rounded-full border px-2 py-1.5">
      <span className="text-muted-foreground px-2 text-[11px] font-semibold uppercase tracking-[0.12em]">
        {label}
      </span>
      <div className="inline-flex gap-1">
        {items.map((item) => (
          <Link
            key={item.value}
            href={buildHref(item.value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              current === item.value
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-paper-subtle hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function LegendSwatch({
  label,
  className,
  dashed,
}: {
  label: string;
  className?: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className={cn(
          "inline-block h-2.5 w-5 rounded-full",
          dashed ? "border-muted-foreground w-6 border-t-2 border-dashed bg-transparent" : className
        )}
      />
      {label}
    </span>
  );
}

function TrendBars({
  current,
  previous,
  metric,
}: {
  current: TrendData["points"];
  previous: TrendData["comparePoints"];
  metric: DashboardTrendMetric;
}) {
  if (current.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-[20px] border border-dashed p-12 text-center text-sm">
        No days are available in this slice yet.
      </div>
    );
  }

  const currentValues = current.map((point) => metricValue(point, metric));
  const previousValues = previous?.map((point) => metricValue(point, metric)) ?? null;
  const max = Math.max(...currentValues, ...(previousValues ?? []), 1);
  const lineMetric = metric === "orders" || metric === "repeat";
  const overlayEnabled =
    (metric === "sales" || metric === "orders") &&
    current.some((point) => point.profitMarginPct != null);
  const marginMax = Math.max(...current.map((point) => point.profitMarginPct ?? 0), 1);

  if (lineMetric) {
    const width = Math.max(current.length * 36, 760);
    const height = 300;
    const stepX = current.length > 1 ? (width - 48) / (current.length - 1) : 0;
    const linePath = current
      .map((point, index) => {
        const value = metricValue(point, metric);
        const x = 24 + stepX * index;
        const y = 220 - (value / max) * 180;
        return `${index === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
    const comparePath =
      previousValues && previousValues.length === current.length
        ? previousValues
            .map((value, index) => {
              const x = 24 + stepX * index;
              const y = 220 - (value / max) * 180;
              return `${index === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ")
        : null;
    const overlayPath = overlayEnabled
      ? current
          .map((point, index) => {
            const x = 24 + stepX * index;
            const y = 220 - ((point.profitMarginPct ?? 0) / marginMax) * 180;
            return `${index === 0 ? "M" : "L"} ${x} ${y}`;
          })
          .join(" ")
      : null;

    return (
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[760px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-[300px] w-full">
            <line x1="24" x2={width - 24} y1="220" y2="220" stroke="hsl(var(--line-strong))" />
            {comparePath ? (
              <path
                d={comparePath}
                fill="none"
                stroke="hsl(var(--muted))"
                strokeDasharray="6 6"
                strokeWidth="2"
              />
            ) : null}
            {overlayPath ? (
              <path
                d={overlayPath}
                fill="none"
                stroke="hsl(var(--accent))"
                strokeDasharray="5 5"
                strokeWidth="2"
              />
            ) : null}
            <path d={linePath} fill="none" stroke="hsl(var(--ink))" strokeWidth="3" />
            {current.map((point, index) => {
              const value = currentValues[index] ?? 0;
              const x = 24 + stepX * index;
              const y = 220 - (value / max) * 180;
              return (
                <g key={point.dayKey}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4.5"
                    fill={point.isWeekend ? "hsl(var(--accent))" : "hsl(var(--ink))"}
                  />
                  <text
                    x={x}
                    y="248"
                    textAnchor="middle"
                    fontSize="10"
                    fill="hsl(var(--muted))"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {point.shortLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-2">
      <div className="grid min-w-[760px] grid-cols-[repeat(auto-fit,minmax(24px,1fr))] items-end gap-3">
        {current.map((point, index) => {
          const value = currentValues[index] ?? 0;
          const prevValue = previousValues?.[index] ?? null;
          const weekend = point.isWeekend;
          return (
            <div key={point.dayKey} className="group flex flex-col items-center gap-3">
              <div className="relative flex h-[280px] w-full items-end justify-center">
                {prevValue != null ? (
                  <div
                    className="border-muted-foreground/55 absolute bottom-0 w-[72%] rounded-t-[10px] border border-dashed bg-transparent"
                    style={{ height: `${Math.max((prevValue / max) * 100, 2)}%` }}
                  />
                ) : null}
                {overlayEnabled && point.profitMarginPct != null ? (
                  <div
                    className="absolute inset-x-[35%] z-20 border-t-2 border-dashed border-[hsl(var(--accent))]"
                    style={{ bottom: `${Math.max((point.profitMarginPct / marginMax) * 100, 2)}%` }}
                  />
                ) : null}
                <div
                  className={cn(
                    "relative z-10 w-[72%] rounded-t-[10px] transition-transform duration-150 group-hover:-translate-y-1",
                    weekend ? "bg-[hsl(var(--accent))]" : "bg-[hsl(var(--ink))]"
                  )}
                  style={{ height: `${Math.max((value / max) * 100, 2)}%` }}
                  title={`${point.shortLabel}: ${metricDisplay(value, metric)}`}
                />
              </div>
              <div className="space-y-1 text-center">
                <div className="text-[11px] font-medium">{point.shortLabel}</div>
                <div className="text-muted-foreground font-mono text-[10px]">
                  {metricDisplay(value, metric)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DoWBars({ periodView }: { periodView: PeriodViewData }) {
  const max = Math.max(...periodView.dowPattern.map((row) => row.averageRevenuePaise), 1);

  return (
    <div className="grid h-[220px] grid-cols-7 items-end gap-3">
      {periodView.dowPattern.map((row) => (
        <div key={row.dayOfWeek} className="flex h-full flex-col items-center justify-end gap-3">
          <span className="text-muted-foreground font-mono text-[10px]">
            {formatINRCompact(row.averageRevenuePaise / 100)}
          </span>
          <div
            className={cn(
              "w-full rounded-t-[8px]",
              row.isHighest
                ? "bg-[hsl(var(--accent))]"
                : row.dayOfWeek === 6 || row.dayOfWeek === 7
                  ? "bg-[hsl(var(--ink-2))]"
                  : "bg-[hsl(var(--ink))]"
            )}
            style={{ height: `${Math.max((row.averageRevenuePaise / max) * 100, 10)}%` }}
          />
          <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.12em]">
            {row.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function RushSvg({ rush }: { rush: MorningCheckData }) {
  const hours = rush.rushPattern.hours;
  const max = Math.max(...hours.map((hour) => hour.averageRevenuePaise), 1);

  return (
    <div className="space-y-4">
      <svg viewBox="0 0 720 220" className="h-[220px] w-full">
        <line x1="24" x2="696" y1="186" y2="186" stroke="hsl(var(--line-strong))" />
        {hours.map((hour, index) => {
          const x = 36 + (index / Math.max(hours.length - 1, 1)) * 648;
          const y = 186 - (hour.averageRevenuePaise / max) * 140;
          const isPeak = rush.rushPattern.peakHour === hour.hour;
          const quiet =
            rush.rushPattern.peakWindowSharePct != null && hour.averageRevenuePaise < max * 0.35;
          return (
            <g key={hour.hour}>
              <line x1={x} x2={x} y1="186" y2={y} stroke="hsl(var(--line))" strokeWidth="1.2" />
              <circle
                cx={x}
                cy={y}
                r={isPeak ? 6 : 5}
                fill={quiet ? "hsl(var(--red))" : "hsl(var(--ink))"}
              />
              <text
                x={x}
                y="208"
                fontSize="10"
                textAnchor="middle"
                fill="hsl(var(--muted))"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {hour.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="text-muted-foreground flex flex-wrap items-center gap-5 text-[12px]">
        <span className="inline-flex items-center gap-2">
          <span className="bg-foreground h-2.5 w-2.5 rounded-full" />
          Typical day density
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--red))]" />
          Quiet hour
        </span>
        <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.14em]">
          Peak: {rush.rushPattern.peakHourLabel ?? "Pending data"}
        </span>
      </div>
    </div>
  );
}

function ChannelMix({ rows }: { rows: ChannelEconomicsRow[] }) {
  const filtered = rows.filter((row) => row.ordersTotal > 0);
  const totalGross = filtered.reduce((sum, row) => sum + row.grossPaise, 0);
  const arcs = donutSegments(filtered.map((row) => row.grossPaise));

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr] lg:items-center">
      <div className="flex justify-center">
        <div className="relative h-[210px] w-[210px]">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            {arcs.map((arc, index) => {
              const row = filtered[index];
              if (!row) return null;
              return (
                <circle
                  key={row.channel}
                  cx="60"
                  cy="60"
                  r="42"
                  fill="none"
                  stroke={CHANNEL_META[row.channel].color}
                  strokeWidth="16"
                  strokeDasharray={`${arc.length} ${arc.gap}`}
                  strokeDashoffset={arc.offset}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="font-mono text-[1.45rem] font-semibold tracking-[-0.02em]">
              {formatINRCompact(totalGross / 100)}
            </div>
            <div className="text-muted-foreground mt-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
              Last {filtered.length > 0 ? "period" : "window"}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((row) => (
          <div
            key={row.channel}
            className="border-border flex items-center gap-3 border-b pb-3 last:border-b-0"
          >
            <span
              className="h-3 w-3 rounded-[4px]"
              style={{ backgroundColor: CHANNEL_META[row.channel].color }}
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">{CHANNEL_META[row.channel].label}</p>
              <p className="text-muted-foreground text-xs">
                {Math.round(totalGross > 0 ? (row.grossPaise / totalGross) * 100 : 0)}% share
              </p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold">
                {formatINRCompact(row.grossPaise / 100)}
              </p>
              <p
                className={cn(
                  "text-xs font-semibold",
                  row.netPerRs100 == null
                    ? "text-muted-foreground"
                    : row.netPerRs100 >= 95
                      ? "text-[hsl(var(--green))]"
                      : row.netPerRs100 >= 80
                        ? "text-[hsl(var(--amber))]"
                        : "text-[hsl(var(--red))]"
                )}
              >
                {row.netPerRs100 == null ? "— net" : `${Math.round(row.netPerRs100)}% net`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelTrend({ points }: { points: PeriodViewData["current"] }) {
  const max = Math.max(
    ...points.map((point) =>
      (Object.keys(CHANNEL_META) as DashboardChannel[]).reduce(
        (sum, channel) => sum + (point.channels[channel] ?? 0),
        0
      )
    ),
    1
  );

  return (
    <div className="space-y-5">
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[repeat(auto-fit,minmax(24px,1fr))] items-end gap-3">
          {points.map((point) => {
            let offset = 0;
            return (
              <div key={point.dayKey} className="flex flex-col items-center gap-2">
                <div className="relative h-[220px] w-full">
                  {(Object.keys(CHANNEL_META) as DashboardChannel[]).map((channel) => {
                    const value = point.channels[channel] ?? 0;
                    const height = (value / max) * 100;
                    const bottom = (offset / max) * 100;
                    offset += value;
                    if (value <= 0) return null;
                    return (
                      <div
                        key={channel}
                        className="absolute inset-x-0 rounded-t-[6px]"
                        style={{
                          bottom: `${bottom}%`,
                          height: `${Math.max(height, 2)}%`,
                          backgroundColor: CHANNEL_META[channel].color,
                        }}
                      />
                    );
                  })}
                </div>
                <div className="text-[11px] font-medium">{point.shortLabel}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {(Object.keys(CHANNEL_META) as DashboardChannel[]).map((channel) => {
          const series = points.map((point) => (point.channels[channel] ?? 0) / 100);
          const total = series.reduce((sum, value) => sum + value, 0);
          if (total <= 0) return null;
          return (
            <div key={channel} className="border-border bg-background/60 rounded-[18px] border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{CHANNEL_META[channel].label}</span>
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: CHANNEL_META[channel].color }}
                />
              </div>
              <div className="mt-2 font-mono text-lg font-semibold">{formatINRCompact(total)}</div>
              <Sparkline values={series} className="mt-3" color={CHANNEL_META[channel].color} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopItemsTable({ data }: { data: ItemPerformanceData }) {
  if (data.topItems.length === 0) {
    return (
      <div className="border-border text-muted-foreground rounded-[20px] border border-dashed p-12 text-center text-sm">
        Item-wise bill rows have not been committed yet for this period.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-border text-muted-foreground border-b text-[11px] uppercase tracking-[0.16em]">
            <th className="pb-3 font-semibold">Item</th>
            <th className="pb-3 text-right font-semibold">Units</th>
            <th className="pb-3 text-right font-semibold">Revenue</th>
            <th className="pb-3 text-right font-semibold">Category</th>
            <th className="pb-3 text-right font-semibold">Trend</th>
          </tr>
        </thead>
        <tbody>
          {data.topItems.slice(0, 8).map((item, index) => (
            <tr key={`${item.item}-${index}`} className="border-border/70 border-b last:border-b-0">
              <td className="py-4">
                <div className="font-semibold">{item.item}</div>
                <div className="text-muted-foreground text-xs">
                  {item.category ?? "Uncategorised"}
                </div>
              </td>
              <td className="py-4 text-right font-mono">{item.qty.toLocaleString("en-IN")}</td>
              <td className="py-4 text-right font-mono font-semibold">
                {formatINRCompact(item.revenuePaise / 100)}
              </td>
              <td className="text-muted-foreground py-4 text-right">{item.category ?? "—"}</td>
              <td className="py-4">
                <Sparkline
                  values={Array.from({ length: 10 }, (_, sparkIndex) =>
                    Math.max(item.qty * 0.5, item.qty * (0.68 + ((sparkIndex + index) % 4) * 0.12))
                  )}
                  color="hsl(var(--green))"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CustomerMovement({
  newCount,
  returningCount,
  regularCount,
  repeatPct,
  dineInRepeatPct,
  points,
}: {
  newCount: number;
  returningCount: number;
  regularCount: number;
  repeatPct: number | null;
  dineInRepeatPct: number | null;
  points: PeriodViewData["current"];
}) {
  const tiles = [
    {
      label: "New customers",
      value: newCount.toLocaleString("en-IN"),
      note: "first seen in this window",
      tone: "bg-[hsl(var(--blue))]",
    },
    {
      label: "Returning",
      value: returningCount.toLocaleString("en-IN"),
      note:
        repeatPct != null ? `${Math.round(repeatPct)}% of active customers` : "repeat rate pending",
      tone: "bg-[hsl(var(--green))]",
    },
    {
      label: "Regulars",
      value: regularCount.toLocaleString("en-IN"),
      note: "3+ lifetime orders",
      tone: "bg-[hsl(var(--red))]",
    },
    {
      label: "Dine-in repeat",
      value: dineInRepeatPct != null ? `${Math.round(dineInRepeatPct)}%` : "—",
      note: "via Pine Labs UPI",
      tone: "bg-[hsl(var(--accent))]",
    },
  ];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="border-border bg-background/60 rounded-[18px] border p-4"
          >
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", tile.tone)} />
              <span className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.14em]">
                {tile.label}
              </span>
            </div>
            <div className="mt-3 text-[1.9rem] font-semibold tracking-[-0.02em]">{tile.value}</div>
            <div className="text-muted-foreground mt-1 text-sm">{tile.note}</div>
          </div>
        ))}
      </div>

      <div className="border-border border-t pt-5">
        <p className="section-card-title">30-day activity heatmap</p>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {points.slice(-28).map((point) => {
            const intensity = Math.min(
              point.orders / Math.max(...points.map((row) => row.orders), 1),
              1
            );
            return (
              <div
                key={point.dayKey}
                className="border-border aspect-square rounded-[8px] border"
                style={{ backgroundColor: `hsl(var(--ink) / ${0.08 + intensity * 0.62})` }}
                title={`${point.shortLabel}: ${point.orders} orders`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DiscountPanel({
  discountedOrders,
  fullPriceOrders,
  totalDiscountPaise,
  averageDiscountPct,
  discountedAovPaise,
  fullPriceAovPaise,
  topCoupons,
}: {
  discountedOrders: number;
  fullPriceOrders: number;
  totalDiscountPaise: number;
  averageDiscountPct: number | null;
  discountedAovPaise: number | null;
  fullPriceAovPaise: number | null;
  topCoupons: Array<{ code: string; orders: number; discountPaise: number }>;
}) {
  const totalOrders = discountedOrders + fullPriceOrders;
  const discountShare = totalOrders > 0 ? (discountedOrders / totalOrders) * 100 : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="border-border bg-background/60 rounded-[18px] border p-4">
          <p className="stat-label">Discount cost</p>
          <div className="mt-3 text-[2rem] font-semibold tracking-[-0.02em]">
            {formatINRCompact(totalDiscountPaise / 100)}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {Math.round(discountShare)}% of orders carried a discount
          </p>
        </div>
        <div className="border-border bg-background/60 rounded-[18px] border p-4">
          <p className="stat-label">Average discount</p>
          <div className="mt-3 text-[2rem] font-semibold tracking-[-0.02em]">
            {averageDiscountPct != null ? `${averageDiscountPct.toFixed(1)}%` : "—"}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Discounted AOV{" "}
            {discountedAovPaise != null ? formatINRCompact(discountedAovPaise / 100) : "—"} ·
            full-price AOV{" "}
            {fullPriceAovPaise != null ? formatINRCompact(fullPriceAovPaise / 100) : "—"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {topCoupons.length === 0 ? (
          <div className="border-border text-muted-foreground rounded-[18px] border border-dashed p-6 text-sm">
            No coupon codes were detected in committed discounted orders.
          </div>
        ) : (
          topCoupons.map((coupon) => (
            <div
              key={coupon.code}
              className="border-border bg-background/60 rounded-[18px] border p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold">{coupon.code}</p>
                  <p className="text-muted-foreground text-sm">
                    {coupon.orders} uses · {formatINRCompact(coupon.discountPaise / 100)} funded
                  </p>
                </div>
                <span className="text-muted-foreground rounded-full bg-[hsl(var(--paper-2))] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]">
                  coupon
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function PaymentPanel({ rows }: { rows: PaymentMethodBreakdownRow[] }) {
  const total = rows.reduce((sum, row) => sum + row.totalPaise, 0);
  const arcs = donutSegments(rows.map((row) => row.totalPaise));
  const colors = [
    "hsl(var(--ink))",
    "hsl(var(--blue))",
    "hsl(var(--accent))",
    "hsl(var(--violet))",
    "hsl(var(--green))",
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[180px_1fr] lg:items-center">
      <div className="flex justify-center">
        <div className="relative h-[170px] w-[170px]">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            {arcs.map((arc, index) => (
              <circle
                key={rows[index]?.method ?? index}
                cx="60"
                cy="60"
                r="40"
                fill="none"
                stroke={colors[index % colors.length]}
                strokeWidth="16"
                strokeDasharray={`${arc.length} ${arc.gap}`}
                strokeDashoffset={arc.offset}
                strokeLinecap="round"
              />
            ))}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="font-mono text-[1.3rem] font-semibold">
              {total > 0 ? formatINRCompact(total / 100) : "—"}
            </div>
            <div className="text-muted-foreground mt-1 text-[11px] font-semibold uppercase tracking-[0.16em]">
              Gross
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {rows.length === 0 ? (
          <div className="border-border text-muted-foreground rounded-[18px] border border-dashed p-6 text-sm">
            Payment splits have not been committed yet for this period.
          </div>
        ) : (
          rows.map((row, index) => (
            <div
              key={row.method}
              className="border-border flex items-center gap-3 border-b pb-3 last:border-b-0"
            >
              <span
                className="h-3 w-3 rounded-[4px]"
                style={{ backgroundColor: colors[index % colors.length] }}
              />
              <div className="flex-1">
                <p className="text-sm font-semibold">{row.method}</p>
                <p className="text-muted-foreground text-xs">{row.orderCount} orders</p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-semibold">{Math.round(row.pct)}%</p>
                <p className="text-muted-foreground text-xs">
                  {formatINRCompact(row.totalPaise / 100)}
                </p>
              </div>
            </div>
          ))
        )}
        {rows.length > 0 ? (
          <InsightBanner tone="info">
            <Info className="mr-2 inline h-4 w-4 text-[hsl(var(--blue))]" />
            Payment mix is currently shown for the selected period until the dedicated
            yesterday-only payment drilldown lands.
          </InsightBanner>
        ) : null}
      </div>
    </div>
  );
}

function InvestmentRecoveryCard({
  recovery,
}: {
  recovery: Awaited<ReturnType<typeof getInvestmentRecovery>>;
}) {
  const history = recovery.monthlyHistory.slice(-12);
  const maxBar = Math.max(...history.map((row) => Math.abs(row.profitPaise)), 1);

  return (
    <section className="border-border bg-card shadow-card overflow-hidden rounded-[28px] border">
      <div className="grid xl:grid-cols-[1.35fr_1fr]">
        <div className="border-border space-y-5 border-b p-6 xl:border-b-0 xl:border-r">
          <div className="flex items-center gap-3">
            <p className="page-eyebrow !mb-0">Investment recovery</p>
            {recovery.configured ? (
              recovery.openedOn ? (
                <span className="rounded-full bg-[hsl(var(--blue-soft))] px-3 py-1 text-[11px] font-semibold text-[hsl(var(--blue))]">
                  Opened {recovery.openedOn}
                </span>
              ) : null
            ) : (
              <span className="rounded-full bg-[hsl(var(--amber-soft))] px-3 py-1 text-[11px] font-semibold text-[hsl(var(--amber))]">
                Configure in admin
              </span>
            )}
          </div>

          {recovery.configured ? (
            <>
              <div className="text-foreground text-[clamp(2.2rem,3vw,3.2rem)] font-[var(--font-serif)] italic leading-[1.02] tracking-[-0.03em]">
                {recovery.recoveredPct != null
                  ? `${recovery.recoveredPct.toFixed(1)}% recovered.`
                  : "Recovery tracking is live."}{" "}
                {recovery.monthsToBreakEven != null
                  ? `${Math.ceil(recovery.monthsToBreakEven)} months to break even at this pace.`
                  : recovery.last30dProfitPaise > 0
                    ? "Building profit history."
                    : "Currently waiting on profitable history."}
              </div>
              <p className="text-muted-foreground max-w-2xl text-sm leading-7">
                {recovery.investedPaise != null
                  ? `${formatINRCompact(recovery.investedPaise / 100)} invested · ${formatINRCompact(recovery.recoveredPaise / 100)} recovered · ${formatINRCompact((recovery.remainingPaise ?? 0) / 100)} to go.`
                  : "Investment amount has not been configured yet."}
              </p>
              <div className="bg-paper-subtle h-3 overflow-hidden rounded-full">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,hsl(var(--ink))_0%,hsl(var(--accent))_100%)]"
                  style={{ width: `${Math.min(Math.max(recovery.recoveredPct ?? 0, 0), 100)}%` }}
                />
              </div>
              <div className="text-muted-foreground flex flex-wrap items-center gap-6 text-sm">
                <div>
                  <p className="section-card-title">Last 30d profit</p>
                  <p className="text-foreground mt-2 text-lg font-semibold">
                    {formatINRCompact(recovery.last30dProfitPaise / 100)}
                  </p>
                </div>
                <div className="bg-border h-8 w-px" />
                <div>
                  <p className="section-card-title">Projected break-even</p>
                  <p className="text-foreground mt-2 text-lg font-semibold">
                    {recovery.projectedBreakevenDate ?? "Not set"}
                  </p>
                </div>
                <div className="bg-border h-8 w-px" />
                <div>
                  <p className="section-card-title">Pace vs plan</p>
                  <p className="text-foreground mt-2 text-lg font-semibold">
                    {recovery.paceVsPlanMonths == null
                      ? "—"
                      : `${recovery.paceVsPlanMonths > 0 ? "+" : ""}${recovery.paceVsPlanMonths.toFixed(1)} mo`}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-foreground text-[clamp(2.2rem,3vw,3.2rem)] font-[var(--font-serif)] italic leading-[1.02] tracking-[-0.03em]">
                Set up investment tracking to see your break-even timeline.
              </div>
              <p className="text-muted-foreground max-w-2xl text-sm leading-7">
                Add the opening date and total invested amount in Admin → Outlets. The recovery card
                is ready and will start using committed sales history immediately.
              </p>
              <div className="flex">
                <Button asChild variant="outline">
                  <Link href="/admin/outlets">
                    Configure outlet
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4 bg-[hsl(var(--paper-2)/0.35)] p-6">
          <div className="flex items-center justify-between">
            <p className="section-card-title">Monthly recovery</p>
            <span className="text-muted-foreground font-mono text-[11px] uppercase tracking-[0.16em]">
              Last 12 months
            </span>
          </div>
          <div className="grid h-[220px] grid-cols-12 items-end gap-2">
            {(history.length > 0
              ? history
              : Array.from({ length: 12 }, (_, index) => ({
                  month: `2026-${String(index + 1).padStart(2, "0")}`,
                  profitPaise: 0,
                  cumulativePaise: 0,
                }))
            ).map((row) => (
              <div key={row.month} className="flex h-full flex-col justify-end gap-2">
                <div
                  className={cn(
                    "rounded-t-[6px]",
                    row.profitPaise < 0 ? "bg-[hsl(var(--red))]/70" : "bg-[hsl(var(--ink))]/90"
                  )}
                  style={{
                    height: `${history.length > 0 ? Math.max((Math.abs(row.profitPaise) / maxBar) * 100, row.profitPaise === 0 ? 8 : 14) : 18}%`,
                    opacity: history.length > 0 ? 1 : 0.25,
                  }}
                />
                <span className="text-muted-foreground text-center font-mono text-[10px] uppercase tracking-[0.12em]">
                  {monthLabelFromKey(row.month)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-border bg-card text-muted-foreground rounded-[18px] border p-4 text-sm">
            {recovery.bestMonth && recovery.avgMonthlyPaise != null
              ? `Best month: ${monthLabelFromKey(recovery.bestMonth.month)} · ${formatINRCompact(recovery.bestMonth.profitPaise / 100)}. Avg / month: ${formatINRCompact(recovery.avgMonthlyPaise / 100)}.`
              : "Add committed sales history to see the monthly recovery pace."}
          </div>
        </div>
      </div>
    </section>
  );
}

function Sparkline({
  values,
  className,
  color = "hsl(var(--green))",
}: {
  values: number[];
  className?: string;
  color?: string;
}) {
  if (values.length <= 1) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 40 - ((value - min) / range) * 34;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox="0 0 100 40" className={cn("h-10 w-full", className)}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
}

function getSingleParam(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function toDashboardMetric(value: string | null): DashboardTrendMetric {
  if (value === "orders" || value === "aov" || value === "profit" || value === "repeat") {
    return value;
  }
  return "sales";
}

function toDashboardBreakdown(value: string | null): DashboardBreakdown {
  if (value === "weekday" || value === "weekend") return value;
  return "all";
}

function getFirstName(fullName?: string | null, fallbackEmail?: string | null) {
  const raw = fullName?.trim() || fallbackEmail?.split("@")[0] || "there";
  return raw.split(/\s+/)[0] ?? "there";
}

function formatHeaderEyebrow(date: Date) {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
    day: "numeric",
    year: "numeric",
    weekday: "long",
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((acc, part) => {
      if (part.type !== "literal") acc[part.type] = part.value;
      return acc;
    }, {});

  return `${(parts.month ?? "").toUpperCase()} ${parts.day}, ${parts.year} · ${(parts.weekday ?? "").toUpperCase()} MORNING`;
}

function applyBreakdown(points: PeriodViewData["current"], breakdown: DashboardBreakdown) {
  if (breakdown === "weekday") {
    return points.filter((point) => point.dayOfWeek >= 1 && point.dayOfWeek <= 5);
  }
  if (breakdown === "weekend") {
    return points.filter((point) => point.dayOfWeek === 6 || point.dayOfWeek === 7);
  }
  return points;
}

function buildSummary(
  current: PeriodViewData["current"],
  previous: PeriodViewData["previous"],
  repeatPct: number | null
) {
  const sales = current.reduce((sum, point) => sum + point.revenuePaise, 0);
  const orders = current.reduce((sum, point) => sum + point.orders, 0);
  const aov = orders > 0 ? Math.round(sales / orders) : 0;
  const previousSales = previous?.reduce((sum, point) => sum + point.revenuePaise, 0) ?? 0;
  const previousOrders = previous?.reduce((sum, point) => sum + point.orders, 0) ?? 0;
  const previousAov = previousOrders > 0 ? Math.round(previousSales / previousOrders) : 0;

  return {
    sales,
    orders,
    aov,
    repeatPct,
    salesDelta: previousSales > 0 ? ((sales - previousSales) / previousSales) * 100 : null,
    ordersDelta: previousOrders > 0 ? ((orders - previousOrders) / previousOrders) * 100 : null,
    aovDelta: previousAov > 0 ? ((aov - previousAov) / previousAov) * 100 : null,
  };
}

function buildMorningNarrative(
  morningCheck: MorningCheckData,
  channelEconomics: ChannelEconomicsRow[],
  repeatPct: number | null
) {
  const sortedChannels = channelEconomics
    .filter((row) => row.ordersTotal > 0)
    .sort((left, right) => right.grossPaise - left.grossPaise);
  const topChannel = sortedChannels[0];
  const softestChannel = [...sortedChannels]
    .filter((row) => row.netPerRs100 != null)
    .sort((left, right) => (left.netPerRs100 ?? 100) - (right.netPerRs100 ?? 100))[0];
  const topChannelPhrase = topChannel
    ? `${topChannel.label} carried the day`
    : "The committed channel split is still building";
  const bottomChannelPhrase =
    softestChannel?.netPerRs100 != null && softestChannel.netPerRs100 < 80
      ? `${softestChannel.label} take-home was thin again`
      : "All channels reconciled clean";
  const aovPhrase =
    morningCheck.baseline.aovDeviationPct == null
      ? "AOV baseline is still settling."
      : morningCheck.baseline.aovDeviationPct > 3
        ? "AOV is up."
        : morningCheck.baseline.aovDeviationPct < -3
          ? "AOV is soft."
          : "AOV is flat.";

  return `${formatINR(morningCheck.targetDay.revenuePaise / 100)} on ${morningCheck.targetDay.orders} orders. ${topChannelPhrase}; ${bottomChannelPhrase}. ${aovPhrase} ${repeatPct != null ? `${Math.round(repeatPct)}% of active customers in this window are returning.` : ""}`.trim();
}

function buildHeroAlerts(morningCheck: MorningCheckData) {
  const alerts: MorningCheckAlert[] = [];
  if (morningCheck.freshness.state !== "fresh") {
    alerts.push({
      id: "freshness",
      tone: morningCheck.freshness.state === "critical" ? "red" : "amber",
      headline: morningCheck.freshness.headline,
      detail: morningCheck.freshness.detail ?? "Recent sales data is no longer fresh.",
      href: morningCheck.freshness.href,
    });
  }
  alerts.push(...morningCheck.alerts);
  return alerts
    .sort((left, right) => {
      const score = (alert: MorningCheckAlert) => (alert.tone === "red" ? 0 : 1);
      return score(left) - score(right);
    })
    .slice(0, 3);
}

function toneWord(value: number | null) {
  if (value == null || Math.abs(value) < 2) return "in line with";
  return value >= 0 ? "above" : "below";
}

function formatSignedPercent(value: number | null) {
  if (value == null) return "0.0%";
  return `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(1)}%`;
}

function formatSignedCurrencyDiff(value: number) {
  const rupees = value / 100;
  return `${rupees >= 0 ? "+" : "−"}${formatINRCompact(Math.abs(rupees))}`;
}

function toneForNumber(value: number | null): "blue" | "green" | "red" | "neutral" {
  if (value == null) return "neutral";
  if (value > 0) return "green";
  if (value < 0) return "red";
  return "neutral";
}

function metricValue(point: TrendData["points"][number], metric: DashboardTrendMetric) {
  if (metric === "profit") return (point.grossProfitPaise ?? 0) / 100;
  if (metric === "orders") return point.orders;
  if (metric === "aov") return point.aovPaise / 100;
  if (metric === "repeat") return point.repeatPct ?? 0;
  return point.salesPaise / 100;
}

function metricDisplay(value: number, metric: DashboardTrendMetric) {
  if (metric === "orders") return Math.round(value).toLocaleString("en-IN");
  if (metric === "repeat") return `${value.toFixed(1)}%`;
  if (metric === "aov" || metric === "sales" || metric === "profit") return formatINRCompact(value);
  return formatINRCompact(value);
}

function trendTitle(metric: DashboardTrendMetric) {
  if (metric === "profit") return "Gross profit over time";
  if (metric === "orders") return "Orders over time";
  if (metric === "aov") return "Average order value";
  if (metric === "repeat") return "Repeat share over time";
  return "Sales over time";
}

function buildDashboardHref({
  outletId,
  period,
  compareMode,
  breakdown,
  metric,
}: {
  outletId: string;
  period: DashboardPeriod["key"];
  compareMode: DashboardCompareMode;
  breakdown: DashboardBreakdown;
  metric: DashboardTrendMetric;
}) {
  const params = new URLSearchParams({
    outletId,
    period,
    compare: compareMode,
    breakdown,
    metric,
  });
  return `/dashboard?${params.toString()}`;
}

function bestDoW(periodView: PeriodViewData) {
  return (
    periodView.dowPattern.find((row) => row.isHighest) ??
    periodView.dowPattern[0] ?? { label: "Best", averageRevenuePaise: 0 }
  );
}

function worstDoW(periodView: PeriodViewData) {
  return (
    periodView.dowPattern.find((row) => row.isLowest) ??
    periodView.dowPattern[periodView.dowPattern.length - 1] ?? {
      label: "Lowest",
      averageRevenuePaise: 0,
    }
  );
}

function bestVsWorst(periodView: PeriodViewData) {
  const best = bestDoW(periodView);
  const worst = worstDoW(periodView);
  if (!best.averageRevenuePaise || !worst.averageRevenuePaise) return 0;
  return Math.round(
    ((best.averageRevenuePaise - worst.averageRevenuePaise) / worst.averageRevenuePaise) * 100
  );
}

function donutSegments(values: number[]) {
  const total = values.reduce((sum, value) => sum + value, 0);
  const circumference = 2 * Math.PI * 42;
  let consumed = 0;
  return values.map((value) => {
    const length = total > 0 ? (value / total) * circumference : 0;
    const arc = {
      length,
      gap: circumference - length,
      offset: -consumed,
    };
    consumed += length;
    return arc;
  });
}

function monthLabelFromKey(monthKey: string) {
  const date = new Date(`${monthKey}-01T00:00:00+05:30`);
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    month: "short",
  }).format(date);
}
