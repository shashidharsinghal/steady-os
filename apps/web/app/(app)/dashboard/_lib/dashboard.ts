import { createClient } from "@/lib/supabase/server";
import { formatRelativeDistance } from "@stride-os/shared";

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const CHANNELS = ["dine_in", "takeaway", "swiggy", "zomato", "other"] as const;

// `new Intl.DateTimeFormat(...)` is surprisingly expensive (≈10–50µs per call).
// The dashboard helpers used to call it inside tight per-row loops, which dwarfed
// the actual aggregation work. We hoist these to module scope so each formatter
// is constructed once for the lifetime of the server process.
const DAY_KEY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const HOUR_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  hourCycle: "h23",
});
const SHORT_WEEKDAY_FMT = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
});
const WEEKDAY_INDEX = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export type DashboardPeriodKey = "today" | "yesterday" | "7d" | "30d" | "mtd" | "custom";
export type DashboardChannel = (typeof CHANNELS)[number];
export type DashboardFreshnessState = "fresh" | "stale" | "critical";
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
  settlement_status: "settled" | "pending" | "unknown";
  customer_id: string | null;
  raw_data: unknown;
};

// Narrow row used by morning check + period view. Selecting fewer columns
// (and especially dropping the JSONB `raw_data`) is the single biggest
// payload-size win on the dashboard.
type MorningSalesRow = Pick<
  SalesOrderRow,
  "ordered_at" | "channel" | "total_amount_paise" | "discount_amount_paise"
>;

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
  fallbackLabel: string | null;
  mode: "target_day" | "all_days" | "insufficient";
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
  ordersTotal: number;
  ordersSettled: number;
  ordersPending: number;
  grossPaise: number;
  commissionPaise: number | null;
  feesPaise: number | null;
  netPaise: number | null;
  netPerRs100: number | null;
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

export type ItemPerformanceData = {
  byCategory: Array<{ category: string; qty: number; revenuePaise: number }>;
  topItems: Array<{ item: string; category: string | null; qty: number; revenuePaise: number }>;
};

export type PaymentMethodBreakdownRow = {
  method: string;
  totalPaise: number;
  orderCount: number;
  pct: number;
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

// Cache built-on-demand IST date formatters keyed by their option object.
// `formatIstDate` is called with a small handful of distinct option objects,
// so this turns ~thousands of `new Intl.DateTimeFormat` allocations into a
// handful of Map lookups.
const IST_DATE_FMT_CACHE = new Map<string, Intl.DateTimeFormat>();
function istDateFormatter(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const merged: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  };
  const key = JSON.stringify(merged);
  let cached = IST_DATE_FMT_CACHE.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-IN", merged);
    IST_DATE_FMT_CACHE.set(key, cached);
  }
  return cached;
}

export function formatIstDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
  return istDateFormatter(options).format(date);
}

const IST_DATE_TIME_FMT = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatIstDateTime(date: Date): string {
  return IST_DATE_TIME_FMT.format(date);
}

export function formatCompactPeriodLabel(start: Date, endExclusive: Date): string {
  const end = new Date(endExclusive.getTime() - 1);
  return `${formatIstDate(start)} – ${formatIstDate(end)}`;
}

function getDayKey(iso: string): string {
  return DAY_KEY_FMT.format(new Date(iso));
}

function dateFromDayKey(dayKey: string): Date {
  return new Date(`${dayKey}T00:00:00+05:30`);
}

