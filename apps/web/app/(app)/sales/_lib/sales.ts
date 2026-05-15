import type { DashboardChannel, DashboardPeriod } from "../../dashboard/_lib/dashboard";
import { createClient } from "@/lib/supabase/server";

const CHANNELS = ["dine_in", "takeaway", "swiggy", "zomato", "other"] as const;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const HOURS = Array.from({ length: 13 }, (_, index) => index + 11);

const DAY_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const DOW_FMT = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", weekday: "short" });
const HOUR_FMT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  hourCycle: "h23",
});

type OrderRow = {
  id: string;
  source: string;
  source_order_id: string;
  ordered_at: string;
  channel: DashboardChannel;
  total_amount_paise: number | string;
  gross_amount_paise: number | string;
  discount_amount_paise: number | string;
  aggregator_commission_paise: number | null;
  aggregator_fees_paise: number | null;
  aggregator_net_payout_paise: number | null;
  settlement_status: "settled" | "pending" | "unknown";
  customer_id: string | null;
};

type LineRow = {
  item_name: string;
  category: string | null;
  quantity: number;
  unit_price_paise: number;
  line_total_paise: number;
  sales_orders: {
    ordered_at: string;
    outlet_id: string;
    status: string;
    channel: DashboardChannel;
  } | null;
};

export type DailySummaryRow = {
  dayKey: string;
  dow: string;
  revenuePaise: number;
  orders: number;
  aovPaise: number;
  newCustomers: number;
  repeatCustomers: number;
  discountPct: number | null;
};

export type ItemPerformanceRow = {
  itemName: string;
  category: string | null;
  qty: number;
  revenuePaise: number;
  avgPricePaise: number;
  sharePct: number;
  marginPct: number | null;
  spark: number[];
};

export type HeatmapCell = {
  hour: number;
  dow: string;
  revenuePaise: number;
  orders: number;
  aovPaise: number;
};

export type ChannelEconomicsDetailRow = {
  channel: DashboardChannel;
  label: string;
  orders: number;
  grossPaise: number;
  commissionPaise: number | null;
  feesPaise: number | null;
  promoPaise: number;
  netPaise: number | null;
  netPerRs100: number | null;
  pendingOrders: number;
};

export type SalesOrderSortField =
  | "ordered_at"
  | "gross_amount_paise"
  | "discount_amount_paise"
  | "total_amount_paise"
  | "settlement_status";

export type SalesOrderSortDirection = "asc" | "desc";

export type SalesOrderFilters = {
  channel?: string;
  settlementStatus?: string;
  sortBy?: string;
  sortDir?: string;
};

export type NormalizedSalesOrderFilters = {
  channel: DashboardChannel | "";
  settlementStatus: "settled" | "pending" | "unknown" | "";
  sortBy: SalesOrderSortField;
  sortDir: SalesOrderSortDirection;
};

export type SalesOrderDetailRow = {
  id: string;
  source: string;
  sourceOrderId: string;
  orderedAt: string;
  channel: DashboardChannel;
  channelLabel: string;
  grossPaise: number;
  discountPaise: number;
  totalPaise: number;
  settlementStatus: "settled" | "pending" | "unknown";
};

function dayKey(value: string) {
  return DAY_FMT.format(new Date(value));
}

function dowLabel(value: string) {
  return DOW_FMT.format(new Date(value));
}

function hourOf(value: string) {
  return Number(HOUR_FMT.format(new Date(value)));
}

