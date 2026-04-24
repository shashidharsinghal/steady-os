"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRole, requirePartner } from "@/lib/auth";
import { buildMergeSuggestions, type MergeSuggestionInput } from "./_lib/merge-suggestions";

export type CustomerSegment =
  | "all"
  | "super_regular"
  | "regular"
  | "active"
  | "new"
  | "lapsed"
  | "churned"
  | "one_timer";

export type CustomerProfileRow = {
  id: string;
  name: string | null;
  phone_last_4: string | null;
  first_seen_at: string;
  last_seen_at: string;
  total_orders: number;
  total_spend_paise: number;
  identity_count: number;
  phone_identity_count: number;
  upi_identity_count: number;
  card_identity_count: number;
  has_aggregator_orders: boolean;
  has_dine_in: boolean;
  aggregator_order_count: number;
  dine_in_visit_count: number;
  highest_segment: string;
  primary_identifier: string;
  search_text: string | null;
};

export type CustomerIdentityRow = {
  id: string;
  customer_id: string;
  kind: "phone_hash" | "upi_vpa" | "card_fingerprint";
  value: string;
  display_value: string | null;
  first_seen_at: string;
  last_seen_at: string;
  observation_count: number;
  created_at: string;
};

export type CustomerListParams = {
  q?: string;
  segment?: CustomerSegment;
  hasAggregator?: "any" | "yes" | "no";
  hasDineIn?: "any" | "yes" | "no";
  lastSeen?: "all" | "7d" | "30d" | "90d";
  minOrders?: number;
  sort?: "last_seen" | "first_seen" | "total_orders" | "total_spend";
  page?: number;
  pageSize?: number;
};

export type CustomerListResult = {
  rows: CustomerProfileRow[];
  total: number;
  page: number;
  pageSize: number;
};

export type CustomerTimelineEntry = {
  id: string;
  occurredAt: string;
  source: "sales_order" | "payment_transaction";
  title: string;
  subtitle: string;
  amountPaise: number;
};

export type CustomerDetail = {
  profile: CustomerProfileRow;
  customer: {
    id: string;
    name: string | null;
    phone_hash: string | null;
    phone_last_4: string | null;
    first_seen_at: string;
    last_seen_at: string;
    total_orders: number;
    total_spend_paise: number;
  };
  identities: CustomerIdentityRow[];
};

export type SegmentOverviewRow = {
  segment: string;
  customerCount: number;
  totalSpendPaise: number;
  averageOrderCount: number;
};

export type MergeSuggestionRow = {
  primaryCustomer: CustomerProfileRow;
  secondaryCustomer: CustomerProfileRow;
  confidence: number;
  reason: string;
};

type MergeSnapshot = {
  movedIdentityIds: string[];
  movedSalesOrderIds: string[];
  movedPaymentTransactionIds: string[];
  secondaryCustomer: {
    id: string;
    name: string | null;
    phone_hash: string | null;
    phone_last_4: string | null;
    first_seen_at: string;
    last_seen_at: string;
    total_orders: number;
    total_spend_paise: number;
  };
  primaryBefore: {
    id: string;
    name: string | null;
    phone_hash: string | null;
    phone_last_4: string | null;
    first_seen_at: string;
    last_seen_at: string;
    total_orders: number;
    total_spend_paise: number;
  };
};

function daysAgo(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / (24 * 60 * 60 * 1000));
}

async function requirePartnerRole() {
  const role = await getRole();
  if (role !== "partner") redirect("/dashboard");
}

async function getMergedSecondaryIds(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("customer_merges")
    .select("secondary_customer_id")
    .is("restored_at", null);

  return new Set(
    ((data ?? []) as Array<{ secondary_customer_id: string }>).map(
      (row) => row.secondary_customer_id
    )
  );
}

function filterCustomers(
  rows: CustomerProfileRow[],
  params: CustomerListParams
): CustomerProfileRow[] {
  const query = params.q?.trim().toLowerCase() ?? "";
  const minOrders = params.minOrders ?? 1;

  return rows.filter((row) => {
    if (params.segment && params.segment !== "all" && row.highest_segment !== params.segment) {
      return false;
    }
    if (params.hasAggregator === "yes" && !row.has_aggregator_orders) return false;
    if (params.hasAggregator === "no" && row.has_aggregator_orders) return false;
    if (params.hasDineIn === "yes" && !row.has_dine_in) return false;
    if (params.hasDineIn === "no" && row.has_dine_in) return false;
    if (params.lastSeen && params.lastSeen !== "all") {
      const limit = Number(params.lastSeen.replace("d", ""));
      if (daysAgo(row.last_seen_at) > limit) return false;
    }
    if (row.total_orders < minOrders) return false;
    if (query && !(row.search_text ?? "").includes(query)) return false;
    return true;
  });
}

