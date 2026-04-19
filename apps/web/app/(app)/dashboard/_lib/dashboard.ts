import { createClient } from "@/lib/supabase/server";

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export type DashboardPeriodKey = "today" | "yesterday" | "7d" | "30d" | "mtd" | "custom";
export type DashboardChannel = "dine_in" | "takeaway" | "swiggy" | "zomato" | "other";
export type DashboardSeverity = "warn" | "info";

type SalesOrderRow = {
  id: string;
  outlet_id: string;
  ordered_at: string;
  total_amount_paise: number | string;
  net_amount_paise: number | string;
  channel: DashboardChannel;
  aggregator_commission_paise: number | string | null;
  aggregator_fees_paise: number | string | null;
  aggregator_net_payout_paise: number | string | null;
  payment_method: string;
  customer_id: string | null;
  customer_phone_last_4: string | null;
};

type CustomerRow = {
  id: string;
  name: string | null;
  phone_last_4: string | null;
  first_seen_at: string;
};

export type DashboardFreshnessState = "fresh" | "stale" | "very-stale" | "critical";

export type DashboardFreshness = {
  lastUpload: string | null;
  latestOrder: string | null;
  state: DashboardFreshnessState;
  hoursSinceUpload: number | null;
  staleDays: number | null;
};

export type DashboardAlert = {
  id: string;
  severity: DashboardSeverity;
  message: string;
};

export type DashboardSparklinePoint = {
  day: string;
  revenuePaise: number;
};

export type DashboardKpi = {
  title: string;
  value: number;
  deltaPct: number | null;
  deltaLabel: string;
  sparkline: DashboardSparklinePoint[];
};

export type DashboardOverview = {
  freshness: DashboardFreshness;
  subjectDayLabel: string;
  subjectDayIso: string;
  revenue: DashboardKpi;
  orders: DashboardKpi;
  aov: DashboardKpi;
  alerts: DashboardAlert[];
  latestPayout: { source: string; netPayoutPaise: number; periodEnd: string } | null;
};

export type DashboardPeriod = {
  key: DashboardPeriodKey;
  label: string;
  start: string;
  end: string;
  compareStart: string | null;
  compareEnd: string | null;
  compareLabel: string | null;
  customStart?: string;
  customEnd?: string;
};

export type DashboardTrendPoint = {
  day: string;
  revenuePaise: number;
  orders: number;
  aovPaise: number;
  movingAveragePaise: number | null;
  channels: Record<DashboardChannel, number>;
};

export type DashboardChannelSummary = {
  channel: DashboardChannel;
  label: string;
  revenuePaise: number;
  orders: number;
  sharePct: number;
  netPayoutPaise: number;
  deltaPct: number | null;
};

export type DashboardPaymentBreakdown = {
  key: string;
  label: string;
  count: number;
  amountPaise: number;
};

export type DashboardHeatmapCell = {
  dayOfWeek: number;
  dayLabel: string;
  hourBlock: number;
  label: string;
  revenuePaise: number;
  orders: number;
};

export type DashboardChannelEconomicsRow = {
  channel: DashboardChannel;
  label: string;
  grossRevenuePaise: number;
  commissionFeesPaise: number;
  netToUsPaise: number;
  orders: number;
  aovPaise: number;
  netMarginPct: number;
};

export type DashboardCustomerActivity = {
  newCustomers: number;
  returningCustomers: number;
  repeatRatePct: number | null;
  topSpender: {
    customerId: string;
    name: string | null;
    phoneLast4: string | null;
    spendPaise: number;
    orders: number;
  } | null;
};

export type DashboardPeriodPayload = {
  current: {
    trend: DashboardTrendPoint[];
    channelSummary: DashboardChannelSummary[];
    paymentMethods: DashboardPaymentBreakdown[];
    heatmap: DashboardHeatmapCell[];
    economics: DashboardChannelEconomicsRow[];
    customers: DashboardCustomerActivity;
  };
  previous: {
    trend: DashboardTrendPoint[];
    channelSummary: DashboardChannelSummary[];
  } | null;
};