function channelLabel(channel: DashboardChannel) {
  return channel
    .split("_")
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function toPaise(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  return 0;
}

function isMissingColumnError(error: { message?: string } | null, columns: string[]) {
  const message = error?.message?.toLowerCase() ?? "";
  return columns.some((column) => message.includes(column.toLowerCase()));
}

export function normalizeSalesOrderFilters(
  filters: SalesOrderFilters = {}
): NormalizedSalesOrderFilters {
  const channel = CHANNELS.includes(filters.channel as DashboardChannel)
    ? (filters.channel as DashboardChannel)
    : "";
  const settlementStatus = ["settled", "pending", "unknown"].includes(
    filters.settlementStatus ?? ""
  )
    ? (filters.settlementStatus as NormalizedSalesOrderFilters["settlementStatus"])
    : "";
  const sortBy = [
    "ordered_at",
    "gross_amount_paise",
    "discount_amount_paise",
    "total_amount_paise",
    "settlement_status",
  ].includes(filters.sortBy ?? "")
    ? (filters.sortBy as SalesOrderSortField)
    : "ordered_at";
  const sortDir = filters.sortDir === "asc" ? "asc" : "desc";

  return { channel, settlementStatus, sortBy, sortDir };
}

async function getProfiles(customerIds: string[]) {
  if (customerIds.length === 0) return new Map<string, string>();
  const supabase = await createClient();
  const { data } = await supabase
    .from("active_customer_profiles")
    .select("id, first_seen_at")
    .in("id", customerIds);

  return new Map(
    ((data ?? []) as Array<{ id: string; first_seen_at: string }>).map((row) => [
      row.id,
      row.first_seen_at,
    ])
  );
}

export async function getDailySummary(
  outletId: string,
  period: DashboardPeriod
): Promise<DailySummaryRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("active_sales_orders")
    .select("id, ordered_at, total_amount_paise, discount_amount_paise, customer_id")
    .eq("outlet_id", outletId)
    .eq("status", "success")
    .gte("ordered_at", period.start)
    .lt("ordered_at", period.end)
    .order("ordered_at", { ascending: true });

  if (error) throw new Error(`Failed to load daily sales: ${error.message}`);
  const rows = (data ?? []) as OrderRow[];
  const profileMap = await getProfiles(
    Array.from(
      new Set(rows.map((row) => row.customer_id).filter((value): value is string => Boolean(value)))
    )
  );

  const byDay = new Map<
    string,
    DailySummaryRow & { discountPaise: number; customerIds: Set<string> }
  >();
  for (const row of rows) {
    const key = dayKey(row.ordered_at);
    const entry =
      byDay.get(key) ??
      ({
        dayKey: key,
        dow: dowLabel(row.ordered_at),
        revenuePaise: 0,
        orders: 0,
        aovPaise: 0,
        newCustomers: 0,
        repeatCustomers: 0,
        discountPct: null,
        discountPaise: 0,
        customerIds: new Set<string>(),
      } satisfies DailySummaryRow & { discountPaise: number; customerIds: Set<string> });

    entry.revenuePaise += toPaise(row.total_amount_paise);
    entry.discountPaise += toPaise(row.discount_amount_paise);
    entry.orders += 1;
    if (row.customer_id && !entry.customerIds.has(row.customer_id)) {
      entry.customerIds.add(row.customer_id);
      const firstSeen = profileMap.get(row.customer_id);
      if (firstSeen && dayKey(firstSeen) === key) entry.newCustomers += 1;
      else entry.repeatCustomers += 1;
    }
    byDay.set(key, entry);
  }

  return Array.from(byDay.values()).map(({ discountPaise, customerIds: _customerIds, ...row }) => ({
    ...row,
    aovPaise: row.orders > 0 ? Math.round(row.revenuePaise / row.orders) : 0,
    discountPct:
      row.revenuePaise + discountPaise > 0
        ? (discountPaise / (row.revenuePaise + discountPaise)) * 100
        : null,
  }));
}

