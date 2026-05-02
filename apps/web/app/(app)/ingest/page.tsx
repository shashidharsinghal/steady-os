import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import type { GmailConnectionStatus } from "./actions";
import { GmailAutoSyncSection } from "./_components/GmailAutoSyncSection";
import { RecentRunsTable } from "./_components/RecentRunsTable";
import { UploadDropzone } from "./_components/UploadDropzone";
import { SoftDeleteRunsManager } from "./_components/SoftDeleteRunsManager";
import type { Tables } from "@stride-os/db";

type Run = Tables<"ingestion_runs">;
type Outlet = Pick<Tables<"outlets">, "id" | "name" | "brand">;
type GmailSyncRun = Tables<"gmail_sync_runs">;

const PURGED_LOOKBACK_DAYS = 90;

type IngestPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string | null {
  const value = params[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return typeof value === "string" ? value : null;
}

function humanizeGmailReason(reason: string): string {
  if (reason === "gmail_api_disabled") {
    return "The Gmail API is disabled in your Google Cloud project. Enable Gmail API for this OAuth app, wait a minute, then reconnect.";
  }
  if (
    reason === "gmail_tables_missing" ||
    /gmail_connections|gmail_sync_runs|schema cache/i.test(reason)
  ) {
    return "Gmail tables are missing in Supabase. Apply the Gmail auto-ingest migration, then reconnect.";
  }
  if (reason === "missing_refresh_token" || /refresh token/i.test(reason)) {
    return "Google did not return a refresh token. Reconnect Gmail and approve consent again.";
  }
  if (reason === "state_verification_failed" || /state verification/i.test(reason)) {
    return "Gmail OAuth state verification failed. Start the connect flow again from /ingest.";
  }
  if (reason === "not_partner" || /Only partners can connect Gmail/i.test(reason)) {
    return "This account is not recognized as a partner for the selected outlet.";
  }
  if (reason === "user_verification_failed") {
    return "The signed-in app user did not match the Gmail OAuth request. Log in again and retry.";
  }
  if (reason === "gmail_oauth_failed") {
    return "Gmail authorization did not complete successfully. Retry the connect flow.";
  }
  return reason;
}

function normalizeGmailConnectionStatus(
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
  if (!data) {
    return {
      state: "disconnected",
      gmailAddress: null,
      tokenExpiresAt: null,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
    };
  }

  return {
    state: data.status === "active" ? "connected" : data.status,
    gmailAddress: data.gmail_address,
    tokenExpiresAt: data.token_expires_at,
    lastSyncAt: data.last_sync_at,
    lastSyncStatus: data.last_sync_status,
    lastSyncError: data.last_sync_error,
  };
}

export default async function IngestPage({ searchParams }: IngestPageProps) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const [supabase, role] = await Promise.all([createClient(), getRole()]);

  if (role !== "partner") redirect("/dashboard");

  const [
    { data: recentRuns },
    { data: committedRuns },
    { data: deletedRuns },
    { data: purgedRuns },
    { data: outlets },
  ] = await Promise.all([
    supabase
      .from("ingestion_runs")
      .select("*")
      .neq("status", "purged")
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("ingestion_runs")
      .select("*")
      .eq("status", "committed")
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("ingestion_runs")
      .select("*")
      .not("deleted_at", "is", null)
      .neq("status", "purged")
      .order("deleted_at", { ascending: false }),
    supabase
      .from("ingestion_runs")
      .select("*")
      .eq("status", "purged")
      .gte(
        "updated_at",
        new Date(Date.now() - PURGED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
      )
      .order("updated_at", { ascending: false }),
    supabase.from("outlets").select("id, name, brand").is("archived_at", null).order("name"),
  ]);

  const recent = ((recentRuns ?? []) as Run[]).slice(0, 50);
  const committed = (committedRuns ?? []) as Run[];
  const deleted = (deletedRuns ?? []) as Run[];
  const purged = (purgedRuns ?? []) as Run[];
  const outletOptions = (outlets ?? []) as Outlet[];
  const requestedOutletId = readParam(resolvedSearchParams, "outletId");
  const selectedOutlet =
    outletOptions.find((outlet) => outlet.id === requestedOutletId) ?? outletOptions[0] ?? null;

  const [
    { data: gmailConnection, error: gmailConnectionError },
    { data: gmailSyncRuns, error: gmailSyncRunsError },
  ] = selectedOutlet
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
    : [
        { data: null, error: null },
        { data: [] as GmailSyncRun[], error: null },
      ];

  const syncRuns = (gmailSyncRuns ?? []) as GmailSyncRun[];
  const ingestionRunIds = Array.from(
    new Set(syncRuns.flatMap((run) => run.ingestion_run_ids ?? []))
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
  const syncHistory = syncRuns.map((run) => {
    const linkedRuns = (run.ingestion_run_ids ?? [])
      .map((id) => ingestionRunMap.get(id))
      .filter(Boolean) as Array<
      Pick<Run, "id" | "source_type" | "rows_to_insert" | "rows_parsed" | "status">
    >;
    const paymentRun = linkedRuns.find(
      (candidate) => candidate.source_type === "petpooja_payment_summary"
    );
    const itemRun = linkedRuns.find((candidate) => candidate.source_type === "petpooja_item_bill");
    const reports = linkedRuns.length;
    const ordersLabel =
      paymentRun?.status === "committed" || paymentRun?.status === "preview_ready"
        ? (paymentRun.rows_to_insert ?? paymentRun.rows_parsed ?? 0).toLocaleString("en-IN")
        : paymentRun
          ? "pending"
          : "—";
    const itemsLabel =
      itemRun?.status === "committed" || itemRun?.status === "preview_ready"
        ? (itemRun.rows_to_insert ?? itemRun.rows_parsed ?? 0).toLocaleString("en-IN")
        : itemRun
          ? "pending"
          : "—";

    return {
      id: run.id,
      startedAt: run.started_at,
      completedAt: run.completed_at,
      triggeredBy: run.triggered_by,
      status: run.status,
      reports,
      ordersLabel,
      itemsLabel,
      errorMessage: run.error_message,
    };
  });

  const gmailStatus = readParam(resolvedSearchParams, "gmail");
  const gmailReason = readParam(resolvedSearchParams, "reason");
  const gmailAddress = readParam(resolvedSearchParams, "gmailAddress");

  const gmailBanner =
    gmailStatus === "connected"
      ? {
          tone: "success" as const,
          message: gmailAddress
            ? `Connected Gmail successfully: ${gmailAddress}`
            : "Connected Gmail successfully.",
        }
      : gmailStatus === "error" && gmailReason
        ? {
            tone: "error" as const,
            message: humanizeGmailReason(gmailReason),
          }
        : gmailConnectionError
          ? {
              tone: "error" as const,
              message: humanizeGmailReason(gmailConnectionError.message),
            }
          : gmailSyncRunsError
            ? {
                tone: "error" as const,
                message: humanizeGmailReason(gmailSyncRunsError.message),
              }
            : null;

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ingest</h1>
        <p className="text-muted-foreground text-sm">
          Upload Petpooja, Pine Labs, aggregator reports, and franchise P&L PDFs.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Gmail Auto-Sync</h2>
        <GmailAutoSyncSection
          outlets={outletOptions}
          selectedOutletId={selectedOutlet?.id ?? null}
          connectionStatus={
            selectedOutlet ? normalizeGmailConnectionStatus(gmailConnection ?? null) : null
          }
          syncHistory={syncHistory}
          banner={gmailBanner}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Manual Upload</h2>
        <UploadDropzone outlets={outletOptions} initialOutletId={selectedOutlet?.id ?? null} />
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Recent Runs</h2>
        <RecentRunsTable runs={recent} />
      </section>

      <SoftDeleteRunsManager committedRuns={committed} deletedRuns={deleted} purgedRuns={purged} />
    </div>
  );
}