function sortCustomers(rows: CustomerProfileRow[], sort: CustomerListParams["sort"]) {
  const sorted = [...rows];
  sorted.sort((left, right) => {
    switch (sort) {
      case "first_seen":
        return new Date(right.first_seen_at).getTime() - new Date(left.first_seen_at).getTime();
      case "total_orders":
        return right.total_orders - left.total_orders;
      case "total_spend":
        return right.total_spend_paise - left.total_spend_paise;
      case "last_seen":
      default:
        return new Date(right.last_seen_at).getTime() - new Date(left.last_seen_at).getTime();
    }
  });
  return sorted;
}

export async function listCustomers(params: CustomerListParams): Promise<CustomerListResult> {
  await requirePartnerRole();
  const supabase = await createClient();
  const [{ data: rows }, mergedSecondaryIds] = await Promise.all([
    supabase.from("active_customer_profiles").select("*"),
    getMergedSecondaryIds(supabase),
  ]);

  const visibleRows = ((rows ?? []) as CustomerProfileRow[]).filter(
    (row) => !mergedSecondaryIds.has(row.id)
  );
  const filtered = sortCustomers(filterCustomers(visibleRows, params), params.sort);
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 50;
  const start = (page - 1) * pageSize;

  return {
    rows: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
  };
}

export async function getCustomer(customerId: string): Promise<CustomerDetail | null> {
  await requirePartnerRole();
  const supabase = await createClient();
  const [{ data: profile }, { data: customer }, { data: identities }] = await Promise.all([
    supabase.from("active_customer_profiles").select("*").eq("id", customerId).single(),
    supabase
      .from("customers")
      .select(
        "id, name, phone_hash, phone_last_4, first_seen_at, last_seen_at, total_orders, total_spend_paise"
      )
      .eq("id", customerId)
      .single(),
    supabase
      .from("customer_identities")
      .select("*")
      .eq("customer_id", customerId)
      .order("last_seen_at", { ascending: false }),
  ]);

  if (!profile || !customer) return null;

  return {
    profile: profile as CustomerProfileRow,
    customer: customer as CustomerDetail["customer"],
    identities: (identities ?? []) as CustomerIdentityRow[],
  };
}