export function paiseToRupees(value: number): number {
  return value / 100;
}

function toNumber(value: number | string | null | undefined): number {
  if (value == null) return 0;
  return typeof value === "number" ? value : Number(value);
}

function getIstParts(date: Date): { year: number; month: number; day: number; hour: number } {
  const shifted = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
  };
}

function makeUtcFromIst(year: number, month: number, day: number, hour = 0): Date {
  return new Date(Date.UTC(year, month, day, hour) - IST_OFFSET_MS);
}

export function startOfIstDay(date: Date): Date {
  const parts = getIstParts(date);
  return makeUtcFromIst(parts.year, parts.month, parts.day, 0);
}

export function endOfIstDayExclusive(date: Date): Date {
  return new Date(startOfIstDay(date).getTime() + DAY_MS);
}

export function addIstDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function formatIstDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(date);
}

function formatIstDateTime(date: Date): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatCompactPeriodLabel(start: Date, endExclusive: Date): string {
  const end = new Date(endExclusive.getTime() - 1);
  return `${formatIstDate(start)} – ${formatIstDate(end)}`;
}

function safePercentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

export function buildRevenueDipAlert(args: {
  subjectDayIso: string;
  subjectRevenuePaise: number;
  trailingAveragePaise: number;
}): DashboardAlert | null {
  const { subjectDayIso, subjectRevenuePaise, trailingAveragePaise } = args;
  if (trailingAveragePaise <= 0) return null;
  if (subjectRevenuePaise >= trailingAveragePaise * 0.6) return null;

  const belowPct = Math.round(
    ((trailingAveragePaise - subjectRevenuePaise) / trailingAveragePaise) * 100
  );
  return {
    id: `revenue-dip-${subjectDayIso}`,
    severity: "warn",
    message: `Yesterday's revenue was ${belowPct}% below the 14-day average.`,
  };
}

export function resolveDashboardPeriod(
  searchParams: Record<string, string | string[] | undefined>,
  now = new Date()
): DashboardPeriod {
  const rawPeriod = Array.isArray(searchParams.period)
    ? searchParams.period[0]
    : searchParams.period;
  const periodKey: DashboardPeriodKey =
    rawPeriod === "today" ||
    rawPeriod === "yesterday" ||
    rawPeriod === "7d" ||
    rawPeriod === "30d" ||
    rawPeriod === "mtd" ||
    rawPeriod === "custom"
      ? rawPeriod
      : "7d";

  const todayStart = startOfIstDay(now);
  const tomorrowStart = addIstDays(todayStart, 1);
  let start = todayStart;
  let end = tomorrowStart;
  let label = "Last 7 days";
  let customStart: string | undefined;
  let customEnd: string | undefined;

  switch (periodKey) {
    case "today":
      start = todayStart;
      end = now;
      label = "Today";
      break;
    case "yesterday":
      start = addIstDays(todayStart, -1);
      end = todayStart;
      label = "Yesterday";
      break;
    case "7d":
      start = addIstDays(todayStart, -7);
      end = todayStart;
      label = "Last 7 days";
      break;
    case "30d":
      start = addIstDays(todayStart, -30);
      end = todayStart;
      label = "Last 30 days";
      break;
    case "mtd": {
      const parts = getIstParts(now);
      start = makeUtcFromIst(parts.year, parts.month, 1, 0);
      end = todayStart;
      label = "Month to date";
      break;
    }
    case "custom": {
      const rawStart = Array.isArray(searchParams.start)
        ? searchParams.start[0]
        : searchParams.start;
      const rawEnd = Array.isArray(searchParams.end) ? searchParams.end[0] : searchParams.end;
      customStart = rawStart;
      customEnd = rawEnd;
      const startDate = rawStart
        ? new Date(`${rawStart}T00:00:00+05:30`)
        : addIstDays(todayStart, -6);
      const endDate = rawEnd ? new Date(`${rawEnd}T00:00:00+05:30`) : todayStart;
      const boundedStart = Number.isNaN(startDate.getTime())
        ? addIstDays(todayStart, -6)
        : startDate;
      const boundedEnd = Number.isNaN(endDate.getTime()) ? todayStart : endDate;
      const orderedStart = boundedStart <= boundedEnd ? boundedStart : boundedEnd;
      const orderedEnd = boundedStart <= boundedEnd ? boundedEnd : boundedStart;
      const maxRangeEnd = addIstDays(orderedStart, 366);

      start = orderedStart;
      end = addIstDays(orderedEnd, 1);
      if (end > maxRangeEnd) {
        end = maxRangeEnd;
      }
      label = "Custom";
      break;
    }
  }

  const durationMs = Math.max(end.getTime() - start.getTime(), DAY_MS);
  const compareEnd = start;
  const compareStart = new Date(compareEnd.getTime() - durationMs);

  return {
    key: periodKey,
    label,
    start: start.toISOString(),
    end: end.toISOString(),
    compareStart: compareStart.toISOString(),
    compareEnd: compareEnd.toISOString(),
    compareLabel: formatCompactPeriodLabel(compareStart, compareEnd),
    customStart,
    customEnd,
  };
}

function getDayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function getDayLabel(dayKey: string): string {
  return formatIstDate(new Date(`${dayKey}T00:00:00+05:30`), {
    day: "2-digit",
    month: "short",
  });
}

function getHourBlock(iso: string): number {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso))
  );
  return Math.floor(hour / 2) * 2;
}

function getDayOfWeek(iso: string): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(new Date(iso));
  const order = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return order.indexOf(label) + 1 || 1;
}

function dayLabelForWeek(day: number): string {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][day - 1] ?? "Mon";
}

function channelLabel(channel: DashboardChannel): string {
  switch (channel) {
    case "dine_in":
      return "Dine In";
    case "takeaway":
      return "Takeaway";
    case "swiggy":
      return "Swiggy";
    case "zomato":
      return "Zomato";
    default:
      return "Other";
  }
}

function paymentMethodLabel(key: string): string {
  switch (key) {
    case "online_aggregator":
      return "Online aggregator";
    case "part_payment":
      return "Part payment";
    case "not_paid":
      return "Not paid";
    default:
      return key.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
  }
}

function groupByDay(rows: SalesOrderRow[]): Map<string, SalesOrderRow[]> {
  const map = new Map<string, SalesOrderRow[]>();
  rows.forEach((row) => {
    const key = getDayKey(row.ordered_at);
    const existing = map.get(key);
    if (existing) {
      existing.push(row);
    } else {
      map.set(key, [row]);
    }
  });
  return map;
}

function enumerateDayKeys(startIso: string, endIso: string): string[] {
  const keys: string[] = [];
  let cursor = startOfIstDay(new Date(startIso));
  const end = new Date(endIso);
  while (cursor < end) {
    keys.push(getDayKey(cursor.toISOString()));
    cursor = addIstDays(cursor, 1);
  }
  return keys;
}