export async function getItemPerformance(
  outletId: string,
  period: DashboardPeriod,
  filters: { category?: string; channel?: string; search?: string }
): Promise<ItemPerformanceRow[]> {
  const supabase = await createClient();
  let query = supabase
    .from("sales_line_items")
    .select(
      "item_name, category, quantity, unit_price_paise, line_total_paise, sales_orders!inner(ordered_at, outlet_id, status, channel)"
    )
    .eq("sales_orders.outlet_id", outletId)
    .eq("sales_orders.status", "success")
    .gte("sales_orders.ordered_at", period.start)
    .lt("sales_orders.ordered_at", period.end);

  if (filters.category) query = query.eq("category", filters.category);
  if (filters.search) query = query.ilike("item_name", `%${filters.search}%`);

  const [{ data, error }, { data: inventory }] = await Promise.all([
    query,
    supabase
      .from("active_inventory_items")
      .select("item_name, cost_to_prepare_paise")
      .eq("outlet_id", outletId),
  ]);

  if (error) throw new Error(`Failed to load item performance: ${error.message}`);
  const costMap = new Map(
    ((inventory ?? []) as Array<{ item_name: string; cost_to_prepare_paise: number | null }>).map(
      (row) => [row.item_name.toLowerCase(), row.cost_to_prepare_paise]
    )
  );

  const byItem = new Map<
    string,
    ItemPerformanceRow & { cogsPaise: number; dayMap: Map<string, number> }
  >();
  const rows = ((data ?? []) as LineRow[]).filter(
    (row) => !filters.channel || row.sales_orders?.channel === filters.channel
  );
  const totalRevenue = rows.reduce((sum, row) => sum + row.line_total_paise, 0);

  for (const row of rows) {
    const key = row.item_name;
    const entry =
      byItem.get(key) ??
      ({
        itemName: row.item_name,
        category: row.category,
        qty: 0,
        revenuePaise: 0,
        avgPricePaise: 0,
        sharePct: 0,
        marginPct: null,
        spark: [],
        cogsPaise: 0,
        dayMap: new Map<string, number>(),
      } satisfies ItemPerformanceRow & { cogsPaise: number; dayMap: Map<string, number> });
    entry.qty += row.quantity;
    entry.revenuePaise += row.line_total_paise;
    const cost = costMap.get(row.item_name.toLowerCase());
    if (cost != null) entry.cogsPaise += cost * row.quantity;
    const keyDay = row.sales_orders?.ordered_at ? dayKey(row.sales_orders.ordered_at) : "";
    if (keyDay) entry.dayMap.set(keyDay, (entry.dayMap.get(keyDay) ?? 0) + row.line_total_paise);
    byItem.set(key, entry);
  }

  return Array.from(byItem.values())
    .map(({ cogsPaise, dayMap, ...row }) => ({
      ...row,
      avgPricePaise: row.qty > 0 ? Math.round(row.revenuePaise / row.qty) : 0,
      sharePct: totalRevenue > 0 ? (row.revenuePaise / totalRevenue) * 100 : 0,
      marginPct:
        cogsPaise > 0 && row.revenuePaise > 0
          ? ((row.revenuePaise - cogsPaise) / row.revenuePaise) * 100
          : null,
      spark: Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([, value]) => value / 100),
    }))
    .sort((a, b) => b.revenuePaise - a.revenuePaise);
}

export async function getHourlyHeatmap(
  outletId: string,
  period: DashboardPeriod
): Promise<HeatmapCell[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("active_sales_orders")
    .select("ordered_at, total_amount_paise")
    .eq("outlet_id", outletId)
    .eq("status", "success")
    .gte("ordered_at", period.start)
    .lt("ordered_at", period.end);

  if (error) throw new Error(`Failed to load hourly heatmap: ${error.message}`);
  const map = new Map<string, HeatmapCell>();
  for (const dow of WEEKDAYS) {
    for (const hour of HOURS)
      map.set(`${dow}-${hour}`, { dow, hour, revenuePaise: 0, orders: 0, aovPaise: 0 });
  }

  for (const row of (data ?? []) as Array<{ ordered_at: string; total_amount_paise: number }>) {
    const hour = hourOf(row.ordered_at);
    const dow = dowLabel(row.ordered_at) as (typeof WEEKDAYS)[number];
    const entry = map.get(`${dow}-${hour}`);
    if (!entry) continue;
    entry.revenuePaise += row.total_amount_paise;
    entry.orders += 1;
  }

  return Array.from(map.values()).map((cell) => ({
    ...cell,
    aovPaise: cell.orders > 0 ? Math.round(cell.revenuePaise / cell.orders) : 0,
  }));
}