// Memoize day-of-week per `YYYY-MM-DD` string. Day keys repeat heavily across
// every dashboard helper so once we've resolved a key once, every subsequent
// lookup is a Map hit.
const DOW_BY_DAY_KEY = new Map<string, number>();
function getDayOfWeekFromKey(dayKey: string): number {
  let cached = DOW_BY_DAY_KEY.get(dayKey);
  if (cached !== undefined) return cached;
  const label = SHORT_WEEKDAY_FMT.format(dateFromDayKey(dayKey));
  cached = (WEEKDAY_INDEX as readonly string[]).indexOf(label) + 1 || 1;
  // Bound the cache so a long-running server process can't grow it forever.
  if (DOW_BY_DAY_KEY.size > 5000) DOW_BY_DAY_KEY.clear();
  DOW_BY_DAY_KEY.set(dayKey, cached);
  return cached;
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

function buildDayStatsMap(rows: MorningSalesRow[]): Map<string, DayStats> {
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

function buildRushPattern(
  rows: Pick<MorningSalesRow, "ordered_at" | "total_amount_paise">[],
  now = new Date()
): RushPattern {
  const todayKey = getDayKey(now.toISOString());
  const todayDow = getDayOfWeekFromKey(todayKey);

  // One-shot enrichment: pay the date-parsing cost once per row instead of
  // 6+ times across the helpers below. The previous code re-derived dayKey
  // (via Intl.DateTimeFormat) on every filter pass — O(rows × hours × days).
  const enriched = rows.map((row) => {
    const date = new Date(row.ordered_at);
    return {
      dayKey: DAY_KEY_FMT.format(date),
      hour: Number(HOUR_FMT.format(date)),
      total: toNumber(row.total_amount_paise),
    };
  });

  const historicalRows = enriched.filter((row) => row.dayKey < todayKey);
  const candidateRows = historicalRows.filter(
    (row) => getDayOfWeekFromKey(row.dayKey) === todayDow
  );

  // Pre-bucket counts per day so "qualified day" filtering doesn't re-scan rows.
  const candidateCountsByDay = new Map<string, number>();
  candidateRows.forEach((row) => {
    candidateCountsByDay.set(row.dayKey, (candidateCountsByDay.get(row.dayKey) ?? 0) + 1);
  });
  const qualifiedTargetDayKeys = Array.from(candidateCountsByDay.entries())
    .filter(([, count]) => count >= 3)
    .map(([key]) => key)
    .sort((left, right) => (left < right ? 1 : -1))
    .slice(0, 4);

  const historicalCountsByDay = new Map<string, number>();
  historicalRows.forEach((row) => {
    historicalCountsByDay.set(row.dayKey, (historicalCountsByDay.get(row.dayKey) ?? 0) + 1);
  });
  const qualifiedAllDayKeys = Array.from(historicalCountsByDay.entries())
    .filter(([, count]) => count >= 3)
    .map(([key]) => key)
    .sort((left, right) => (left < right ? 1 : -1))
    .slice(0, 28);

  let scopedRows: typeof enriched = [];
  let matchedDayKeys: string[] = [];
  let baselineLabel = "No weekday pattern yet";
  let fallbackLabel: string | null = null;
  let mode: RushPattern["mode"] = "insufficient";

  if (qualifiedTargetDayKeys.length >= 2) {
    matchedDayKeys = qualifiedTargetDayKeys;
    const matchedSet = new Set(matchedDayKeys);
    scopedRows = candidateRows.filter((row) => matchedSet.has(row.dayKey));
    baselineLabel = `${weekdayLabel(todayDow)} pattern from the last ${matchedDayKeys.length} week${matchedDayKeys.length === 1 ? "" : "s"}`;
    mode = "target_day";
  } else if (qualifiedAllDayKeys.length >= 2) {
    matchedDayKeys = qualifiedAllDayKeys;
    const matchedSet = new Set(matchedDayKeys);
    scopedRows = historicalRows.filter((row) => matchedSet.has(row.dayKey));
    baselineLabel = "Showing rush pattern across all weekdays";
    fallbackLabel = `Showing rush pattern for all weekdays (no ${weekdayLabel(todayDow)} data yet).`;
    mode = "all_days";
  } else {
    fallbackLabel = `Typical ${weekdayLabel(todayDow)} peak hour will show after 2 weeks of data.`;
  }

  // Single O(N) pass to bucket revenue by (dayKey, hour) instead of the prior
  // 13 × matchedDays.length × scopedRows.length filter sweep.
  const hourTotalsByDay = new Map<string, Map<number, number>>();
  scopedRows.forEach((row) => {
    let dayMap = hourTotalsByDay.get(row.dayKey);
    if (!dayMap) {
      dayMap = new Map<number, number>();
      hourTotalsByDay.set(row.dayKey, dayMap);
    }
    dayMap.set(row.hour, (dayMap.get(row.hour) ?? 0) + row.total);
  });

  const hours = Array.from({ length: 13 }, (_, index) => index + 11)
    .map((hour) => {
      const dailyTotals = matchedDayKeys.map(
        (dayKey) => hourTotalsByDay.get(dayKey)?.get(hour) ?? 0
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
    })
    .filter((row) => mode !== "insufficient" && row.averageRevenuePaise > 0);

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
    baselineLabel,
    baselineCount: matchedDayKeys.length,
    peakHour: peakHourRow.averageRevenuePaise > 0 ? peakHourRow.hour : null,
    peakHourLabel:
      peakHourRow.averageRevenuePaise > 0
        ? `${hourLabel(peakHourRow.hour)}–${hourLabel(peakHourRow.hour + 1)}`
        : null,
    peakWindowStartHour,
    peakWindowEndHour,
    peakWindowSharePct,
    fallbackLabel,
    mode,
    hours,
  };
}

function buildFreshness(args: {
  lastUpload: string | null;
  latestOrder: string | null;
  now?: Date;
}): DashboardFreshness {
  const { lastUpload, latestOrder, now = new Date() } = args;
  const href = "/ingest";

  if (!latestOrder && !lastUpload) {
    return {
      state: "critical",
      headline: "No committed sales ingestion yet.",
      detail: "Upload your latest Petpooja, Pine Labs, or Swiggy files to populate the dashboard.",
      href,
      lastUpload,
      latestOrder,
    };
  }

  const stalenessReference = latestOrder ? new Date(latestOrder) : new Date(lastUpload!);
  const hoursSinceLatestOrder = Math.max(
    0,
    (now.getTime() - stalenessReference.getTime()) / (60 * 60 * 1000)
  );
  const staleDays = Math.max(1, Math.round(hoursSinceLatestOrder / 24));
  const latestOrderText = latestOrder
    ? `Most recent order: ${formatRelativeDistance(new Date(latestOrder))}.`
    : null;

  if (hoursSinceLatestOrder < 36) {
    return {
      state: "fresh",
      headline: lastUpload
        ? `Data updated ${formatRelativeDistance(new Date(lastUpload))}.`
        : "Data is current.",
      detail: latestOrderText,
      href,
      lastUpload,
      latestOrder,
    };
  }

  if (hoursSinceLatestOrder <= 24 * 7) {
    return {
      state: "stale",
      headline: `Data is ${staleDays} day${staleDays === 1 ? "" : "s"} old. Upload recent files to see current numbers.`,
      detail: null,
      href,
      lastUpload,
      latestOrder,
    };
  }

  return {
    state: "critical",
    headline: `Data is ${staleDays} days stale.`,
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
      headline: `Data is ${freshness.staleDays ?? 0} days old. Upload recent files to see current numbers.`,
      detail: latestOrderText,
      href: "/ingest",
    };
  }

  return {
    headline: `Data is ${freshness.staleDays ?? 0} days stale. The dashboard below reflects orders through ${latestOrderText ? formatIstDate(new Date(freshness.latestOrder!)) : formatIstDate(lastUploadDate)}, not today.`,
    detail: latestOrderText,
    href: "/ingest",
  };
}

function buildMorningAlerts(args: {
  targetDay: MorningCheckCard;
  baseline: DoWBaseline;
  rows: Pick<MorningSalesRow, "ordered_at" | "channel">[];
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

  // Pre-bucket rows by (dayKey, channel) once, instead of filtering all rows
  // per channel per prior day (was O(rows × CHANNELS × priorDays)).
  const countsByDayChannel = new Map<string, Map<DashboardChannel, number>>();
  rows.forEach((row) => {
    const dayKey = getDayKey(row.ordered_at);
    let channelMap = countsByDayChannel.get(dayKey);
    if (!channelMap) {
      channelMap = new Map<DashboardChannel, number>();
      countsByDayChannel.set(dayKey, channelMap);
    }
    channelMap.set(row.channel, (channelMap.get(row.channel) ?? 0) + 1);
  });

  const targetCounts = new Map<DashboardChannel, number>();
  CHANNELS.forEach((channel) => targetCounts.set(channel, 0));
  const targetDayCounts = countsByDayChannel.get(targetDay.dayKey);
  if (targetDayCounts) {
    targetDayCounts.forEach((count, channel) => targetCounts.set(channel, count));
  }

  const priorDays = enumerateDayKeys(
    addIstDays(dateFromDayKey(targetDay.dayKey), -7).toISOString(),
    dateFromDayKey(targetDay.dayKey).toISOString()
  );
  CHANNELS.forEach((channel) => {
    if ((targetCounts.get(channel) ?? 0) > 0) return;
    const averages = priorDays.map((dayKey) => countsByDayChannel.get(dayKey)?.get(channel) ?? 0);
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

  // Pre-group dayMap by day-of-week once. Previously, for every period day we
  // re-scanned all of dayMap and called Intl-backed `getDayOfWeekFromKey` on
  // every entry — quadratic in the number of days held.
  const sortedByKey = Array.from(dayMap.values()).sort((left, right) =>
    left.dayKey < right.dayKey ? -1 : 1
  );
  const dowGroups = new Map<number, DayStats[]>();
  sortedByKey.forEach((row) => {
    const dow = getDayOfWeekFromKey(row.dayKey);
    const bucket = dowGroups.get(dow);
    if (bucket) bucket.push(row);
    else dowGroups.set(dow, [row]);
  });

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

    // 28-day trailing moving average. Build the date once and step backwards
    // by ms instead of re-deriving day keys via Intl on each iteration.
    const baseDate = dateFromDayKey(dayKey);
    let trailingTotal = 0;
    for (let offset = 27; offset >= 0; offset -= 1) {
      const trailingDate = new Date(baseDate.getTime() - offset * DAY_MS);
      const trailingKey = DAY_KEY_FMT.format(trailingDate);
      trailingTotal += dayMap.get(trailingKey)?.revenuePaise ?? 0;
    }
    const movingAveragePaise = Math.round(trailingTotal / 28);

    const dayOfWeek = getDayOfWeekFromKey(dayKey);
    const dowBucket = dowGroups.get(dayOfWeek) ?? [];
    // dowBucket is sorted ascending; we want the latest 4 priors.
    const baselineDays: DayStats[] = [];
    for (let i = dowBucket.length - 1; i >= 0 && baselineDays.length < 4; i -= 1) {
      const row = dowBucket[i]!;
      if (row.dayKey < dayKey) baselineDays.push(row);
    }

    const baselineAverage =
      baselineDays.length > 0
        ? baselineDays.reduce((sum, row) => sum + row.revenuePaise, 0) / baselineDays.length
        : 0;
    const dowDeviationPct =
      baselineDays.length > 0 ? percentChange(stats.revenuePaise, baselineAverage) : null;

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
      // Morning check only needs ordered_at, channel, totals & discount.
      // Dropping id/source/aggregator_*/settlement_status/customer_id/raw_data
      // shaves a large JSONB TOAST + several columns per row × 84 days of orders.
      supabase
        .from("active_sales_orders")
        .select("ordered_at, channel, total_amount_paise, discount_amount_paise")
        .eq("outlet_id", outletId)
        .eq("status", "success")
        .gte("ordered_at", lookbackStart)
        .order("ordered_at", { ascending: true }),
    ]);

  const freshness = buildFreshness({
    lastUpload: latestUploadRows?.[0]?.committed_at ?? null,
    latestOrder: latestOrderRows?.[0]?.ordered_at ?? null,
  });

  const rows = (salesRows ?? []) as MorningSalesRow[];
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

  // Period view only needs day-level aggregates: drop id/source/aggregator_*/customer_id/raw_data.
  // raw_data alone is the heaviest column (TOAST'd JSONB) and was unused here.
  const { data } = await supabase
    .from("active_sales_orders")
    .select("ordered_at, channel, total_amount_paise, discount_amount_paise")
    .eq("outlet_id", outletId)
    .eq("status", "success")
    .gte("ordered_at", fetchStart)
    .lt("ordered_at", period.end)
    .order("ordered_at", { ascending: true });

  const rows = (data ?? []) as MorningSalesRow[];
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
      "channel, source, total_amount_paise, aggregator_commission_paise, aggregator_fees_paise, aggregator_net_payout_paise, settlement_status"
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
      settlement_status: "settled" | "pending" | "unknown";
    }>
  ).filter((row) => row.channel !== "other" || toNumber(row.total_amount_paise) > 0);

  return CHANNELS.map((channel) => {
    const channelRows = rows.filter((row) => row.channel === channel);
    const grossPaise = channelRows.reduce((sum, row) => sum + toNumber(row.total_amount_paise), 0);
    const settledRows = channelRows.filter((row) => row.settlement_status === "settled");
    const pendingRows = channelRows.filter((row) => row.settlement_status === "pending");
    const settledGrossPaise = settledRows.reduce(
      (sum, row) => sum + toNumber(row.total_amount_paise),
      0
    );
    const commissionPaise =
      settledRows.length > 0
        ? settledRows.reduce((sum, row) => sum + toNumber(row.aggregator_commission_paise), 0)
        : null;
    const feesPaise =
      settledRows.length > 0
        ? settledRows.reduce((sum, row) => sum + toNumber(row.aggregator_fees_paise), 0)
        : null;
    const netPaise =
      settledRows.length > 0
        ? settledRows.reduce((sum, row) => {
            const explicitNet = toNumber(row.aggregator_net_payout_paise);
            return (
              sum +
              (explicitNet > 0
                ? explicitNet
                : toNumber(row.total_amount_paise) -
                  toNumber(row.aggregator_commission_paise) -
                  toNumber(row.aggregator_fees_paise))
            );
          }, 0)
        : null;

    const ordersSettled =
      channel === "dine_in" || channel === "takeaway" ? channelRows.length : settledRows.length;
    const ordersPending = channel === "dine_in" || channel === "takeaway" ? 0 : pendingRows.length;

    return {
      channel,
      label: channelLabel(channel),
      ordersTotal: channelRows.length,
      ordersSettled,
      ordersPending,
      grossPaise,
      commissionPaise,
      feesPaise,
      netPaise:
        channel === "dine_in" || channel === "takeaway"
          ? grossPaise
          : channel === "other"
            ? null
            : netPaise != null
              ? Math.max(netPaise, 0)
              : null,
      netPerRs100:
        channel === "dine_in" || channel === "takeaway"
          ? grossPaise > 0
            ? 100
            : null
          : netPaise != null && settledGrossPaise > 0
            ? (Math.max(netPaise, 0) / settledGrossPaise) * 100
            : null,
    };
  });
}