function buildTrend(
  rows: SalesOrderRow[],
  period: { start: string; end: string }
): DashboardTrendPoint[] {
  const byDay = groupByDay(rows);
  const dayKeys = enumerateDayKeys(period.start, period.end);

  return dayKeys.map((dayKey, index) => {
    const dayRows = byDay.get(dayKey) ?? [];
    const revenuePaise = dayRows.reduce((sum, row) => sum + toNumber(row.total_amount_paise), 0);
    const orders = dayRows.length;
    const aovPaise = orders > 0 ? Math.round(revenuePaise / orders) : 0;
    const channels: Record<DashboardChannel, number> = {
      dine_in: 0,
      takeaway: 0,
      swiggy: 0,
      zomato: 0,
      other: 0,
    };
    dayRows.forEach((row) => {
      channels[row.channel] += toNumber(row.total_amount_paise);
    });

    const startIndex = Math.max(0, index - 6);
    const trailing = dayKeys
      .slice(startIndex, index + 1)
      .map((key) =>
        (byDay.get(key) ?? []).reduce((sum, row) => sum + toNumber(row.total_amount_paise), 0)
      );
    const movingAveragePaise =
      trailing.length > 0
        ? Math.round(trailing.reduce((sum, value) => sum + value, 0) / trailing.length)
        : null;

    return {
      day: dayKey,
      revenuePaise,
      orders,
      aovPaise,
      movingAveragePaise,
      channels,
    };
  });
}

function buildChannelSummary(
  rows: SalesOrderRow[],
  previousRows: SalesOrderRow[] | null
): DashboardChannelSummary[] {
  const totalRevenue = rows.reduce((sum, row) => sum + toNumber(row.total_amount_paise), 0);

  return (["dine_in", "takeaway", "swiggy", "zomato", "other"] as DashboardChannel[]).map(
    (channel) => {
      const currentRows = rows.filter((row) => row.channel === channel);
      const previousChannelRows = previousRows?.filter((row) => row.channel === channel) ?? [];
      const revenuePaise = currentRows.reduce(
        (sum, row) => sum + toNumber(row.total_amount_paise),
        0
      );
      const previousRevenue = previousChannelRows.reduce(
        (sum, row) => sum + toNumber(row.total_amount_paise),
        0
      );
      const netPayoutPaise =
        channel === "swiggy" || channel === "zomato"
          ? currentRows.reduce((sum, row) => sum + toNumber(row.aggregator_net_payout_paise), 0)
          : revenuePaise;

      return {
        channel,
        label: channelLabel(channel),
        revenuePaise,
        orders: currentRows.length,
        sharePct: totalRevenue > 0 ? (revenuePaise / totalRevenue) * 100 : 0,
        netPayoutPaise,
        deltaPct: safePercentChange(revenuePaise, previousRevenue),
      };
    }
  );
}

function buildPaymentBreakdown(rows: SalesOrderRow[]): DashboardPaymentBreakdown[] {
  const map = new Map<string, DashboardPaymentBreakdown>();
  rows.forEach((row) => {
    const key = row.payment_method || "other";
    const current = map.get(key) ?? {
      key,
      label: paymentMethodLabel(key),
      count: 0,
      amountPaise: 0,
    };
    current.count += 1;
    current.amountPaise += toNumber(row.total_amount_paise);
    map.set(key, current);
  });

  return Array.from(map.values()).sort((a, b) => b.amountPaise - a.amountPaise);
}

function buildHeatmap(rows: SalesOrderRow[]): DashboardHeatmapCell[] {
  const map = new Map<string, DashboardHeatmapCell>();
  rows.forEach((row) => {
    const dayOfWeek = getDayOfWeek(row.ordered_at);
    const hourBlock = getHourBlock(row.ordered_at);
    if (hourBlock < 6 || hourBlock > 22) return;
    const key = `${dayOfWeek}-${hourBlock}`;
    const current = map.get(key) ?? {
      dayOfWeek,
      dayLabel: dayLabelForWeek(dayOfWeek),
      hourBlock,
      label: `${dayLabelForWeek(dayOfWeek)} ${String(hourBlock).padStart(2, "0")}:00`,
      revenuePaise: 0,
      orders: 0,
    };
    current.revenuePaise += toNumber(row.total_amount_paise);
    current.orders += 1;
    map.set(key, current);
  });

  const cells: DashboardHeatmapCell[] = [];
  for (let day = 1; day <= 7; day += 1) {
    for (let hour = 6; hour <= 22; hour += 2) {
      const key = `${day}-${hour}`;
      cells.push(
        map.get(key) ?? {
          dayOfWeek: day,
          dayLabel: dayLabelForWeek(day),
          hourBlock: hour,
          label: `${dayLabelForWeek(day)} ${String(hour).padStart(2, "0")}:00`,
          revenuePaise: 0,
          orders: 0,
        }
      );
    }
  }
  return cells;
}

