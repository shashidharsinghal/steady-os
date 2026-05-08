import { redirect } from "next/navigation";
import type { Tables } from "@stride-os/db";
import { PageHeader } from "@/components/layout/page-header";
import { getRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GmailAutoSyncSection } from "../../ingest/_components/GmailAutoSyncSection";
import { AdminTabs } from "../_components/AdminTabs";
import type { GmailConnectionStatus } from "../../ingest/actions";

type Run = Tables<"ingestion_runs">;
type GmailSyncRun = Tables<"gmail_sync_runs">;

function normalize(
  data: Pick<
    Tables<"gmail_connections">,
    | "gmail_address"
    | "token_expires_at"
    | "status"
    | "last_sync_at"
    | "last_sync_status"
    | "last_sync_error"
  > | null
): GmailConnectionStatus {
  if (!data)
    return {
      state: "disconnected",
      gmailAddress: null,
      tokenExpiresAt: null,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
    };
  return {
    state: data.status === "active" ? "connected" : data.status,
    gmailAddress: data.gmail_address,
    tokenExpiresAt: data.token_expires_at,
    lastSyncAt: data.last_sync_at,
    lastSyncStatus: data.last_sync_status,
    lastSyncError: data.last_sync_error,
  };
}

export default async function AdminIntegrationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const role = await getRole();
  if (role !== "partner") redirect("/dashboard");
  const params = (await searchParams) ?? {};
  const requestedOutletId = Array.isArray(params.outletId) ? params.outletId[0] : params.outletId;

  const supabase = await createClient();
  const { data: outlets } = await supabase
    .from("outlets")
    .select("id, name, brand, petpooja_restaurant_id")
    .is("archived_at", null)
    .order("name");
  const outletOptions = (outlets ?? []).map((outlet) => ({
    id: outlet.id,
    name: outlet.name,
    brand: outlet.brand,
  }));
  const selectedOutlet =
    outletOptions.find((outlet) => outlet.id === requestedOutletId) ?? outletOptions[0] ?? null;

  const [{ data: connection }, { data: syncRuns }] = selectedOutlet
    ? await Promise.all([
        supabase
          .from("gmail_connections")
          .select(
            "gmail_address, token_expires_at, status, last_sync_at, last_sync_status, last_sync_error"
          )
          .eq("outlet_id", selectedOutlet.id)
          .maybeSingle(),
        supabase
          .from("gmail_sync_runs")
          .select("*")
          .eq("outlet_id", selectedOutlet.id)
          .order("started_at", { ascending: false })
          .limit(14),
      ])
    : [{ data: null }, { data: [] as GmailSyncRun[] }];

  const ingestionRunIds = Array.from(
    new Set(((syncRuns ?? []) as GmailSyncRun[]).flatMap((run) => run.ingestion_run_ids ?? []))
  );
  const { data: syncIngestionRuns } =
    ingestionRunIds.length > 0
      ? await supabase
          .from("ingestion_runs")
          .select("id, source_type, rows_to_insert, rows_parsed, status")
          .in("id", ingestionRunIds)
      : {
          data: [] as Array<
            Pick<Run, "id" | "source_type" | "rows_to_insert" | "rows_parsed" | "status">
          >,
        };
  const ingestionRunMap = new Map(
    (
      (syncIngestionRuns ?? []) as Array<
        Pick<Run, "id" | "source_type" | "rows_to_insert" | "rows_parsed" | "status">
      >
    ).map((run) => [run.id, run])
  );
  const syncHistory = ((syncRuns ?? []) as GmailSyncRun[]).map((run) => {
    const linkedRuns = (run.ingestion_run_ids ?? [])
      .map((id) => ingestionRunMap.get(id))
      .filter(Boolean) as Array<
      Pick<Run, "id" | "source_type" | "rows_to_insert" | "rows_parsed" | "status">
    >;
    const paymentRun = linkedRuns.find(
      (candidate) => candidate.source_type === "petpooja_payment_summary"
    );
    const itemRun = linkedRuns.find((candidate) => candidate.source_type === "petpooja_item_bill");
    return {
      id: run.id,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      triggeredBy: run.triggered_by,
      status: run.status,
      reports: linkedRuns.length,
      ordersLabel: paymentRun
        ? String(paymentRun.rows_to_insert ?? paymentRun.rows_parsed ?? "pending")
        : "—",
      itemsLabel: itemRun
        ? String(itemRun.rows_to_insert ?? itemRun.rows_parsed ?? "pending")
        : "—",
      errorMessage: run.error_message,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Integrations"
        subtitle="Connect Gmail, review sync history, and verify outlet integration mapping."
      />
      <AdminTabs />
      <GmailAutoSyncSection
        outlets={outletOptions}
        selectedOutletId={selectedOutlet?.id ?? null}
        connectionStatus={selectedOutlet ? normalize(connection ?? null) : null}
        syncHistory={syncHistory}
      />
    </div>
  );
}
