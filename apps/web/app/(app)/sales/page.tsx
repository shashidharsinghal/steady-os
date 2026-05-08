import { redirect } from "next/navigation";
import { BarChart3, Flame, LineChart, Search } from "lucide-react";
import { formatDate, formatINR, formatINRCompact } from "@stride-os/shared";
import { Button, Card, CardContent } from "@stride-os/ui";
import { cn } from "@stride-os/ui/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { createClient } from "@/lib/supabase/server";
import { resolveDashboardPeriod, type DashboardChannel } from "../dashboard/_lib/dashboard";
import {
  getChannelEconomicsDetail,
  getDailySummary,
  getHourlyHeatmap,
  getItemPerformance,
  listSalesCategories,
  type ChannelEconomicsDetailRow,
  type DailySummaryRow,
  type HeatmapCell,
  type ItemPerformanceRow,
} from "./_lib/sales";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const channels: Array<{ value: DashboardChannel | ""; label: string }> = [
  { value: "", label: "All channels" },
  { value: "dine_in", label: "Dine in" },
  { value: "takeaway", label: "Takeaway" },
  { value: "swiggy", label: "Swiggy" },
  { value: "zomato", label: "Zomato" },
  { value: "other", label: "Other" },
];

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function money(paise: number) {
  return formatINR(paise / 100);
}

function pct(value: number | null) {
  return value == null ? "—" : `${value.toFixed(1)}%`;
}

export default async function SalesPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: outlets } = await supabase
    .from("outlets")
    .select("id, name")
    .is("archived_at", null)
    .order("name");

  const selectedOutletId = param(params.outletId) ?? outlets?.[0]?.id ?? null;
  if (!selectedOutletId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Sales"
          title="Sales analytics"
          subtitle="Create an outlet first so the analytics page has data to inspect."
        />
      </div>
    );
  }

  const selectedOutlet =
    outlets?.find((outlet) => outlet.id === selectedOutletId) ?? outlets?.[0] ?? null;
  if (!selectedOutlet) redirect("/outlets");

  const period = resolveDashboardPeriod(params);
  const category = param(params.category) ?? "";
  const channel = param(params.channel) ?? "";
  const search = param(params.q) ?? param(params.item) ?? "";

  const [daily, categories, items, heatmap, channelsDetail] = await Promise.all([
    getDailySummary(selectedOutlet.id, period),
    listSalesCategories(selectedOutlet.id, period),
    getItemPerformance(selectedOutlet.id, period, { category, channel, search }),
    getHourlyHeatmap(selectedOutlet.id, period),
    getChannelEconomicsDetail(selectedOutlet.id, period),
  ]);

  const totalRevenue = daily.reduce((sum, row) => sum + row.revenuePaise, 0);
  const totalOrders = daily.reduce((sum, row) => sum + row.orders, 0);
  const bestDay = daily.reduce<DailySummaryRow | null>(
    (best, row) => (!best || row.revenuePaise > best.revenuePaise ? row : best),
    null
  );
  const worstDay = daily.reduce<DailySummaryRow | null>(
    (worst, row) => (!worst || row.revenuePaise < worst.revenuePaise ? row : worst),
    null
  );

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow={`Sales · ${selectedOutlet.name}`}
        title="Deep-dive analytics."
        subtitle="Daily revenue, item performance, hourly demand, and channel take-home in one working view."
        actions={<PeriodForm outletId={selectedOutlet.id} params={params} />}
      />

      <section className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatINRCompact(totalRevenue / 100)}
          note={period.label}
        />
        <StatCard
          label="Orders"
          value={totalOrders.toLocaleString("en-IN")}
          note="Successful orders"
        />
        <StatCard
          label="AOV"
          value={totalOrders > 0 ? money(Math.round(totalRevenue / totalOrders)) : "—"}
          note="Across period"
        />
        <StatCard
          label="Best day"
          value={bestDay ? formatDate(bestDay.dayKey, "dd MMM") : "—"}
          note={bestDay ? money(bestDay.revenuePaise) : "No sales"}
          tone="green"
        />
      </section>

      <Card>
        <CardContent className="p-0">
          <SectionHeader icon={LineChart} eyebrow="Daily summary" title="Revenue by day" />
          <DailyRevenueChart rows={daily} />
          <DailySummaryTable rows={daily} bestDay={bestDay?.dayKey} worstDay={worstDay?.dayKey} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="border-border flex flex-wrap items-center justify-between gap-4 border-b p-5">
            <div>
              <p className="page-eyebrow">Item analysis</p>
              <h2 className="section-card-title">Item performance</h2>
            </div>
            <ItemFilterForm
              outletId={selectedOutlet.id}
              periodKey={period.key}
              category={category}
              channel={channel}
              search={search}
              categories={categories}
            />
          </div>
          <ItemPerformanceTable rows={items} selectedItem={search} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <SectionHeader
            icon={Flame}
            eyebrow="Hourly heatmap"
            title="Revenue by hour and weekday"
          />
          <HourlyHeatmap cells={heatmap} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <SectionHeader
            icon={BarChart3}
            eyebrow="Channel economics"
            title="Gross to net take-home"
          />
          <ChannelEconomicsTable rows={channelsDetail} />
        </CardContent>
      </Card>
    </div>
  );
}

