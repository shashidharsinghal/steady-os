import { createClient } from "@/lib/supabase/server";

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CHANNELS = ["dine_in", "takeaway", "swiggy", "zomato", "other"] as const;

export type DashboardPeriodKey = "today" | "yesterday" | "7d" | "30d" | "mtd" | "custom";
export type DashboardChannel = (typeof CHANNELS)[number];
export type DashboardFreshnessState = "fresh" | "stale" | "very-stale" | "critical";
export type DashboardAlertTone = "warn" | "info";
export type DashboardRibbonTone = "up" | "flat" | "down" | "none";

type SalesOrderRow = {
  id: string;
  outlet_id: string;
  ordered_at: string;
  channel: DashboardChannel;
  source: string;
  status: string;
  total_amount_paise: number | string;
  gross_amount_paise: number | string;
  discount_amount_paise: number | string;
  aggregator_commission_paise: number | string | null;
  aggregator_fees_paise: number | string | null;
  aggregator_net_payout_paise: number | string | null;
  customer_id: string | null;
  raw_data: unknown;
};

type PaymentTransactionRow = {
  transacted_at: string;
  source: string;
  transaction_type: string;
  upi_vpa: string | null;
};

type CustomerProfileRow = {
  id: string;
  first_seen_at: string;
  last_seen_at: string;
  total_orders: number;
  highest_segment: string;
};