export async function getCustomerTimeline(customerId: string): Promise<CustomerTimelineEntry[]> {
  await requirePartnerRole();
  const supabase = await createClient();
  const [{ data: orders }, { data: transactions }] = await Promise.all([
    supabase
      .from("active_sales_orders")
      .select("id, ordered_at, channel, total_amount_paise, source, source_order_id")
      .eq("customer_id", customerId)
      .order("ordered_at", { ascending: false }),
    supabase
      .from("active_payment_transactions")
      .select("id, transacted_at, amount_paise, transaction_type, source")
      .eq("customer_id", customerId)
      .order("transacted_at", { ascending: false }),
  ]);

  const orderEntries: CustomerTimelineEntry[] = (
    (orders ?? []) as Array<{
      id: string;
      ordered_at: string;
      channel: string;
      total_amount_paise: number;
      source: string;
      source_order_id: string;
    }>
  ).map((row) => ({
    id: row.id,
    occurredAt: row.ordered_at,
    source: "sales_order",
    title: `${row.channel.replace(/_/g, " ")} order`,
    subtitle: `${row.source} · ${row.source_order_id}`,
    amountPaise: row.total_amount_paise,
  }));

  const paymentEntries: CustomerTimelineEntry[] = (
    (transactions ?? []) as Array<{
      id: string;
      transacted_at: string;
      amount_paise: number;
      transaction_type: string;
      source: string;
    }>
  ).map((row) => ({
    id: row.id,
    occurredAt: row.transacted_at,
    source: "payment_transaction",
    title: `${row.transaction_type.replace(/_/g, " ")} payment`,
    subtitle: row.source,
    amountPaise: row.amount_paise,
  }));

  return [...orderEntries, ...paymentEntries].sort(
    (left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime()
  );
}

export async function getSegmentOverview(): Promise<SegmentOverviewRow[]> {
  await requirePartnerRole();
  const supabase = await createClient();
  const [rows, mergedSecondaryIds] = await Promise.all([
    supabase.from("active_customer_profiles").select("*"),
    getMergedSecondaryIds(supabase),
  ]);

  const visible = ((rows.data ?? []) as CustomerProfileRow[]).filter(
    (row) => !mergedSecondaryIds.has(row.id)
  );
  const bySegment = new Map<string, SegmentOverviewRow>();

  visible.forEach((row) => {
    const current = bySegment.get(row.highest_segment) ?? {
      segment: row.highest_segment,
      customerCount: 0,
      totalSpendPaise: 0,
      averageOrderCount: 0,
    };
    current.customerCount += 1;
    current.totalSpendPaise += row.total_spend_paise;
    current.averageOrderCount += row.total_orders;
    bySegment.set(row.highest_segment, current);
  });

  return Array.from(bySegment.values())
    .map((row) => ({
      ...row,
      averageOrderCount: row.customerCount > 0 ? row.averageOrderCount / row.customerCount : 0,
    }))
    .sort((left, right) => right.totalSpendPaise - left.totalSpendPaise);
}

export async function getLapsedRegulars(): Promise<CustomerProfileRow[]> {
  await requirePartnerRole();
  const supabase = await createClient();
  const [rows, mergedSecondaryIds] = await Promise.all([
    supabase.from("active_customer_profiles").select("*"),
    getMergedSecondaryIds(supabase),
  ]);

  return ((rows.data ?? []) as CustomerProfileRow[])
    .filter(
      (row) =>
        !mergedSecondaryIds.has(row.id) &&
        (row.highest_segment === "lapsed" || row.highest_segment === "churned")
    )
    .sort((left, right) => right.total_spend_paise - left.total_spend_paise);
}

export async function getMergeSuggestions(): Promise<MergeSuggestionRow[]> {
  await requirePartnerRole();
  const supabase = await createClient();
  const [{ data: profiles }, { data: identities }, { data: dismissed }, mergedSecondaryIds] =
    await Promise.all([
      supabase.from("active_customer_profiles").select("*"),
      supabase
        .from("customer_identities")
        .select("customer_id, kind, display_value, value")
        .eq("kind", "upi_vpa"),
      supabase.from("customer_dismissed_matches").select("customer_a_id, customer_b_id"),
      getMergedSecondaryIds(supabase),
    ]);

  const profileRows = ((profiles ?? []) as CustomerProfileRow[]).filter(
    (row) => !mergedSecondaryIds.has(row.id)
  );

  const vpMap = new Map<string, string[]>();
  (
    (identities ?? []) as Array<{
      customer_id: string;
      display_value: string | null;
      value: string;
    }>
  ).forEach((row) => {
    const current = vpMap.get(row.customer_id) ?? [];
    current.push(row.value);
    vpMap.set(row.customer_id, current);
  });

  const dismissedPairs = new Set(
    ((dismissed ?? []) as Array<{ customer_a_id: string; customer_b_id: string }>).map((row) =>
      [row.customer_a_id, row.customer_b_id].sort().join(":")
    )
  );

  const suggestions = buildMergeSuggestions(
    profileRows.map(
      (row): MergeSuggestionInput => ({
        id: row.id,
        name: row.name,
        primaryIdentifier: row.primary_identifier,
        totalOrders: row.total_orders,
        totalSpendPaise: row.total_spend_paise,
        lastSeenAt: row.last_seen_at,
        identityCount: row.identity_count,
        vpas: vpMap.get(row.id) ?? [],
      })
    ),
    dismissedPairs
  );

  const profileMap = new Map(profileRows.map((row) => [row.id, row]));

  return suggestions
    .map((suggestion) => {
      const primary = profileMap.get(suggestion.primaryCustomerId);
      const secondary = profileMap.get(suggestion.secondaryCustomerId);
      if (!primary || !secondary) return null;
      return {
        primaryCustomer: primary,
        secondaryCustomer: secondary,
        confidence: suggestion.confidence,
        reason: suggestion.reason,
      };
    })
    .filter((row): row is MergeSuggestionRow => Boolean(row));
}

export async function mergeCustomers(primaryId: string, secondaryId: string, reason?: string) {
  const userId = await requirePartner();
  const supabase = await createClient();

  const [
    { data: primary },
    { data: secondary },
    { data: identities },
    { data: orders },
    { data: txns },
  ] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "id, name, phone_hash, phone_last_4, first_seen_at, last_seen_at, total_orders, total_spend_paise"
      )
      .eq("id", primaryId)
      .single(),
    supabase
      .from("customers")
      .select(
        "id, name, phone_hash, phone_last_4, first_seen_at, last_seen_at, total_orders, total_spend_paise"
      )
      .eq("id", secondaryId)
      .single(),
    supabase.from("customer_identities").select("id, kind, value").eq("customer_id", secondaryId),
    supabase.from("sales_orders").select("id").eq("customer_id", secondaryId),
    supabase.from("payment_transactions").select("id").eq("customer_id", secondaryId),
  ]);

  if (!primary || !secondary) throw new Error("Could not load both customers for merge.");

  const movedIdentityIds: string[] = [];
  for (const identity of (identities ?? []) as Array<{
    id: string;
    kind: "phone_hash" | "upi_vpa" | "card_fingerprint";
    value: string;
  }>) {
    const existing = await supabase
      .from("customer_identities")
      .select("id")
      .eq("customer_id", primaryId)
      .eq("kind", identity.kind)
      .eq("value", identity.value)
      .single();

    if (existing.data) {
      await supabase.from("customer_identities").delete().eq("id", identity.id);
      continue;
    }

    const updateIdentity = await supabase
      .from("customer_identities")
      .update({ customer_id: primaryId })
      .eq("id", identity.id);
    if (updateIdentity.error) throw new Error(updateIdentity.error.message);
    movedIdentityIds.push(identity.id);
  }

  const movedSalesOrderIds = ((orders ?? []) as Array<{ id: string }>).map((row) => row.id);
  const movedPaymentTransactionIds = ((txns ?? []) as Array<{ id: string }>).map((row) => row.id);

  await supabase
    .from("sales_orders")
    .update({ customer_id: primaryId })
    .eq("customer_id", secondaryId);
  await supabase
    .from("payment_transactions")
    .update({ customer_id: primaryId })
    .eq("customer_id", secondaryId);

  await supabase
    .from("customers")
    .update({
      name: primary.name ?? secondary.name,
      phone_hash: primary.phone_hash ?? secondary.phone_hash,
      phone_last_4: primary.phone_last_4 ?? secondary.phone_last_4,
    })
    .eq("id", primaryId);

  const secondarySnapshot: MergeSnapshot = {
    movedIdentityIds,
    movedSalesOrderIds,
    movedPaymentTransactionIds,
    secondaryCustomer: secondary as MergeSnapshot["secondaryCustomer"],
    primaryBefore: primary as MergeSnapshot["primaryBefore"],
  };

  const insertMerge = await supabase.from("customer_merges").insert({
    primary_customer_id: primaryId,
    secondary_customer_id: secondaryId,
    merged_by: userId,
    reason: reason ?? null,
    secondary_snapshot: secondarySnapshot,
  });
  if (insertMerge.error) throw new Error(insertMerge.error.message);

  await supabase.rpc("refresh_customer_aggregates", { customer_ids: [primaryId, secondaryId] });

  revalidatePath("/customers");
  revalidatePath("/customers/merges");
  revalidatePath("/customers/lapsed");
  revalidatePath("/customers/segments");
  revalidatePath(`/customers/${primaryId}`);
}

