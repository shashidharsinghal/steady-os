import { randomUUID } from "crypto";
import { IngestionError } from "../errors";
import type { ParserSupabaseClient } from "../types/parser";
import { assertSupabaseSuccess, rpcHashCardFingerprint } from "./helpers";

export type IdentityKind = "phone_hash" | "upi_vpa" | "card_fingerprint";

type ResolveIdentityArgs = {
  supabase: ParserSupabaseClient;
  runId: string;
  identity: {
    kind: IdentityKind;
    value: string;
    displayValue?: string | null;
  };
  observedAt: string;
  preferredName?: string | null;
  phoneLast4?: string | null;
  cache?: Map<string, string>;
};

type CreateCustomerArgs = {
  supabase: ParserSupabaseClient;
  runId: string;
  observedAt: string;
  preferredName?: string | null;
  phoneLast4?: string | null;
};

export async function createCustomerRecord(args: CreateCustomerArgs): Promise<string> {
  const customerId = randomUUID();
  const insertResult = await args.supabase.from("customers").insert({
    id: customerId,
    phone_hash: null,
    phone_last_4: args.phoneLast4 ?? null,
    name: args.preferredName ?? null,
    first_seen_at: args.observedAt,
    last_seen_at: args.observedAt,
    total_orders: 0,
    total_spend_paise: 0,
    first_ingestion_run_id: args.runId,
  });
  assertSupabaseSuccess(insertResult, "Failed to create customer.");
  return customerId;
}

export async function findOrCreateCustomerByIdentity(args: ResolveIdentityArgs): Promise<string> {
  const cacheKey = `${args.identity.kind}:${args.identity.value}`;
  const cachedCustomerId = args.cache?.get(cacheKey);
  if (cachedCustomerId) return cachedCustomerId;

  const identityResult = await args.supabase
    .from("customer_identities")
    .select("customer_id, observation_count, first_seen_at, last_seen_at")
    .eq("kind", args.identity.kind)
    .eq("value", args.identity.value)
    .single();

  if (identityResult.error && identityResult.error.code !== "PGRST116") {
    throw new IngestionError(
      "commit_conflict",
      identityResult.error.message || "Failed to look up customer identity."
    );
  }

  const existingIdentity = identityResult.data as {
    customer_id: string;
    observation_count: number;
    first_seen_at: string;
    last_seen_at: string;
  } | null;

  let customerId = existingIdentity?.customer_id ?? null;

  if (!customerId && args.identity.kind === "phone_hash") {
    const customerResult = await args.supabase
      .from("customers")
      .select("id")
      .eq("phone_hash", args.identity.value)
      .single();

    if (customerResult.error && customerResult.error.code !== "PGRST116") {
      throw new IngestionError(
        "commit_conflict",
        customerResult.error.message || "Failed to look up existing customer."
      );
    }

    customerId = (customerResult.data as { id: string } | null)?.id ?? null;
  }

  if (!customerId) {
    customerId = await createCustomerRecord({
      supabase: args.supabase,
      runId: args.runId,
      observedAt: args.observedAt,
      preferredName: args.preferredName,
      phoneLast4: args.phoneLast4,
    });
  } else if (args.preferredName || args.phoneLast4) {
    const updatePayload: Record<string, unknown> = {};
    if (args.preferredName) updatePayload.name = args.preferredName;
    if (args.phoneLast4) updatePayload.phone_last_4 = args.phoneLast4;

    const updateResult = await args.supabase
      .from("customers")
      .update(updatePayload)
      .eq("id", customerId);
    assertSupabaseSuccess(updateResult, "Failed to update existing customer.");
  }

  if (existingIdentity) {
    const updateResult = await args.supabase
      .from("customer_identities")
      .update({
        display_value: args.identity.displayValue ?? null,
        first_seen_at:
          existingIdentity.first_seen_at < args.observedAt
            ? existingIdentity.first_seen_at
            : args.observedAt,
        last_seen_at:
          existingIdentity.last_seen_at > args.observedAt
            ? existingIdentity.last_seen_at
            : args.observedAt,
        observation_count: existingIdentity.observation_count + 1,
      })
      .eq("kind", args.identity.kind)
      .eq("value", args.identity.value);
    assertSupabaseSuccess(updateResult, "Failed to update customer identity.");
  } else {
    const insertIdentity = await args.supabase.from("customer_identities").insert({
      id: randomUUID(),
      customer_id: customerId,
      kind: args.identity.kind,
      value: args.identity.value,
      display_value: args.identity.displayValue ?? null,
      first_seen_at: args.observedAt,
      last_seen_at: args.observedAt,
      observation_count: 1,
    });
    assertSupabaseSuccess(insertIdentity, "Failed to create customer identity.");
  }

  args.cache?.set(cacheKey, customerId);
  return customerId;
}

export async function refreshCustomerAggregates(
  supabase: ParserSupabaseClient,
  customerIds: string[]
): Promise<void> {
  if (customerIds.length === 0) return;
  const uniqueIds = Array.from(new Set(customerIds));
  const refreshResult = await supabase.rpc("refresh_customer_aggregates", {
    customer_ids: uniqueIds,
  });
  assertSupabaseSuccess(refreshResult, "Failed to refresh customer aggregates.");
}

export async function deleteOrphanCustomers(
  supabase: ParserSupabaseClient,
  customerIds: string[]
): Promise<void> {
  if (customerIds.length === 0) return;
  const uniqueIds = Array.from(new Set(customerIds));
  const result = await supabase.rpc("delete_orphan_customers", {
    customer_ids: uniqueIds,
  });
  assertSupabaseSuccess(result, "Failed to delete orphan customers.");
}

export async function resolvePineLabsCustomerIdentity(args: {
  supabase: ParserSupabaseClient;
  runId: string;
  observedAt: string;
  upiVpa: string | null;
  upiName: string | null;
  cardLast4: string | null;
  cardIssuer: string | null;
  cardNetwork: string | null;
  cache?: Map<string, string>;
}): Promise<string | null> {
  if (args.upiVpa) {
    return findOrCreateCustomerByIdentity({
      supabase: args.supabase,
      runId: args.runId,
      observedAt: args.observedAt,
      preferredName: args.upiName,
      cache: args.cache,
      identity: {
        kind: "upi_vpa",
        value: args.upiVpa,
        displayValue: args.upiVpa,
      },
    });
  }

  const fingerprint = await rpcHashCardFingerprint(
    args.supabase,
    args.cardLast4,
    args.cardIssuer,
    args.cardNetwork
  );
  if (!fingerprint) return null;

  const cardLabel = `···${args.cardLast4 ?? "0000"}${
    args.cardIssuer || args.cardNetwork
      ? ` ${[args.cardIssuer, args.cardNetwork].filter(Boolean).join(" ")}`
      : ""
  }`;

  return findOrCreateCustomerByIdentity({
    supabase: args.supabase,
    runId: args.runId,
    observedAt: args.observedAt,
    cache: args.cache,
    identity: {
      kind: "card_fingerprint",
      value: fingerprint,
      displayValue: cardLabel.trim(),
    },
  });
}
