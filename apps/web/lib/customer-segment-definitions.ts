import {
  DEFAULT_CUSTOMER_SEGMENT_DEFINITIONS,
  type CustomerSegmentDefinition,
  type CustomerSegmentDefinitionInput,
} from "@stride-os/shared";
import { createClient } from "@/lib/supabase/server";

type OutletCustomerSnapshot = {
  customerId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  totalOrders: number;
  totalSpendPaise: number;
  ordersInWindows: Map<number, number>;
};

function daysSince(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

function normalizeDefinitionRow(
  row: CustomerSegmentDefinitionInput | CustomerSegmentDefinition
): CustomerSegmentDefinitionInput | CustomerSegmentDefinition {
  return {
    ...row,
    rule_params: Object.fromEntries(
      Object.entries(row.rule_params ?? {}).map(([key, value]) => [key, Number(value)])
    ),
  };
}

export async function listSegmentDefinitions(
  outletId: string
): Promise<CustomerSegmentDefinition[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_segment_definitions")
    .select("*")
    .eq("outlet_id", outletId)
    .order("display_order", { ascending: true });

  const rows = (data ?? []) as CustomerSegmentDefinition[];
  if (rows.length > 0) {
    return rows.map((row) => normalizeDefinitionRow(row) as CustomerSegmentDefinition);
  }

  return DEFAULT_CUSTOMER_SEGMENT_DEFINITIONS.map((definition) => ({
    id: crypto.randomUUID(),
    outlet_id: outletId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...definition,
  })) as CustomerSegmentDefinition[];
}

async function buildOutletCustomerSnapshots(
  outletId: string,
  requestedWindows: number[]
): Promise<OutletCustomerSnapshot[]> {
  const supabase = await createClient();
  const maxWindow = Math.max(...requestedWindows, 365);
  const from = new Date();
  from.setDate(from.getDate() - maxWindow);

  const { data: orders } = await supabase
    .from("active_sales_orders")
    .select("customer_id, ordered_at, total_amount_paise")
    .eq("outlet_id", outletId)
    .eq("status", "success")
    .not("customer_id", "is", null)
    .gte("ordered_at", from.toISOString())
    .order("ordered_at", { ascending: true });

  const snapshots = new Map<string, OutletCustomerSnapshot>();
  for (const row of (orders ?? []) as Array<{
    customer_id: string | null;
    ordered_at: string;
    total_amount_paise: number;
  }>) {
    if (!row.customer_id) continue;
    const current = snapshots.get(row.customer_id) ?? {
      customerId: row.customer_id,
      firstSeenAt: row.ordered_at,
      lastSeenAt: row.ordered_at,
      totalOrders: 0,
      totalSpendPaise: 0,
      ordersInWindows: new Map<number, number>(),
    };

    current.totalOrders += 1;
    current.totalSpendPaise += Number(row.total_amount_paise ?? 0);
    if (new Date(row.ordered_at).getTime() < new Date(current.firstSeenAt).getTime()) {
      current.firstSeenAt = row.ordered_at;
    }
    if (new Date(row.ordered_at).getTime() > new Date(current.lastSeenAt).getTime()) {
      current.lastSeenAt = row.ordered_at;
    }

    for (const windowDays of requestedWindows) {
      if (daysSince(row.ordered_at) <= windowDays) {
        current.ordersInWindows.set(windowDays, (current.ordersInWindows.get(windowDays) ?? 0) + 1);
      }
    }

    snapshots.set(row.customer_id, current);
  }

  return Array.from(snapshots.values());
}

function qualifiesForDefinition(
  snapshot: OutletCustomerSnapshot,
  definition: CustomerSegmentDefinitionInput,
  definitionsBySlot: Map<number, CustomerSegmentDefinitionInput>
): boolean {
  const params = definition.rule_params;

  switch (definition.rule_type) {
    case "first_seen_within_days":
      return daysSince(snapshot.firstSeenAt) <= Number(params.days ?? 0);
    case "order_count_in_window": {
      const windowDays = Number(params.window_days ?? 0);
      const minOrders = Number(params.min_orders ?? 0);
      return (snapshot.ordersInWindows.get(windowDays) ?? 0) >= minOrders;
    }
    case "returning_at_least_n": {
      const minOrders = Number(params.min_orders ?? 0);
      const withinDays = Number(params.last_seen_within_days ?? 0);
      return snapshot.totalOrders >= minOrders && daysSince(snapshot.lastSeenAt) <= withinDays;
    }
    case "lapsed_from_segment": {
      const previousSlot = Number(params.previously_in_slot ?? 0);
      const silentDays = Number(params.silent_for_days ?? 0);
      const previousDefinition = definitionsBySlot.get(previousSlot);
      const wasRegular =
        previousDefinition?.rule_type === "order_count_in_window"
          ? qualifiesForDefinition(snapshot, previousDefinition, definitionsBySlot)
          : snapshot.totalOrders >= 5;
      return wasRegular && daysSince(snapshot.lastSeenAt) >= silentDays;
    }
    default:
      return false;
  }
}

export async function previewSegmentMatchCount(
  outletId: string,
  definition: CustomerSegmentDefinitionInput
): Promise<number> {
  const definitions = (await listSegmentDefinitions(outletId)).map((row) =>
    normalizeDefinitionRow(row)
  ) as CustomerSegmentDefinitionInput[];
  const definitionsBySlot = new Map(definitions.map((row) => [row.slot, row]));
  definitionsBySlot.set(
    definition.slot,
    normalizeDefinitionRow(definition) as CustomerSegmentDefinitionInput
  );

  const requestedWindows = new Set<number>([30, 90, 180, 365]);
  for (const row of definitionsBySlot.values()) {
    if ("window_days" in row.rule_params) requestedWindows.add(Number(row.rule_params.window_days));
    if ("last_seen_within_days" in row.rule_params) {
      requestedWindows.add(Number(row.rule_params.last_seen_within_days));
    }
    if ("days" in row.rule_params) requestedWindows.add(Number(row.rule_params.days));
    if ("silent_for_days" in row.rule_params)
      requestedWindows.add(Number(row.rule_params.silent_for_days));
  }

  const snapshots = await buildOutletCustomerSnapshots(outletId, Array.from(requestedWindows));
  return snapshots.filter((snapshot) =>
    qualifiesForDefinition(
      snapshot,
      normalizeDefinitionRow(definition) as CustomerSegmentDefinitionInput,
      definitionsBySlot
    )
  ).length;
}