function buildChannelEconomics(rows: SalesOrderRow[]): DashboardChannelEconomicsRow[] {
  return (["dine_in", "takeaway", "swiggy", "zomato", "other"] as DashboardChannel[])
    .map((channel) => {
      const channelRows = rows.filter((row) => row.channel === channel);
      const grossRevenuePaise = channelRows.reduce(
        (sum, row) => sum + toNumber(row.total_amount_paise),
        0
      );
      const commissionFeesPaise = channelRows.reduce(
        (sum, row) =>
          sum + toNumber(row.aggregator_commission_paise) + toNumber(row.aggregator_fees_paise),
        0
      );
      const aggregatorNetPayoutPaise = channelRows.reduce(
        (sum, row) => sum + toNumber(row.aggregator_net_payout_paise),
        0
      );
      const netToUsPaise =
        channel === "swiggy" || channel === "zomato"
          ? aggregatorNetPayoutPaise || Math.max(grossRevenuePaise - commissionFeesPaise, 0)
          : grossRevenuePaise;
      const orders = channelRows.length;
      const aovPaise = orders > 0 ? Math.round(grossRevenuePaise / orders) : 0;
      return {
        channel,
        label: channelLabel(channel),
        grossRevenuePaise,
        commissionFeesPaise,
        netToUsPaise,
        orders,
        aovPaise,
        netMarginPct: grossRevenuePaise > 0 ? (netToUsPaise / grossRevenuePaise) * 100 : 0,
      };
    })
    .sort((a, b) => b.netToUsPaise - a.netToUsPaise);
}

function buildCustomerActivity(
  rows: SalesOrderRow[],
  customers: CustomerRow[],
  period: { start: string; end: string }
): DashboardCustomerActivity {
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const periodRows = rows.filter((row) => row.customer_id);
  if (periodRows.length === 0) {
    return {
      newCustomers: 0,
      returningCustomers: 0,
      repeatRatePct: null,
      topSpender: null,
    };
  }

  const byCustomer = new Map<string, { spendPaise: number; orders: number }>();
  periodRows.forEach((row) => {
    if (!row.customer_id) return;
    const current = byCustomer.get(row.customer_id) ?? { spendPaise: 0, orders: 0 };
    current.spendPaise += toNumber(row.total_amount_paise);
    current.orders += 1;
    byCustomer.set(row.customer_id, current);
  });

  let newCustomers = 0;
  let returningCustomers = 0;
  let topSpender: DashboardCustomerActivity["topSpender"] = null;
  const periodStart = new Date(period.start);
  const periodEnd = new Date(period.end);

  byCustomer.forEach((value, customerId) => {
    const customer = customerMap.get(customerId);
    const firstSeenAt = customer ? new Date(customer.first_seen_at) : null;
    if (firstSeenAt && firstSeenAt >= periodStart && firstSeenAt < periodEnd) {
      newCustomers += 1;
    } else {
      returningCustomers += 1;
    }

    if (!topSpender || value.spendPaise > topSpender.spendPaise) {
      topSpender = {
        customerId,
        name: customer?.name ?? null,
        phoneLast4: customer?.phone_last_4 ?? null,
        spendPaise: value.spendPaise,
        orders: value.orders,
      };
    }
  });

  const total = newCustomers + returningCustomers;
  return {
    newCustomers,
    returningCustomers,
    repeatRatePct: total > 0 ? (returningCustomers / total) * 100 : null,
    topSpender,
  };
}