export async function dismissMergeSuggestion(
  primaryId: string,
  secondaryId: string,
  reason?: string
) {
  const userId = await requirePartner();
  const supabase = await createClient();

  const insertResult = await supabase.from("customer_dismissed_matches").insert({
    customer_a_id: primaryId,
    customer_b_id: secondaryId,
    dismissed_by: userId,
    reason: reason ?? null,
  });

  if (insertResult.error && insertResult.error.code !== "23505") {
    throw new Error(insertResult.error.message);
  }

  revalidatePath("/customers/merges");
}

export async function undoMerge(mergeId: string) {
  const userId = await requirePartner();
  const supabase = await createClient();
  const { data: merge } = await supabase
    .from("customer_merges")
    .select("*")
    .eq("id", mergeId)
    .single();

  if (!merge) throw new Error("Merge record not found.");
  if (merge.restored_at) throw new Error("This merge has already been undone.");
  if (new Date(merge.undo_available_until).getTime() < Date.now()) {
    throw new Error("Undo window has expired for this merge.");
  }

  const snapshot = merge.secondary_snapshot as MergeSnapshot;

  if (snapshot.movedSalesOrderIds.length > 0) {
    await supabase
      .from("sales_orders")
      .update({ customer_id: merge.secondary_customer_id })
      .in("id", snapshot.movedSalesOrderIds);
  }

  if (snapshot.movedPaymentTransactionIds.length > 0) {
    await supabase
      .from("payment_transactions")
      .update({ customer_id: merge.secondary_customer_id })
      .in("id", snapshot.movedPaymentTransactionIds);
  }

  if (snapshot.movedIdentityIds.length > 0) {
    await supabase
      .from("customer_identities")
      .update({ customer_id: merge.secondary_customer_id })
      .in("id", snapshot.movedIdentityIds);
  }

  await supabase
    .from("customers")
    .update(snapshot.secondaryCustomer)
    .eq("id", merge.secondary_customer_id);

  await supabase
    .from("customers")
    .update({
      name: snapshot.primaryBefore.name,
      phone_hash: snapshot.primaryBefore.phone_hash,
      phone_last_4: snapshot.primaryBefore.phone_last_4,
    })
    .eq("id", merge.primary_customer_id);

  await supabase
    .from("customer_merges")
    .update({
      restored_at: new Date().toISOString(),
      restored_by: userId,
    })
    .eq("id", mergeId);

  await supabase.rpc("refresh_customer_aggregates", {
    customer_ids: [merge.primary_customer_id, merge.secondary_customer_id],
  });

  revalidatePath("/customers");
  revalidatePath("/customers/merges");
  revalidatePath("/customers/lapsed");
  revalidatePath("/customers/segments");
}