type DayStats = {
  dayKey: string;
  revenuePaise: number;
  orders: number;
  discountPaise: number;
  channels: Record<DashboardChannel, number>;
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

export type DashboardFreshness = {
  state: DashboardFreshnessState;
  headline: string;
  detail: string | null;
  href: string;
  lastUpload: string | null;
  latestOrder: string | null;
};

export type LegacyDashboardFreshness = {
  lastUpload: string | null;
  latestOrder: string | null;
  state: DashboardFreshnessState;
  hoursSinceUpload: number | null;
  staleDays: number | null;
};

export type MorningCheckAlert = {
  id: string;
  tone: DashboardAlertTone;
  headline: string;
  detail: string;
};

export type MorningCheckCard = {
  dayKey: string;
  dayLabel: string;
  weekdayLabel: string;
  revenuePaise: number;
  orders: number;
  aovPaise: number;
};

export type DoWBaseline = {
  averageRevenuePaise: number;
  averageOrders: number;
  averageAovPaise: number;
  baselineCount: number;
  comparisonLabel: string;
  deviationPct: number | null;
  orderDeviationPct: number | null;
  aovDeviationPct: number | null;
};

export type RushPattern = {
  baselineLabel: string;
  baselineCount: number;
  peakHour: number | null;
  peakHourLabel: string | null;
  peakWindowStartHour: number | null;
  peakWindowEndHour: number | null;
  peakWindowSharePct: number | null;
  hours: Array<{
    hour: number;
    label: string;
    averageRevenuePaise: number;
  }>;
};

export type MorningCheckData = {
  freshness: DashboardFreshness;
  targetDay: MorningCheckCard;
  baseline: DoWBaseline;
  rushPattern: RushPattern;
  alerts: MorningCheckAlert[];
};

export type RevenuePoint = {
  dayKey: string;
  shortLabel: string;
  weekdayLabel: string;
  dayOfWeek: number;
  revenuePaise: number;
  orders: number;
  movingAveragePaise: number | null;
  dowDeviationPct: number | null;
  ribbonTone: DashboardRibbonTone;
  channels: Record<DashboardChannel, number>;
};

export type DoWPatternPoint = {
  dayOfWeek: number;
  label: string;
  averageRevenuePaise: number;
  daysCount: number;
  isHighest: boolean;
  isLowest: boolean;
};

export type PeriodViewData = {
  period: DashboardPeriod;
  rangeLabel: string;
  current: RevenuePoint[];
  previous: RevenuePoint[] | null;
  dowPattern: DoWPatternPoint[];
};

export type ChannelEconomicsRow = {
  channel: DashboardChannel;
  label: string;
  orders: number;
  grossPaise: number;
  commissionPaise: number;
  feesPaise: number;
  netPaise: number;
  netPerRs100: number | null;
  awaitingParser: boolean;
};

export type DiscountCouponRow = {
  code: string;
  orders: number;
  discountPaise: number;
};

export type DiscountPerformanceData = {
  discountedOrders: number;
  fullPriceOrders: number;
  totalDiscountPaise: number;
  averageDiscountPct: number | null;
  discountedAovPaise: number | null;
  fullPriceAovPaise: number | null;
  topCoupons: DiscountCouponRow[];
};

export type CustomerTilesData = {
  newCount: number;
  returningCount: number;
  repeatPct: number | null;
  regularCount: number;
  dineInRepeatPct: number | null;
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

export function formatIstDateTime(date: Date): string {
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

function getDayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function dateFromDayKey(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00+05:30`);
}

function getDayOfWeekFromKey(dayKey: string): number {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
  }).format(dateFromDayKey(dayKey));
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(label) + 1 || 1;
}

function getDayLabel(dayKey: string): string {
  return formatIstDate(dateFromDayKey(dayKey), {
    day: "2-digit",
    month: "short",
    year: "numeric",
    weekday: "long",
  });
}

function weekdayLabel(dayOfWeek: number): string {
  return (
    ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][dayOfWeek - 1] ??
    "Monday"
  );
}

function weekdayShortLabel(dayOfWeek: number): string {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][dayOfWeek - 1] ?? "Mon";
}

function hourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
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

function percentChange(current: number, baseline: number): number | null {
  if (baseline <= 0) return null;
  return ((current - baseline) / baseline) * 100;
}

function ribbonToneFromDeviation(value: number | null): DashboardRibbonTone {
  if (value == null) return "none";
  if (value >= 10) return "up";
  if (value <= -10) return "down";
  return "flat";
}

function buildDayStatsMap(rows: SalesOrderRow[]): Map<string, DayStats> {
  const map = new Map<string, DayStats>();

  rows.forEach((row) => {
    const key = getDayKey(row.ordered_at);
    const current = map.get(key) ?? {
      dayKey: key,
      revenuePaise: 0,
      orders: 0,
      discountPaise: 0,
      channels: {
        dine_in: 0,
        takeaway: 0,
        swiggy: 0,
        zomato: 0,
        other: 0,
      },
    };

    current.revenuePaise += toNumber(row.total_amount_paise);
    current.orders += 1;
    current.discountPaise += toNumber(row.discount_amount_paise);
    current.channels[row.channel] += toNumber(row.total_amount_paise);
    map.set(key, current);
  });

  return map;
}

function computeDoWBaseline(dayMap: Map<string, DayStats>, targetDayKey: string): DoWBaseline {
  const targetDayOfWeek = getDayOfWeekFromKey(targetDayKey);
  const baselineDays = Array.from(dayMap.values())
    .filter(
      (row) => row.dayKey < targetDayKey && getDayOfWeekFromKey(row.dayKey) === targetDayOfWeek
    )
    .sort((left, right) => (left.dayKey < right.dayKey ? 1 : -1))
    .slice(0, 4);

  if (baselineDays.length === 0) {
    return {
      averageRevenuePaise: 0,
      averageOrders: 0,
      averageAovPaise: 0,
      baselineCount: 0,
      comparisonLabel: `First ${weekdayLabel(targetDayOfWeek)} in the data`,
      deviationPct: null,
      orderDeviationPct: null,
      aovDeviationPct: null,
    };
  }

  const averageRevenuePaise = Math.round(
    baselineDays.reduce((sum, row) => sum + row.revenuePaise, 0) / baselineDays.length
  );
  const averageOrders =
    baselineDays.reduce((sum, row) => sum + row.orders, 0) / baselineDays.length;
  const averageAovPaise = averageOrders > 0 ? Math.round(averageRevenuePaise / averageOrders) : 0;
  const target = dayMap.get(targetDayKey);

  return {
    averageRevenuePaise,
    averageOrders,
    averageAovPaise,
    baselineCount: baselineDays.length,
    comparisonLabel:
      baselineDays.length >= 4
        ? `Past 4 ${weekdayLabel(targetDayOfWeek)}s`
        : `All available ${weekdayLabel(targetDayOfWeek)}s (n=${baselineDays.length})`,
    deviationPct: target ? percentChange(target.revenuePaise, averageRevenuePaise) : null,
    orderDeviationPct: target ? percentChange(target.orders, averageOrders) : null,
    aovDeviationPct: target
      ? percentChange(Math.round(target.revenuePaise / Math.max(target.orders, 1)), averageAovPaise)
      : null,
  };
}

function getHourOfDay(iso: string): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date(iso))
  );
}

function buildRushPattern(rows: SalesOrderRow[], now = new Date()): RushPattern {
  const todayKey = getDayKey(now.toISOString());
  const todayDow = getDayOfWeekFromKey(todayKey);
  const candidateRows = rows.filter(
    (row) =>
      getDayKey(row.ordered_at) < todayKey &&
      getDayOfWeekFromKey(getDayKey(row.ordered_at)) === todayDow
  );

  const dayKeys = Array.from(new Set(candidateRows.map((row) => getDayKey(row.ordered_at))))
    .sort((left, right) => (left < right ? 1 : -1))
    .slice(0, 4);

  const scopedRows =
    dayKeys.length > 0
      ? candidateRows.filter((row) => dayKeys.includes(getDayKey(row.ordered_at)))
      : rows.filter((row) => getDayKey(row.ordered_at) < todayKey);

  const matchedDayKeys = Array.from(new Set(scopedRows.map((row) => getDayKey(row.ordered_at))));
  const hours = Array.from({ length: 13 }, (_, index) => index + 11).map((hour) => {
    const dailyTotals = matchedDayKeys.map((dayKey) =>
      scopedRows
        .filter(
          (row) => getDayKey(row.ordered_at) === dayKey && getHourOfDay(row.ordered_at) === hour
        )
        .reduce((sum, row) => sum + toNumber(row.total_amount_paise), 0)
    );
    const averageRevenuePaise =
      dailyTotals.length > 0
        ? Math.round(dailyTotals.reduce((sum, value) => sum + value, 0) / dailyTotals.length)
        : 0;

    return {
      hour,
      label: hourLabel(hour),
      averageRevenuePaise,
    };
  });

  const total = hours.reduce((sum, row) => sum + row.averageRevenuePaise, 0);
  const peakHourRow = hours.reduce(
    (best, current) => (current.averageRevenuePaise > best.averageRevenuePaise ? current : best),
    hours[0] ?? { hour: 0, label: "00:00", averageRevenuePaise: 0 }
  );

  let peakWindowStartHour: number | null = null;
  let peakWindowEndHour: number | null = null;
  let peakWindowSharePct: number | null = null;

  for (let index = 0; index < hours.length - 2; index += 1) {
    const windowRevenue =
      hours[index]!.averageRevenuePaise +
      hours[index + 1]!.averageRevenuePaise +
      hours[index + 2]!.averageRevenuePaise;
    const currentShare = total > 0 ? (windowRevenue / total) * 100 : null;

    if (currentShare != null && (peakWindowSharePct == null || currentShare > peakWindowSharePct)) {
      peakWindowStartHour = hours[index]!.hour;
      peakWindowEndHour = hours[index + 2]!.hour;
      peakWindowSharePct = currentShare;
    }
  }

  return {
    baselineLabel:
      matchedDayKeys.length > 0
        ? `${weekdayLabel(todayDow)} pattern from the last ${matchedDayKeys.length} week${matchedDayKeys.length === 1 ? "" : "s"}`
        : "No weekday pattern yet",
    baselineCount: matchedDayKeys.length,
    peakHour: peakHourRow.averageRevenuePaise > 0 ? peakHourRow.hour : null,
    peakHourLabel:
      peakHourRow.averageRevenuePaise > 0
        ? `${hourLabel(peakHourRow.hour)}–${hourLabel(peakHourRow.hour + 1)}`
        : null,
    peakWindowStartHour,
    peakWindowEndHour,
    peakWindowSharePct,
    hours,
  };
}

function buildFreshness(args: {
  lastUpload: string | null;
  latestOrder: string | null;
  now?: Date;
}): DashboardFreshness {
  const { lastUpload, latestOrder, now = new Date() } = args;
  const reference = lastUpload ?? latestOrder;
  const href = "/ingest";

  if (!reference) {
    return {
      state: "critical",
      headline: "No committed sales ingestion yet.",
      detail: "Upload your latest Petpooja, Pine Labs, or Swiggy files to populate the dashboard.",
      href,
      lastUpload,
      latestOrder,
    };
  }

  const hoursSince = Math.max(
    0,
    (now.getTime() - new Date(reference).getTime()) / (60 * 60 * 1000)
  );
  const latestOrderText = latestOrder
    ? `Most recent order: ${formatIstDateTime(new Date(latestOrder))}.`
    : null;

  if (hoursSince <= 24) {
    return {
      state: "fresh",
      headline: `Data updated ${Math.round(hoursSince)} hour${Math.round(hoursSince) === 1 ? "" : "s"} ago.`,
      detail: latestOrderText,
      href,
      lastUpload,
      latestOrder,
    };
  }

  if (hoursSince <= 48) {
    return {
      state: "stale",
      headline: `Data is ${Math.round(hoursSince / 24)} day${Math.round(hoursSince / 24) === 1 ? "" : "s"} old. Upload recent files for current numbers.`,
      detail: latestOrderText,
      href,
      lastUpload,
      latestOrder,
    };
  }

  if (hoursSince <= 24 * 7) {
    return {
      state: "very-stale",
      headline: `Data is ${Math.round(hoursSince / 24)} days stale.`,
      detail: latestOrder
        ? `The dashboard below reflects orders through ${formatIstDate(new Date(latestOrder))}.`
        : latestOrderText,
      href,
      lastUpload,
      latestOrder,
    };
  }

  return {
    state: "critical",
    headline: `Data is more than a week old.`,
    detail: latestOrder
      ? `The dashboard below reflects orders through ${formatIstDate(new Date(latestOrder))}, not today.`
      : latestOrderText,
    href,
    lastUpload,
    latestOrder,
  };
}

export function buildRevenueDipAlert(args: {
  subjectDayIso: string;
  subjectRevenuePaise: number;
  trailingAveragePaise: number;
}): { id: string; severity: "warn"; message: string } | null {
  const { subjectDayIso, subjectRevenuePaise, trailingAveragePaise } = args;
  if (trailingAveragePaise <= 0) return null;
  if (subjectRevenuePaise >= trailingAveragePaise * 0.7) return null;

  const belowPct = Math.round(
    ((trailingAveragePaise - subjectRevenuePaise) / trailingAveragePaise) * 100
  );
  return {
    id: `revenue-dip-${subjectDayIso}`,
    severity: "warn",
    message: `Yesterday's revenue was ${belowPct}% below the 14-day average.`,
  };
}

export function buildFreshnessMessage(freshness: LegacyDashboardFreshness): {
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

function buildMorningAlerts(args: {
  targetDay: MorningCheckCard;
  baseline: DoWBaseline;
  rows: SalesOrderRow[];
}): MorningCheckAlert[] {
  const alerts: MorningCheckAlert[] = [];
  const { targetDay, baseline, rows } = args;

  if (baseline.deviationPct != null && Math.abs(baseline.deviationPct) >= 30) {
    alerts.push({
      id: `unusual-day-${targetDay.dayKey}`,
      tone: "warn",
      headline: `Unusual ${targetDay.weekdayLabel.toLowerCase()}`,
      detail: `${targetDay.weekdayLabel} was ${Math.round(Math.abs(baseline.deviationPct))}% ${baseline.deviationPct > 0 ? "above" : "below"} average. ₹${Math.round(targetDay.revenuePaise / 100).toLocaleString("en-IN")} vs ₹${Math.round(baseline.averageRevenuePaise / 100).toLocaleString("en-IN")} typical.`,
    });
  }

  const targetRows = rows.filter((row) => getDayKey(row.ordered_at) === targetDay.dayKey);
  const targetCounts = new Map<DashboardChannel, number>();
  CHANNELS.forEach((channel) => targetCounts.set(channel, 0));
  targetRows.forEach((row) =>
    targetCounts.set(row.channel, (targetCounts.get(row.channel) ?? 0) + 1)
  );

  const priorDays = enumerateDayKeys(
    addIstDays(dateFromDayKey(targetDay.dayKey), -7).toISOString(),
    dateFromDayKey(targetDay.dayKey).toISOString()
  );
  CHANNELS.forEach((channel) => {
    if ((targetCounts.get(channel) ?? 0) > 0) return;
    const averages = priorDays.map(
      (dayKey) =>
        rows.filter((row) => getDayKey(row.ordered_at) === dayKey && row.channel === channel).length
    );
    const average =
      averages.length > 0 ? averages.reduce((sum, value) => sum + value, 0) / averages.length : 0;
    if (average <= 0) return;

    alerts.push({
      id: `stale-channel-${targetDay.dayKey}-${channel}`,
      tone: "info",
      headline: `No ${channelLabel(channel)} orders`,
      detail: `No ${channelLabel(channel).toLowerCase()} orders landed on ${targetDay.weekdayLabel}. Typical recent pace: ${average.toFixed(1)} order${average >= 1.5 ? "s" : ""} per day.`,
    });
  });

  return alerts;
}

function buildRevenueSeries(
  dayMap: Map<string, DayStats>,
  period: { start: string; end: string }
): RevenuePoint[] {
  const dayKeys = enumerateDayKeys(period.start, period.end);

  return dayKeys.map((dayKey) => {
    const stats = dayMap.get(dayKey) ?? {
      dayKey,
      revenuePaise: 0,
      orders: 0,
      discountPaise: 0,
      channels: {
        dine_in: 0,
        takeaway: 0,
        swiggy: 0,
        zomato: 0,
        other: 0,
      },
    };

    const trailingKeys = Array.from({ length: 28 }, (_, index) =>
      getDayKey(addIstDays(dateFromDayKey(dayKey), -27 + index).toISOString())
    );
    const trailingRevenue = trailingKeys.map((key) => dayMap.get(key)?.revenuePaise ?? 0);
    const movingAveragePaise =
      trailingRevenue.length > 0
        ? Math.round(
            trailingRevenue.reduce((sum, value) => sum + value, 0) / trailingRevenue.length
          )
        : null;

    const baselineDays = Array.from(dayMap.values())
      .filter(
        (row) =>
          row.dayKey < dayKey && getDayOfWeekFromKey(row.dayKey) === getDayOfWeekFromKey(dayKey)
      )
      .sort((left, right) => (left.dayKey < right.dayKey ? 1 : -1))
      .slice(0, 4);

    const baselineAverage =
      baselineDays.length > 0
        ? baselineDays.reduce((sum, row) => sum + row.revenuePaise, 0) / baselineDays.length
        : 0;
    const dowDeviationPct =
      baselineDays.length > 0 ? percentChange(stats.revenuePaise, baselineAverage) : null;
    const dayOfWeek = getDayOfWeekFromKey(dayKey);

    return {
      dayKey,
      shortLabel: formatIstDate(dateFromDayKey(dayKey), { day: "2-digit", month: "short" }),
      weekdayLabel: weekdayShortLabel(dayOfWeek),
      dayOfWeek,
      revenuePaise: stats.revenuePaise,
      orders: stats.orders,
      movingAveragePaise,
      dowDeviationPct,
      ribbonTone: ribbonToneFromDeviation(dowDeviationPct),
      channels: stats.channels,
    };
  });
}

function buildDoWPattern(points: RevenuePoint[]): DoWPatternPoint[] {
  const rows = Array.from({ length: 7 }, (_, index) => {
    const dayOfWeek = index + 1;
    const matching = points.filter((point) => point.dayOfWeek === dayOfWeek);
    const averageRevenuePaise =
      matching.length > 0
        ? Math.round(matching.reduce((sum, point) => sum + point.revenuePaise, 0) / matching.length)
        : 0;

    return {
      dayOfWeek,
      label: weekdayLabel(dayOfWeek),
      averageRevenuePaise,
      daysCount: matching.length,
      isHighest: false,
      isLowest: false,
    };
  });

  const nonZero = rows.filter((row) => row.daysCount > 0);
  const highest = nonZero.reduce(
    (best, current) => (current.averageRevenuePaise > best.averageRevenuePaise ? current : best),
    nonZero[0] ?? rows[0]!
  );
  const lowest = nonZero.reduce(
    (best, current) => (current.averageRevenuePaise < best.averageRevenuePaise ? current : best),
    nonZero[0] ?? rows[0]!
  );

  return rows.map((row) => ({
    ...row,
    isHighest: row.dayOfWeek === highest.dayOfWeek && highest.daysCount > 0,
    isLowest: row.dayOfWeek === lowest.dayOfWeek && lowest.daysCount > 0,
  }));
}

function rawValueToString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number") return String(value);
  return null;
}

function extractCouponCode(rawData: unknown): string | null {
  if (!rawData || typeof rawData !== "object") return null;

  const candidates = [
    "coupon",
    "coupon code",
    "couponcode",
    "promo",
    "promo code",
    "promocode",
    "offer code",
    "offercode",
    "discount code",
    "discountcode",
  ];

  for (const [key, value] of Object.entries(rawData as Record<string, unknown>)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!candidates.some((candidate) => normalizedKey === candidate.replace(/[^a-z0-9]/g, ""))) {
      continue;
    }

    const text = rawValueToString(value);
    if (!text) continue;

    const cleaned = text.toUpperCase().replace(/\s+/g, "");
    if (cleaned.length >= 3 && cleaned !== "NA" && cleaned !== "N/A" && cleaned !== "NULL") {
      return cleaned;
    }
  }

  return null;
}

export function resolveDashboardPeriod(
  searchParams: Record<string, string | string[] | undefined>,
  now = new Date()
): DashboardPeriod {
  const rawPeriod = Array.isArray(searchParams.period)
    ? searchParams.period[0]
    : searchParams.period;
  const key: DashboardPeriodKey =
    rawPeriod === "today" ||
    rawPeriod === "yesterday" ||
    rawPeriod === "7d" ||
    rawPeriod === "30d" ||
    rawPeriod === "mtd" ||
    rawPeriod === "custom"
      ? rawPeriod
      : "30d";

  const todayStart = startOfIstDay(now);
  let start = todayStart;
  let end = addIstDays(todayStart, 1);
  let label = "Last 30 days";
  let customStart: string | undefined;
  let customEnd: string | undefined;

  switch (key) {
    case "today":
      label = "Today";
      end = now;
      break;
    case "yesterday":
      label = "Yesterday";
      start = addIstDays(todayStart, -1);
      end = todayStart;
      break;
    case "7d":
      label = "Last 7 days";
      start = addIstDays(todayStart, -7);
      end = todayStart;
      break;
    case "30d":
      label = "Last 30 days";
      start = addIstDays(todayStart, -30);
      end = todayStart;
      break;
    case "mtd": {
      const parts = getIstParts(now);
      label = "Month to date";
      start = makeUtcFromIst(parts.year, parts.month, 1, 0);
      end = todayStart;
      break;
    }
    case "custom": {
      customStart = Array.isArray(searchParams.start) ? searchParams.start[0] : searchParams.start;
      customEnd = Array.isArray(searchParams.end) ? searchParams.end[0] : searchParams.end;
      const parsedStart = customStart
        ? new Date(`${customStart}T00:00:00+05:30`)
        : addIstDays(todayStart, -29);
      const parsedEnd = customEnd ? new Date(`${customEnd}T00:00:00+05:30`) : todayStart;
      const safeStart = Number.isNaN(parsedStart.getTime())
        ? addIstDays(todayStart, -29)
        : parsedStart;
      const safeEnd = Number.isNaN(parsedEnd.getTime()) ? todayStart : parsedEnd;
      const orderedStart = safeStart <= safeEnd ? safeStart : safeEnd;
      const orderedEnd = safeStart <= safeEnd ? safeEnd : safeStart;
      start = orderedStart;
      end = addIstDays(orderedEnd, 1);
      if (end.getTime() - start.getTime() > 366 * DAY_MS) {
        end = addIstDays(start, 366);
      }
      label = "Custom";
      break;
    }
  }

  const duration = Math.max(end.getTime() - start.getTime(), DAY_MS);
  const compareEnd = start;
  const compareStart = new Date(compareEnd.getTime() - duration);

  return {
    key,
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

export async function getMorningCheck(outletId: string): Promise<MorningCheckData | null> {
  const supabase = await createClient();
  const lookbackStart = addIstDays(startOfIstDay(new Date()), -84).toISOString();

  const [{ data: latestUploadRows }, { data: latestOrderRows }, { data: salesRows }] =
    await Promise.all([
      supabase
        .from("active_ingestion_runs")
        .select("committed_at")
        .eq("outlet_id", outletId)
        .eq("status", "committed")
        .order("committed_at", { ascending: false })
        .limit(1),
      supabase
        .from("active_sales_orders")
        .select("ordered_at")
        .eq("outlet_id", outletId)
        .eq("status", "success")
        .order("ordered_at", { ascending: false })
        .limit(1),
      supabase
        .from("active_sales_orders")
        .select(
          "id, outlet_id, ordered_at, channel, source, status, total_amount_paise, gross_amount_paise, discount_amount_paise, aggregator_commission_paise, aggregator_fees_paise, aggregator_net_payout_paise, customer_id, raw_data"
        )
        .eq("outlet_id", outletId)
        .eq("status", "success")
        .gte("ordered_at", lookbackStart)
        .order("ordered_at", { ascending: true }),
    ]);

  const freshness = buildFreshness({
    lastUpload: latestUploadRows?.[0]?.committed_at ?? null,
    latestOrder: latestOrderRows?.[0]?.ordered_at ?? null,
  });

  const rows = (salesRows ?? []) as SalesOrderRow[];
  if (rows.length === 0) return null;

  const dayMap = buildDayStatsMap(rows);
  const yesterdayKey = getDayKey(addIstDays(startOfIstDay(new Date()), -1).toISOString());
  const availableDayKeys = Array.from(dayMap.keys()).sort();
  const targetDayKey = dayMap.has(yesterdayKey)
    ? yesterdayKey
    : availableDayKeys[availableDayKeys.length - 1]!;
  const targetStats = dayMap.get(targetDayKey)!;
  const dayOfWeek = getDayOfWeekFromKey(targetDayKey);
  const targetDay: MorningCheckCard = {
    dayKey: targetDayKey,
    dayLabel: getDayLabel(targetDayKey),
    weekdayLabel: weekdayLabel(dayOfWeek),
    revenuePaise: targetStats.revenuePaise,
    orders: targetStats.orders,
    aovPaise:
      targetStats.orders > 0 ? Math.round(targetStats.revenuePaise / targetStats.orders) : 0,
  };

  const baseline = computeDoWBaseline(dayMap, targetDayKey);
  const rushPattern = buildRushPattern(rows);
  const alerts = buildMorningAlerts({ targetDay, baseline, rows });

  return {
    freshness,
    targetDay,
    baseline,
    rushPattern,
    alerts,
  };
}

export async function getPeriodView(
  outletId: string,
  period: DashboardPeriod,
  compare: boolean
): Promise<PeriodViewData> {
  const supabase = await createClient();
  const historicalStart = addIstDays(
    new Date(compare && period.compareStart ? period.compareStart : period.start),
    -35
  );
  const fetchStart = historicalStart.toISOString();

  const { data } = await supabase
    .from("active_sales_orders")
    .select(
      "id, outlet_id, ordered_at, channel, source, status, total_amount_paise, gross_amount_paise, discount_amount_paise, aggregator_commission_paise, aggregator_fees_paise, aggregator_net_payout_paise, customer_id, raw_data"
    )
    .eq("outlet_id", outletId)
    .eq("status", "success")
    .gte("ordered_at", fetchStart)
    .lt("ordered_at", period.end)
    .order("ordered_at", { ascending: true });

  const rows = (data ?? []) as SalesOrderRow[];
  const dayMap = buildDayStatsMap(rows);
  const current = buildRevenueSeries(dayMap, { start: period.start, end: period.end });
  const previous =
    compare && period.compareStart && period.compareEnd
      ? buildRevenueSeries(dayMap, { start: period.compareStart, end: period.compareEnd })
      : null;

  return {
    period,
    rangeLabel: formatCompactPeriodLabel(new Date(period.start), new Date(period.end)),
    current,
    previous,
    dowPattern: buildDoWPattern(current),
  };
}

export async function getChannelEconomics(
  outletId: string,
  period: DashboardPeriod
): Promise<ChannelEconomicsRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("active_sales_orders")
    .select(
      "channel, source, total_amount_paise, aggregator_commission_paise, aggregator_fees_paise, aggregator_net_payout_paise"
    )
    .eq("outlet_id", outletId)
    .eq("status", "success")
    .gte("ordered_at", period.start)
    .lt("ordered_at", period.end);

  const rows = (
    (data ?? []) as Array<{
      channel: DashboardChannel;
      source: string;
      total_amount_paise: number | string;
      aggregator_commission_paise: number | string | null;
      aggregator_fees_paise: number | string | null;
      aggregator_net_payout_paise: number | string | null;
    }>
  ).filter((row) => row.channel !== "other" || toNumber(row.total_amount_paise) > 0);

  return CHANNELS.map((channel) => {
    const channelRows = rows.filter((row) => row.channel === channel);
    const grossPaise = channelRows.reduce((sum, row) => sum + toNumber(row.total_amount_paise), 0);
    const commissionPaise = channelRows.reduce(
      (sum, row) => sum + toNumber(row.aggregator_commission_paise),
      0
    );
    const feesPaise = channelRows.reduce(
      (sum, row) => sum + toNumber(row.aggregator_fees_paise),
      0
    );
    const netPaise = channelRows.reduce((sum, row) => {
      const explicitNet = toNumber(row.aggregator_net_payout_paise);
      return (
        sum +
        (explicitNet > 0
          ? explicitNet
          : toNumber(row.total_amount_paise) -
            toNumber(row.aggregator_commission_paise) -
            toNumber(row.aggregator_fees_paise))
      );
    }, 0);

    return {
      channel,
      label: channelLabel(channel),
      orders: channelRows.length,
      grossPaise,
      commissionPaise,
      feesPaise,
      netPaise:
        channel === "dine_in" || channel === "takeaway" || channel === "other"
          ? grossPaise
          : Math.max(netPaise, 0),
      netPerRs100:
        grossPaise > 0
          ? ((channel === "dine_in" || channel === "takeaway" || channel === "other"
              ? grossPaise
              : Math.max(netPaise, 0)) /
              grossPaise) *
            100
          : null,
      awaitingParser: channel === "zomato" && channelRows.length === 0,
    };
  });
}

export async function getDiscountPerformance(
  outletId: string,
  period: DashboardPeriod
): Promise<DiscountPerformanceData> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("active_sales_orders")
    .select("gross_amount_paise, discount_amount_paise, total_amount_paise, raw_data")
    .eq("outlet_id", outletId)
    .eq("status", "success")
    .gte("ordered_at", period.start)
    .lt("ordered_at", period.end);

  const rows = (data ?? []) as Array<{
    gross_amount_paise: number | string;
    discount_amount_paise: number | string;
    total_amount_paise: number | string;
    raw_data: unknown;
  }>;

  const discounted = rows.filter((row) => toNumber(row.discount_amount_paise) > 0);
  const fullPrice = rows.filter((row) => toNumber(row.discount_amount_paise) <= 0);
  const totalDiscountPaise = discounted.reduce(
    (sum, row) => sum + toNumber(row.discount_amount_paise),
    0
  );
  const averageDiscountPct =
    discounted.length > 0
      ? discounted.reduce((sum, row) => {
          const gross = toNumber(row.gross_amount_paise);
          const discount = toNumber(row.discount_amount_paise);
          return sum + (gross > 0 ? (discount / gross) * 100 : 0);
        }, 0) / discounted.length
      : null;

  const couponMap = new Map<string, DiscountCouponRow>();
  discounted.forEach((row) => {
    const code = extractCouponCode(row.raw_data);
    if (!code) return;
    const current = couponMap.get(code) ?? { code, orders: 0, discountPaise: 0 };
    current.orders += 1;
    current.discountPaise += toNumber(row.discount_amount_paise);
    couponMap.set(code, current);
  });

  return {
    discountedOrders: discounted.length,
    fullPriceOrders: fullPrice.length,
    totalDiscountPaise,
    averageDiscountPct,
    discountedAovPaise:
      discounted.length > 0
        ? Math.round(
            discounted.reduce((sum, row) => sum + toNumber(row.total_amount_paise), 0) /
              discounted.length
          )
        : null,
    fullPriceAovPaise:
      fullPrice.length > 0
        ? Math.round(
            fullPrice.reduce((sum, row) => sum + toNumber(row.total_amount_paise), 0) /
              fullPrice.length
          )
        : null,
    topCoupons: Array.from(couponMap.values())
      .sort((left, right) => right.discountPaise - left.discountPaise)
      .slice(0, 3),
  };
}

export async function getCustomerTiles(
  outletId: string,
  period: DashboardPeriod
): Promise<CustomerTilesData> {
  const supabase = await createClient();
  const [{ data: periodOrders }, { data: profiles }, { data: upiRows }] = await Promise.all([
    supabase
      .from("active_sales_orders")
      .select("customer_id")
      .eq("outlet_id", outletId)
      .eq("status", "success")
      .gte("ordered_at", period.start)
      .lt("ordered_at", period.end)
      .not("customer_id", "is", null),
    supabase
      .from("active_customer_profiles")
      .select("id, first_seen_at, last_seen_at, total_orders, highest_segment"),
    supabase
      .from("active_payment_transactions")
      .select("upi_vpa, transaction_type, source")
      .eq("outlet_id", outletId)
      .eq("source", "pine_labs")
      .eq("transaction_type", "upi")
      .gte("transacted_at", period.start)
      .lt("transacted_at", period.end)
      .not("upi_vpa", "is", null),
  ]);

  const customerIds = Array.from(
    new Set(
      ((periodOrders ?? []) as Array<{ customer_id: string | null }>)
        .map((row) => row.customer_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const profileMap = new Map(
    ((profiles ?? []) as CustomerProfileRow[]).map((row) => [row.id, row])
  );

  let newCount = 0;
  let returningCount = 0;
  let regularCount = 0;

  customerIds.forEach((customerId) => {
    const profile = profileMap.get(customerId);
    if (!profile) return;
    if (new Date(profile.first_seen_at) >= new Date(period.start)) newCount += 1;
    else returningCount += 1;
    if (profile.total_orders >= 3) regularCount += 1;
  });

  const vpaCounts = new Map<string, number>();
  ((upiRows ?? []) as PaymentTransactionRow[]).forEach((row) => {
    if (!row.upi_vpa) return;
    vpaCounts.set(row.upi_vpa, (vpaCounts.get(row.upi_vpa) ?? 0) + 1);
  });

  const totalVpas = vpaCounts.size;
  const repeatVpas = Array.from(vpaCounts.values()).filter((count) => count >= 2).length;

  return {
    newCount,
    returningCount,
    repeatPct: customerIds.length > 0 ? (returningCount / customerIds.length) * 100 : null,
    regularCount,
    dineInRepeatPct: totalVpas > 0 ? (repeatVpas / totalVpas) * 100 : null,
  };
}