export function chooseDashboardOutlet<T extends { id: string }>(
  outlets: readonly T[],
  preferredOutletId?: string | null
): T | null {
  if (preferredOutletId) {
    const match = outlets.find((outlet) => outlet.id === preferredOutletId);
    if (match) return match;
  }
  return outlets[0] ?? null;
}

async function fetchOverview(outletId: string): Promise<DashboardOverview | null> {
  const supabase = await createClient();
  const [
    { data: latestUploadRows },
    { data: latestOrderRows },
    { data: recentRows },
    { data: payoutRows },
  ] = await Promise.all([
    supabase
      .from("ingestion_runs")
      .select("committed_at")
      .eq("outlet_id", outletId)
      .eq("status", "committed")
      .order("committed_at", { ascending: false })
      .limit(1),
    supabase
      .from("sales_orders")
      .select("ordered_at")
      .eq("outlet_id", outletId)
      .eq("status", "success")
      .order("ordered_at", { ascending: false })
      .limit(1),
    supabase
      .from("sales_orders")
      .select(
        "id, outlet_id, ordered_at, total_amount_paise, net_amount_paise, channel, aggregator_commission_paise, aggregator_fees_paise, aggregator_net_payout_paise, payment_method, customer_id, customer_phone_last_4"
      )
      .eq("outlet_id", outletId)
      .eq("status", "success")
      .gte("ordered_at", addIstDays(startOfIstDay(new Date()), -20).toISOString())
      .order("ordered_at", { ascending: true }),
    supabase
      .from("aggregator_payouts")
      .select("id, source, period_start, period_end, net_payout_paise, total_orders")
      .eq("outlet_id", outletId)
      .order("period_end", { ascending: false })
      .limit(1),
  ]);

  const lastUpload = latestUploadRows?.[0]?.committed_at ?? null;
  const latestOrder = latestOrderRows?.[0]?.ordered_at ?? null;
  if (!lastUpload && !latestOrder) return null;

  const now = new Date();
  const hoursSinceUpload =
    lastUpload != null
      ? Math.max(0, (now.getTime() - new Date(lastUpload).getTime()) / (60 * 60 * 1000))
      : null;
  const state: DashboardFreshnessState =
    hoursSinceUpload == null
      ? "critical"
      : hoursSinceUpload <= 24
        ? "fresh"
        : hoursSinceUpload <= 48
          ? "stale"
          : hoursSinceUpload <= 24 * 7
            ? "very-stale"
            : "critical";

  const sparklineRows = (recentRows ?? []) as SalesOrderRow[];
  const sparklineTrend = buildTrend(sparklineRows, {
    start: addIstDays(startOfIstDay(now), -14).toISOString(),
    end: startOfIstDay(now).toISOString(),
  });

  const recentByDay = groupByDay(sparklineRows);
  const sortedDays = Array.from(recentByDay.keys()).sort((a, b) => (a < b ? 1 : -1));
  const yesterdayKey = getDayKey(addIstDays(startOfIstDay(now), -1).toISOString());
  const subjectDayIso = recentByDay.has(yesterdayKey)
    ? yesterdayKey
    : (sortedDays[0] ?? yesterdayKey);
  const subjectRows = recentByDay.get(subjectDayIso) ?? [];
  const subjectRevenuePaise = subjectRows.reduce(
    (sum, row) => sum + toNumber(row.total_amount_paise),
    0
  );
  const subjectOrders = subjectRows.length;
  const subjectAovPaise = subjectOrders > 0 ? Math.round(subjectRevenuePaise / subjectOrders) : 0;

  const trailingDays = sortedDays.filter((day) => day < subjectDayIso).slice(0, 14);
  const trailingRevenues = trailingDays.map((day) =>
    (recentByDay.get(day) ?? []).reduce((sum, row) => sum + toNumber(row.total_amount_paise), 0)
  );
  const trailingOrders = trailingDays.map((day) => (recentByDay.get(day) ?? []).length);
  const trailingRevenueAvg =
    trailingRevenues.length > 0
      ? Math.round(
          trailingRevenues.reduce((sum, value) => sum + value, 0) / trailingRevenues.length
        )
      : 0;
  const trailingOrdersAvg =
    trailingOrders.length > 0
      ? trailingOrders.reduce((sum, value) => sum + value, 0) / trailingOrders.length
      : 0;
  const trailingAovAvg =
    trailingOrdersAvg > 0 ? Math.round(trailingRevenueAvg / trailingOrdersAvg) : 0;

  const alerts = [
    buildRevenueDipAlert({
      subjectDayIso,
      subjectRevenuePaise,
      trailingAveragePaise: trailingRevenueAvg,
    }),
  ].filter((value): value is DashboardAlert => Boolean(value));

  return {
    freshness: {
      lastUpload,
      latestOrder,
      state,
      hoursSinceUpload: hoursSinceUpload == null ? null : Math.round(hoursSinceUpload),
      staleDays: hoursSinceUpload == null ? null : Math.floor(hoursSinceUpload / 24),
    },
    subjectDayLabel:
      subjectDayIso === yesterdayKey
        ? "Yesterday"
        : `Most recent day — ${getDayLabel(subjectDayIso)}`,
    subjectDayIso,
    revenue: {
      title: "Revenue",
      value: subjectRevenuePaise,
      deltaPct: safePercentChange(subjectRevenuePaise, trailingRevenueAvg),
      deltaLabel: "vs 14-day average",
      sparkline: sparklineTrend.map((point) => ({
        day: point.day,
        revenuePaise: point.revenuePaise,
      })),
    },
    orders: {
      title: "Orders",
      value: subjectOrders,
      deltaPct: safePercentChange(subjectOrders, trailingOrdersAvg),
      deltaLabel: "vs 14-day average",
      sparkline: sparklineTrend.map((point) => ({ day: point.day, revenuePaise: point.orders })),
    },
    aov: {
      title: "Avg order value",
      value: subjectAovPaise,
      deltaPct: safePercentChange(subjectAovPaise, trailingAovAvg),
      deltaLabel: "vs 14-day average",
      sparkline: sparklineTrend.map((point) => ({ day: point.day, revenuePaise: point.aovPaise })),
    },
    alerts,
    latestPayout: payoutRows?.[0]
      ? {
          source: payoutRows[0].source,
          netPayoutPaise: toNumber(payoutRows[0].net_payout_paise),
          periodEnd: payoutRows[0].period_end,
        }
      : null,
  };
}