function PeriodForm({
  outletId,
  params,
}: {
  outletId: string;
  params: Record<string, string | string[] | undefined>;
}) {
  return (
    <form action="/sales" className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="outletId" value={outletId} />
      <label className="text-muted-foreground space-y-1 text-xs font-medium">
        Period
        <select
          name="period"
          defaultValue={param(params.period) ?? "30d"}
          className="border-border bg-background text-foreground h-9 rounded-[10px] border px-3 text-sm"
        >
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="mtd">Month to date</option>
          <option value="90d">Last 90 days</option>
        </select>
      </label>
      <label className="border-border bg-background flex h-9 items-center gap-2 rounded-[10px] border px-3 text-sm">
        <input
          type="checkbox"
          name="compare"
          value="true"
          defaultChecked={param(params.compare) === "true"}
        />
        Compare
      </label>
      <Button type="submit" variant="outline" size="sm">
        Apply
      </Button>
    </form>
  );
}

function ItemFilterForm({
  outletId,
  periodKey,
  category,
  channel,
  search,
  categories,
}: {
  outletId: string;
  periodKey: string;
  category: string;
  channel: string;
  search: string;
  categories: string[];
}) {
  return (
    <form action="/sales" className="grid gap-2 sm:grid-cols-[120px_140px_1fr_auto]">
      <input type="hidden" name="outletId" value={outletId} />
      <input type="hidden" name="period" value={periodKey} />
      <select
        name="category"
        defaultValue={category}
        className="border-border bg-background h-9 rounded-[10px] border px-3 text-sm"
      >
        <option value="">All categories</option>
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select
        name="channel"
        defaultValue={channel}
        className="border-border bg-background h-9 rounded-[10px] border px-3 text-sm"
      >
        {channels.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </select>
      <div className="relative">
        <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
        <input
          name="q"
          defaultValue={search}
          placeholder="Search item"
          className="border-border bg-background h-9 w-full rounded-[10px] border pl-9 pr-3 text-sm"
        />
      </div>
      <Button type="submit" variant="outline" size="sm">
        Filter
      </Button>
    </form>
  );
}

function SectionHeader({
  icon: Icon,
  eyebrow,
  title,
}: {
  icon: typeof LineChart;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="border-border flex items-start justify-between gap-4 border-b p-5">
      <div>
        <p className="page-eyebrow">{eyebrow}</p>
        <h2 className="section-card-title">{title}</h2>
      </div>
      <Icon className="text-muted-foreground h-5 w-5" />
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "green";
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <p className="page-eyebrow !mb-0">{label}</p>
        <p
          className={cn(
            "font-mono text-3xl font-semibold tracking-[-0.04em]",
            tone === "green" && "text-[hsl(var(--green))]"
          )}
        >
          {value}
        </p>
        <p className="text-muted-foreground text-sm">{note}</p>
      </CardContent>
    </Card>
  );
}

function DailySummaryTable({
  rows,
  bestDay,
  worstDay,
}: {
  rows: DailySummaryRow[];
  bestDay?: string;
  worstDay?: string;
}) {
  if (rows.length === 0) return <EmptyState label="No committed sales data in this period." />;
  const totals = rows.reduce(
    (acc, row) => ({
      revenuePaise: acc.revenuePaise + row.revenuePaise,
      orders: acc.orders + row.orders,
      newCustomers: acc.newCustomers + row.newCustomers,
      repeatCustomers: acc.repeatCustomers + row.repeatCustomers,
    }),
    { revenuePaise: 0, orders: 0, newCustomers: 0, repeatCustomers: 0 }
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-sm">
        <thead className="bg-paper-subtle text-muted-foreground text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
          <tr>
            <th className="px-5 py-4">Date</th>
            <th className="px-5 py-4">DoW</th>
            <th className="px-5 py-4 text-right">Revenue</th>
            <th className="px-5 py-4 text-right">Orders</th>
            <th className="px-5 py-4 text-right">AOV</th>
            <th className="px-5 py-4 text-right">New</th>
            <th className="px-5 py-4 text-right">Repeat</th>
            <th className="px-5 py-4 text-right">Discount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.dayKey}
              className={cn(
                "border-border border-t",
                row.dayKey === bestDay && "bg-[hsl(var(--green-soft))]/45",
                row.dayKey === worstDay && "bg-[hsl(var(--red-soft))]/35"
              )}
            >
              <td className="px-5 py-4 font-mono text-xs">{formatDate(row.dayKey)}</td>
              <td className="px-5 py-4">{row.dow}</td>
              <td className="px-5 py-4 text-right font-mono font-semibold">
                {money(row.revenuePaise)}
              </td>
              <td className="px-5 py-4 text-right font-mono">{row.orders}</td>
              <td className="px-5 py-4 text-right font-mono">{money(row.aovPaise)}</td>
              <td className="px-5 py-4 text-right font-mono">{row.newCustomers}</td>
              <td className="px-5 py-4 text-right font-mono">{row.repeatCustomers}</td>
              <td className="px-5 py-4 text-right font-mono">{pct(row.discountPct)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-border bg-paper-subtle border-t font-semibold">
          <tr>
            <td className="px-5 py-4" colSpan={2}>
              Total
            </td>
            <td className="px-5 py-4 text-right font-mono">{money(totals.revenuePaise)}</td>
            <td className="px-5 py-4 text-right font-mono">{totals.orders}</td>
            <td className="px-5 py-4 text-right font-mono">
              {totals.orders > 0 ? money(Math.round(totals.revenuePaise / totals.orders)) : "—"}
            </td>
            <td className="px-5 py-4 text-right font-mono">{totals.newCustomers}</td>
            <td className="px-5 py-4 text-right font-mono">{totals.repeatCustomers}</td>
            <td className="px-5 py-4 text-right">—</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

function DailyRevenueChart({ rows }: { rows: DailySummaryRow[] }) {
  if (rows.length === 0) return null;

  const maxRevenue = Math.max(...rows.map((row) => row.revenuePaise), 1);

  return (
    <div className="border-border border-b px-5 py-5">
      <div className="grid auto-cols-fr grid-flow-col items-end gap-3 overflow-x-auto pb-1">
        {rows.map((row) => {
          const heightPct = Math.max((row.revenuePaise / maxRevenue) * 100, 6);
          return (
            <div
              key={row.dayKey}
              className="grid min-w-[72px] grid-rows-[auto_minmax(180px,1fr)_auto] gap-2"
            >
              <div className="text-center">
                <div className="text-foreground font-mono text-[11px] font-semibold leading-4">
                  {formatINRCompact(row.revenuePaise / 100)}
                </div>
                <div className="text-muted-foreground text-[10px] leading-4">
                  {row.orders.toLocaleString("en-IN")} orders
                </div>
              </div>
              <div className="flex items-end justify-center">
                <div className="flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t-[10px] bg-[hsl(var(--accent))]/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]"
                    style={{ height: `${heightPct}%` }}
                    aria-label={`${formatDate(row.dayKey, "dd MMM")} revenue ${money(row.revenuePaise)}`}
                  />
                </div>
              </div>
              <div className="text-center">
                <div className="text-foreground text-xs font-semibold">
                  {formatDate(row.dayKey, "dd MMM")}
                </div>
                <div className="text-muted-foreground text-[10px] uppercase tracking-[0.12em]">
                  {new Date(`${row.dayKey}T00:00:00`).toLocaleDateString("en-IN", {
                    weekday: "short",
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ItemPerformanceTable({
  rows,
  selectedItem,
}: {
  rows: ItemPerformanceRow[];
  selectedItem: string;
}) {
  if (rows.length === 0) return <EmptyState label="No matching item sales found." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-paper-subtle text-muted-foreground text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
          <tr>
            <th className="px-5 py-4">Item</th>
            <th className="px-5 py-4">Category</th>
            <th className="px-5 py-4 text-right">Qty</th>
            <th className="px-5 py-4 text-right">Revenue</th>
            <th className="px-5 py-4 text-right">Avg price</th>
            <th className="px-5 py-4 text-right">% total</th>
            <th className="px-5 py-4 text-right">Margin</th>
            <th className="px-5 py-4">7-day spark</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.itemName}
              className={cn(
                "border-border border-t",
                selectedItem &&
                  row.itemName.toLowerCase().includes(selectedItem.toLowerCase()) &&
                  "bg-[hsl(var(--blue-soft))]/45"
              )}
            >
              <td className="px-5 py-4 font-medium">{row.itemName}</td>
              <td className="text-muted-foreground px-5 py-4">{row.category ?? "—"}</td>
              <td className="px-5 py-4 text-right font-mono">{row.qty.toFixed(1)}</td>
              <td className="px-5 py-4 text-right font-mono font-semibold">
                {money(row.revenuePaise)}
              </td>
              <td className="px-5 py-4 text-right font-mono">{money(row.avgPricePaise)}</td>
              <td className="px-5 py-4 text-right font-mono">{row.sharePct.toFixed(1)}%</td>
              <td className="px-5 py-4 text-right font-mono">{pct(row.marginPct)}</td>
              <td className="px-5 py-4">
                <Spark values={row.spark} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="flex h-8 items-end gap-1">
      {values.length === 0 ? <span className="text-muted-foreground text-xs">—</span> : null}
      {values.map((value, index) => (
        <span
          key={`${value}-${index}`}
          className="bg-foreground w-2 rounded-t"
          style={{ height: `${Math.max(4, (value / max) * 30)}px` }}
        />
      ))}
    </div>
  );
}

function HourlyHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const max = Math.max(...cells.map((cell) => cell.revenuePaise), 1);
  const byKey = new Map(cells.map((cell) => [`${cell.dow}-${cell.hour}`, cell]));
  const dows = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 13 }, (_, index) => index + 11);

  return (
    <div className="overflow-x-auto p-5">
      <div className="grid min-w-[760px] grid-cols-[64px_repeat(7,1fr)] gap-2 text-sm">
        <div />
        {dows.map((dow) => (
          <div
            key={dow}
            className="text-muted-foreground text-center text-xs font-semibold uppercase tracking-[0.16em]"
          >
            {dow}
          </div>
        ))}
        {hours.map((hour) => (
          <>
            <div key={`${hour}-label`} className="text-muted-foreground py-2 font-mono text-xs">
              {String(hour).padStart(2, "0")}:00
            </div>
            {dows.map((dow) => {
              const cell = byKey.get(`${dow}-${hour}`)!;
              const alpha = 0.08 + (cell.revenuePaise / max) * 0.82;
              return (
                <div
                  key={`${dow}-${hour}`}
                  className="border-border rounded-[8px] border px-2 py-2 text-center font-mono text-xs"
                  style={{ backgroundColor: `hsl(var(--accent) / ${alpha})` }}
                  title={`${dow} ${hour}:00 · ${money(cell.revenuePaise)} · ${cell.orders} orders`}
                >
                  {cell.revenuePaise > 0 ? formatINRCompact(cell.revenuePaise / 100) : "—"}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

function ChannelEconomicsTable({ rows }: { rows: ChannelEconomicsDetailRow[] }) {
  if (rows.length === 0) return <EmptyState label="No channel economics found for this period." />;
  const leak = rows.reduce<ChannelEconomicsDetailRow | null>((worst, row) => {
    if (row.netPerRs100 == null) return worst;
    if (!worst || row.netPerRs100 < (worst.netPerRs100 ?? 101)) return row;
    return worst;
  }, null);

  return (
    <div>
      {leak ? (
        <div className="border-border border-b bg-[hsl(var(--amber-soft))]/45 p-4 text-sm">
          <strong>{leak.label}</strong> has the thinnest take-home at {leak.netPerRs100?.toFixed(1)}{" "}
          per ₹100 gross.
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="bg-paper-subtle text-muted-foreground text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
            <tr>
              <th className="px-5 py-4">Channel</th>
              <th className="px-5 py-4 text-right">Orders</th>
              <th className="px-5 py-4 text-right">Gross</th>
              <th className="px-5 py-4 text-right">Commission</th>
              <th className="px-5 py-4 text-right">Fees</th>
              <th className="px-5 py-4 text-right">Promo</th>
              <th className="px-5 py-4 text-right">Net</th>
              <th className="px-5 py-4 text-right">Net/₹100</th>
              <th className="px-5 py-4 text-right">Pending</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.channel} className="border-border border-t">
                <td className="px-5 py-4 font-medium">{row.label}</td>
                <td className="px-5 py-4 text-right font-mono">{row.orders}</td>
                <td className="px-5 py-4 text-right font-mono">{money(row.grossPaise)}</td>
                <td className="px-5 py-4 text-right font-mono">
                  {row.commissionPaise == null ? "—" : money(row.commissionPaise)}
                </td>
                <td className="px-5 py-4 text-right font-mono">
                  {row.feesPaise == null ? "—" : money(row.feesPaise)}
                </td>
                <td className="px-5 py-4 text-right font-mono">{money(row.promoPaise)}</td>
                <td className="px-5 py-4 text-right font-mono font-semibold">
                  {row.netPaise == null ? "—" : money(row.netPaise)}
                </td>
                <td className="px-5 py-4 text-right font-mono">
                  {row.netPerRs100 == null ? "—" : row.netPerRs100.toFixed(1)}
                </td>
                <td className="px-5 py-4 text-right font-mono">{row.pendingOrders}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="text-muted-foreground p-8 text-sm">{label}</div>;
}