export async function getDiscountPerformance(
  outletId: string,
  period: DashboardPeriod
): Promise<DiscountPerformanceData> {
  const supabase = await createClient();
  // Split this fetch in two: a lean aggregation query without `raw_data` for
  // every order, and a second query that only pulls `raw_data` for rows that
  // actually had a discount (the only rows from which we extract coupon
  // codes). Discounted rows are typically a small minority, so this cuts the
  // total JSONB transfer dramatically vs. the previous single fat query.
  const [{ data: aggregateData }, { data: couponData }] = await Promise.all([
    supabase
      .from("active_sales_orders")
      .select("gross_amount_paise, discount_amount_paise, total_amount_paise")
      .eq("outlet_id", outletId)
      .eq("status", "success")
      .gte("ordered_at", period.start)
      .lt("ordered_at", period.end),
    supabase
      .from("active_sales_orders")
      .select("discount_amount_paise, raw_data")
      .eq("outlet_id", outletId)
      .eq("status", "success")
      .gte("ordered_at", period.start)
      .lt("ordered_at", period.end)
      .gt("discount_amount_paise", 0),
  ]);

  const rows = (aggregateData ?? []) as Array<{
    gross_amount_paise: number | string;
    discount_amount_paise: number | string;
    total_amount_paise: number | string;
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
  (
    (couponData ?? []) as Array<{ discount_amount_paise: number | string; raw_data: unknown }>
  ).forEach((row) => {
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
  const [{ data: periodOrders }, { data: upiRows }] = await Promise.all([
    supabase
      .from("active_sales_orders")
      .select("customer_id")
      .eq("outlet_id", outletId)
      .eq("status", "success")
      .gte("ordered_at", period.start)
      .lt("ordered_at", period.end)
      .not("customer_id", "is", null),
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

  const profileRows =
    customerIds.length > 0
      ? ((
          await supabase
            .from("active_customer_profiles")
            .select("id, first_seen_at, total_orders")
            .in("id", customerIds)
        ).data ?? [])
      : [];

  const profileMap = new Map(
    (profileRows as Array<Pick<CustomerProfileRow, "id" | "first_seen_at" | "total_orders">>).map(
      (row) => [row.id, row]
    )
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
  (
    (upiRows ?? []) as Array<{
      upi_vpa: string | null;
      transaction_type: string;
      source: string;
    }>
  ).forEach((row) => {
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

export async function getItemPerformance(
  outletId: string,
  period: DashboardPeriod
): Promise<ItemPerformanceData> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("dashboard_item_performance", {
    p_outlet_id: outletId,
    p_start: period.start,
    p_end: period.end,
  });

  const rows = (data ?? []) as Array<{
    kind: string;
    category: string | null;
    item_name: string | null;
    qty: number | string;
    revenue_paise: number | string;
  }>;

  return {
    byCategory: rows
      .filter((row) => row.kind === "category")
      .map((row) => ({
        category: row.category ?? "Uncategorised",
        qty: Number(row.qty),
        revenuePaise: toNumber(row.revenue_paise),
      }))
      .sort((left, right) => right.revenuePaise - left.revenuePaise)
      .slice(0, 5),
    topItems: rows
      .filter((row) => row.kind === "item" && row.item_name)
      .map((row) => ({
        item: row.item_name!,
        category: row.category,
        qty: Number(row.qty),
        revenuePaise: toNumber(row.revenue_paise),
      }))
      .sort((left, right) => right.revenuePaise - left.revenuePaise)
      .slice(0, 10),
  };
}

export async function getPaymentMethodBreakdown(
  outletId: string,
  period: DashboardPeriod
): Promise<PaymentMethodBreakdownRow[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("dashboard_payment_method_breakdown", {
    p_outlet_id: outletId,
    p_start: period.start,
    p_end: period.end,
  });

  const rows = (data ?? []) as Array<{
    method: string;
    total_paise: number | string;
    order_count: number | string;
  }>;
  const total = rows.reduce((sum, row) => sum + toNumber(row.total_paise), 0);

  return rows
    .map((row) => {
      const totalPaise = toNumber(row.total_paise);
      return {
        method: row.method,
        totalPaise,
        orderCount: Number(row.order_count),
        pct: total > 0 ? (totalPaise / total) * 100 : 0,
      };
    })
    .sort((left, right) => right.totalPaise - left.totalPaise);
}