async function fetchPeriodPayload(
  outletId: string,
  period: DashboardPeriod,
  compare: boolean
): Promise<DashboardPeriodPayload> {
  const supabase = await createClient();
  const fetchStart = compare && period.compareStart ? period.compareStart : period.start;

  const [{ data: salesRows }, { data: paymentRows }, { data: payoutRows }] = await Promise.all([
    supabase
      .from("sales_orders")
      .select(
        "id, outlet_id, ordered_at, total_amount_paise, net_amount_paise, channel, aggregator_commission_paise, aggregator_fees_paise, aggregator_net_payout_paise, payment_method, customer_id, customer_phone_last_4"
      )
      .eq("outlet_id", outletId)
      .eq("status", "success")
      .gte("ordered_at", fetchStart)
      .lt("ordered_at", period.end)
      .order("ordered_at", { ascending: true }),
    supabase
      .from("payment_transactions")
      .select("id, transacted_at, amount_paise, matched_order_id, match_confidence")
      .eq("outlet_id", outletId)
      .gte("transacted_at", fetchStart)
      .lt("transacted_at", period.end),
    supabase
      .from("aggregator_payouts")
      .select("id, source, period_start, period_end, net_payout_paise, total_orders")
      .eq("outlet_id", outletId)
      .gte("period_end", fetchStart.slice(0, 10))
      .order("period_end", { ascending: false })
      .limit(12),
  ]);

  const allRows = (salesRows ?? []) as SalesOrderRow[];
  const currentRows = allRows.filter(
    (row) =>
      new Date(row.ordered_at) >= new Date(period.start) &&
      new Date(row.ordered_at) < new Date(period.end)
  );
  const previousRows =
    compare && period.compareStart && period.compareEnd
      ? allRows.filter(
          (row) =>
            new Date(row.ordered_at) >= new Date(period.compareStart!) &&
            new Date(row.ordered_at) < new Date(period.compareEnd!)
        )
      : null;

  const customerIds = Array.from(
    new Set(
      currentRows.map((row) => row.customer_id).filter((value): value is string => Boolean(value))
    )
  );
  const { data: customerRows } =
    customerIds.length > 0
      ? await supabase
          .from("customers")
          .select("id, name, phone_last_4, first_seen_at")
          .in("id", customerIds)
      : { data: [] };

  const trend = buildTrend(currentRows, { start: period.start, end: period.end });
  const previousTrend =
    compare && previousRows && period.compareStart && period.compareEnd
      ? buildTrend(previousRows, { start: period.compareStart, end: period.compareEnd })
      : [];

  const payload: DashboardPeriodPayload = {
    current: {
      trend,
      channelSummary: buildChannelSummary(currentRows, previousRows),
      paymentMethods: buildPaymentBreakdown(currentRows),
      heatmap: buildHeatmap(currentRows),
      economics: buildChannelEconomics(currentRows),
      customers: buildCustomerActivity(currentRows, (customerRows ?? []) as CustomerRow[], {
        start: period.start,
        end: period.end,
      }),
    },
    previous:
      compare && previousRows
        ? {
            trend: previousTrend,
            channelSummary: buildChannelSummary(previousRows, null),
          }
        : null,
  };

  void paymentRows;
  void payoutRows;

  return payload;
}