export async function listSalesOrders(
  outletId: string,
  period: DashboardPeriod,
  filters: SalesOrderFilters = {}
): Promise<SalesOrderDetailRow[]> {
  const supabase = await createClient();
  const normalized = normalizeSalesOrderFilters(filters);

  let query = supabase
    .from("active_sales_orders")
    .select(
      "id, source, source_order_id, ordered_at, channel, gross_amount_paise, discount_amount_paise, total_amount_paise, settlement_status"
    )
    .eq("outlet_id", outletId)
    .eq("status", "success")
    .gte("ordered_at", period.start)
    .lt("ordered_at", period.end)
    .order(normalized.sortBy, { ascending: normalized.sortDir === "asc" })
    .limit(100);

  if (normalized.channel) query = query.eq("channel", normalized.channel);
  if (normalized.settlementStatus) {
    query = query.eq("settlement_status", normalized.settlementStatus);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load sales orders: ${error.message}`);

  return ((data ?? []) as OrderRow[]).map((row) => ({
    id: row.id,
    source: row.source,
    sourceOrderId: row.source_order_id,
    orderedAt: row.ordered_at,
    channel: row.channel,
    channelLabel: channelLabel(row.channel),
    grossPaise: toPaise(row.gross_amount_paise),
    discountPaise: toPaise(row.discount_amount_paise),
    totalPaise: toPaise(row.total_amount_paise),
    settlementStatus: row.settlement_status,
  }));
}

export async function getChannelEconomicsDetail(
  outletId: string,
  period: DashboardPeriod
): Promise<ChannelEconomicsDetailRow[]> {
  const supabase = await createClient();
  const baseQuery = supabase
    .from("active_sales_orders")
    .select(
      "channel, gross_amount_paise, discount_amount_paise, total_amount_paise, aggregator_commission_paise, aggregator_fees_paise, aggregator_net_payout_paise, settlement_status"
    )
    .eq("outlet_id", outletId)
    .eq("status", "success")
    .gte("ordered_at", period.start);

  let { data, error } = await baseQuery.lt("ordered_at", period.end);
  if (
    error &&
    isMissingColumnError(error, [
      "settlement_status",
      "aggregator_commission_paise",
      "aggregator_fees_paise",
      "aggregator_net_payout_paise",
    ])
  ) {
    const fallback = await supabase
      .from("active_sales_orders")
      .select("channel, gross_amount_paise, discount_amount_paise, total_amount_paise")
      .eq("outlet_id", outletId)
      .eq("status", "success")
      .gte("ordered_at", period.start)
      .lt("ordered_at", period.end);
    data = fallback.data as typeof data;
    error = fallback.error;
  }

  if (error) throw new Error(`Failed to load channel economics: ${error.message}`);
  const map = new Map<DashboardChannel, ChannelEconomicsDetailRow>();
  for (const channel of CHANNELS) {
    map.set(channel, {
      channel,
      label: channelLabel(channel),
      orders: 0,
      grossPaise: 0,
      commissionPaise: null,
      feesPaise: null,
      promoPaise: 0,
      netPaise: null,
      netPerRs100: null,
      pendingOrders: 0,
    });
  }

  for (const row of (data ?? []) as OrderRow[]) {
    const entry = map.get(row.channel) ?? map.get("other")!;
    entry.orders += 1;
    entry.grossPaise += toPaise(row.gross_amount_paise) || toPaise(row.total_amount_paise);
    entry.promoPaise += toPaise(row.discount_amount_paise);
    if (row.settlement_status === "pending") entry.pendingOrders += 1;
    entry.commissionPaise = (entry.commissionPaise ?? 0) + (row.aggregator_commission_paise ?? 0);
    entry.feesPaise = (entry.feesPaise ?? 0) + (row.aggregator_fees_paise ?? 0);
    entry.netPaise =
      (entry.netPaise ?? 0) + (row.aggregator_net_payout_paise ?? toPaise(row.total_amount_paise));
  }

  return Array.from(map.values())
    .filter((row) => row.orders > 0)
    .map((row) => ({
      ...row,
      commissionPaise: row.commissionPaise === 0 ? null : row.commissionPaise,
      feesPaise: row.feesPaise === 0 ? null : row.feesPaise,
      netPerRs100:
        row.netPaise != null && row.grossPaise > 0 ? (row.netPaise / row.grossPaise) * 100 : null,
    }))
    .sort((a, b) => b.grossPaise - a.grossPaise);
}

export async function listSalesCategories(
  outletId: string,
  period: DashboardPeriod
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sales_line_items")
    .select("category, sales_orders!inner(ordered_at, outlet_id, status)")
    .eq("sales_orders.outlet_id", outletId)
    .eq("sales_orders.status", "success")
    .gte("sales_orders.ordered_at", period.start)
    .lt("sales_orders.ordered_at", period.end);

  return Array.from(
    new Set(
      ((data ?? []) as Array<{ category: string | null }>)
        .map((row) => row.category)
        .filter((value): value is string => Boolean(value))
    )
  ).sort();
}