export async function getDashboardOverview(outletId: string): Promise<DashboardOverview | null> {
  return fetchOverview(outletId);
}

export async function getDashboardPeriodPayload(
  outletId: string,
  period: DashboardPeriod,
  compare: boolean
): Promise<DashboardPeriodPayload> {
  return fetchPeriodPayload(outletId, period, compare);
}

export function buildFreshnessMessage(freshness: DashboardFreshness): {
  headline: string;
  detail: string | null;
  href: string;
} {
  const latestOrderText = freshness.latestOrder
    ? `Most recent order: ${formatIstDateTime(new Date(freshness.latestOrder))}`
    : null;

  if (!freshness.lastUpload) {
    return {
      headline: "No committed ingestion runs yet.",
      detail: latestOrderText,
      href: "/ingest",
    };
  }

  const lastUploadDate = new Date(freshness.lastUpload);
  if (freshness.state === "fresh") {
    return {
      headline: `Data updated ${freshness.hoursSinceUpload ?? 0} hours ago`,
      detail: latestOrderText,
      href: "/ingest",
    };
  }

  if (freshness.state === "stale") {
    return {
      headline: `Data updated ${formatIstDateTime(lastUploadDate)}. Upload recent files for current numbers.`,
      detail: latestOrderText,
      href: "/ingest",
    };
  }

  if (freshness.state === "very-stale") {
    return {
      headline: `Data is ${freshness.staleDays ?? 0} days old. The dashboard below reflects orders through ${latestOrderText ? formatIstDate(new Date(freshness.latestOrder!)) : formatIstDate(lastUploadDate)}.`,
      detail: latestOrderText,
      href: "/ingest",
    };
  }

  return {
    headline: `Data is more than a week old. The dashboard below reflects orders through ${latestOrderText ? formatIstDate(new Date(freshness.latestOrder!)) : formatIstDate(lastUploadDate)}, not today.`,
    detail: latestOrderText,
    href: "/ingest",
  };
}
