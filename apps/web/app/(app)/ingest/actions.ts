"use server";

import { createHash } from "crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requirePartner } from "@/lib/auth";
import {
  buildGmailAuthUrl,
  createCsrfToken,
  encodeGmailOAuthState,
  GMAIL_OAUTH_CSRF_COOKIE,
  hashCsrfToken,
  revokeGoogleToken,
} from "@/lib/gmail/oauth";
import {
  listGmailSyncHistory,
  syncGmailForOutlet,
  type GmailSyncHistoryRow,
  type SyncResult,
} from "@/lib/gmail/sync";
import { getAllParsers, getParser, IngestionError } from "@stride-os/ingestion";
import type { DetectionMethod } from "@stride-os/ingestion";
import type { ParserSupabaseClient } from "@stride-os/ingestion";
import { resolveDocumentTypeSourceType } from "./_lib/document-types";

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ACCEPTED_EXTENSIONS = ["xlsx", "xls", "csv", "pdf"];
type TriggerSource = "manual_upload" | "gmail_auto" | "gmail_manual" | "gmail_backfill";

export type GmailConnectionStatus = {
  state: "connected" | "expired" | "revoked" | "error" | "disconnected";
  gmailAddress: string | null;
  tokenExpiresAt: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
};

export type GmailSyncHistory = GmailSyncHistoryRow;

function revalidateOperationalSurfaces() {
  revalidatePath("/ingest");
  revalidatePath("/dashboard");
  revalidatePath("/pnl");
  revalidatePath("/customers");
  revalidatePath("/customers/lapsed");
  revalidatePath("/customers/merges");
  revalidatePath("/customers/segments");
}

// ─── Gmail OAuth ─────────────────────────────────────────────────────────────

export async function connectGmail(outletId: string): Promise<{ authUrl: string }> {
  const userId = await requirePartner();
  if (!outletId) throw new Error("Select an outlet before connecting Gmail.");

  const csrfToken = createCsrfToken();
  const cookieStore = await cookies();
  cookieStore.set(GMAIL_OAUTH_CSRF_COOKIE, csrfToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/",
  });

  const state = encodeGmailOAuthState({
    outletId,
    userId,
    csrfTokenHash: hashCsrfToken(csrfToken),
  });

  return { authUrl: buildGmailAuthUrl({ state }) };
}

export async function getGmailConnectionStatus(outletId: string): Promise<GmailConnectionStatus> {
  await requirePartner();
  if (!outletId) {
    return {
      state: "disconnected",
      gmailAddress: null,
      tokenExpiresAt: null,
      lastSyncAt: null,
      lastSyncStatus: null,
      lastSyncError: null,
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gmail_connections")
    .select(
      "gmail_address, token_expires_at, status, last_sync_at, last_sync_status, last_sync_error"
    )
    .eq("outlet_id", outletId)
    .maybeSingle();

  if (error) throw new Error(error.message);
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

  const state =
    data.status === "active" ? "connected" : (data.status as GmailConnectionStatus["state"]);

  return {
    state,
    gmailAddress: data.gmail_address,
    tokenExpiresAt: data.token_expires_at,
    lastSyncAt: data.last_sync_at,
    lastSyncStatus: data.last_sync_status,
    lastSyncError: data.last_sync_error,
  };
}

export async function disconnectGmail(outletId: string): Promise<void> {
  await requirePartner();
  if (!outletId) throw new Error("Select an outlet before disconnecting Gmail.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gmail_connections")
    .select("id, refresh_token, access_token")
    .eq("outlet_id", outletId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return;

  const tokenToRevoke = data.refresh_token ?? data.access_token;
  if (tokenToRevoke) {
    await revokeGoogleToken(tokenToRevoke);
  }

  const { error: updateError } = await supabase
    .from("gmail_connections")
    .update({
      status: "revoked",
      access_token: null,
      refresh_token: null,
      token_expires_at: null,
      last_sync_error: null,
    })
    .eq("id", data.id);

  if (updateError) throw new Error(updateError.message);
  revalidatePath("/ingest");
}

export async function triggerGmailSync(outletId: string): Promise<SyncResult> {
  const userId = await requirePartner();
  if (!outletId) throw new Error("Select an outlet before starting a Gmail sync.");

  return syncGmailForOutlet({
    outletId,
    triggeredBy: "manual",
    triggerSource: "gmail_manual",
    requestedByUserId: userId,
  });
}

export async function triggerGmailBackfillDay(
  outletId: string,
  businessDate: string
): Promise<SyncResult> {
  const userId = await requirePartner();
  if (!outletId) throw new Error("Select an outlet before running a backfill.");
  if (!businessDate) throw new Error("Choose a business date to backfill.");

  return syncGmailForOutlet({
    outletId,
    businessDate,
    triggeredBy: "backfill",
    triggerSource: "gmail_backfill",
    requestedByUserId: userId,
  });
}

export async function getGmailSyncHistory(
  outletId: string,
  limit = 14
): Promise<GmailSyncHistory[]> {
  await requirePartner();
  if (!outletId) return [];
  return listGmailSyncHistory(outletId, limit);
}

async function deleteRunArtifacts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  runIds: string[]
): Promise<void> {
  const uniqueRunIds = Array.from(new Set(runIds)).filter(Boolean);
  if (uniqueRunIds.length === 0) return;

  const { error: pnlDeleteError } = await supabase
    .from("pnl_reports")
    .delete()
    .in("ingestion_run_id", uniqueRunIds);

  if (pnlDeleteError) throw new Error(pnlDeleteError.message);

  const { error: splitDeleteError } = await supabase
    .from("sales_payment_splits")
    .delete()
    .in("ingestion_run_id", uniqueRunIds);

  if (splitDeleteError) throw new Error(splitDeleteError.message);
}

// ─── Upload ──────────────────────────────────────────────────────────────────

export async function uploadFile(formData: FormData): Promise<{ runId: string }> {
  const userId = await requirePartner();

  const file = formData.get("file") as File | null;
  if (!file) throw new Error("No file provided.");

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    throw new Error("Only .xlsx, .xls, .csv, and .pdf files are supported.");
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File exceeds the 50 MB size limit.");
  }

  const arrayBuffer = await file.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);
  const sha256 = createHash("sha256").update(fileBuffer).digest("hex");
  const selectedDocumentType = (formData.get("document_type") as string | null) ?? "auto_detect";
  const manualSourceType = resolveDocumentTypeSourceType(selectedDocumentType);
  const triggerSource = ((formData.get("trigger_source") as string | null) ??
    "manual_upload") as TriggerSource;
  if (!["manual_upload", "gmail_auto", "gmail_manual", "gmail_backfill"].includes(triggerSource)) {
    throw new Error("Unsupported ingestion trigger source.");
  }

  // Classify using registered parsers
  const sampleBuffer = fileBuffer.subarray(0, 50 * 1024);
  const parsers = getAllParsers();

  let sourceType = manualSourceType ?? "unknown";
  let detectionMethod: DetectionMethod = manualSourceType ? "user_override" : "filename_pattern";
  let detectionConfidence: number | null = null;
  const userConfirmedSource = Boolean(manualSourceType);

  if (!manualSourceType && parsers.length > 0) {
    let bestConfidence = 0;
    let bestSourceType = "unknown";

    for (const parser of parsers) {
      const result = await parser.detect({
        fileName: file.name,
        fileSize: file.size,
        sampleBuffer,
      });
      if (result.confidence > bestConfidence) {
        bestConfidence = result.confidence;
        bestSourceType = parser.sourceType;
      }
    }

    if (bestConfidence > 0) {
      sourceType = bestSourceType;
      detectionConfidence = bestConfidence;
      detectionMethod = bestConfidence >= 0.7 ? "filename_pattern" : "header_inspection";
    }
  }

  const runId = crypto.randomUUID();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const outletId = (formData.get("outlet_id") as string | null) || null;
  const prefix = outletId ?? "global";
  const storagePath = `${prefix}/${year}/${month}/${runId}/${file.name}`;

  const supabase = await createClient();

  const { error: uploadError } = await supabase.storage
    .from("ingestion-uploads")
    .upload(storagePath, fileBuffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) throw new Error("Failed to store the file. Please try again.");

  const { error: insertError } = await supabase.from("ingestion_runs").insert({
    id: runId,
    outlet_id: outletId,
    uploaded_by: userId,
    source_type: sourceType,
    detection_method: detectionMethod,
    detection_confidence: detectionConfidence,
    user_confirmed_source: userConfirmedSource,
    file_name: file.name,
    file_size_bytes: file.size,
    file_mime_type: file.type || null,
    file_storage_path: storagePath,
    file_sha256: sha256,
    trigger_source: triggerSource,
    status: "uploaded",
  });

  if (insertError) {
    await supabase.storage.from("ingestion-uploads").remove([storagePath]);
    if (insertError.code === "23505") {
      throw new Error(
        "This exact file has already been committed. Upload a different file or check the run history."
      );
    }
    throw new Error("Failed to create ingestion run. Please try again.");
  }

  revalidateOperationalSurfaces();
  return { runId };
}

export async function uploadPairedPetpoojaReports(
  formData: FormData
): Promise<{ itemRunId: string; paymentRunId: string }> {
  await requirePartner();
  const itemFile = formData.get("item_file") as File | null;
  const paymentFile = formData.get("payment_file") as File | null;

  if (!itemFile && !paymentFile) throw new Error("Choose at least one Petpooja daily report.");

  const outletId = (formData.get("outlet_id") as string | null) ?? "";
  if (!outletId) throw new Error("Select an outlet before uploading Petpooja reports.");

  const uploadOne = async (file: File, documentType: string) => {
    const single = new FormData();
    single.append("file", file);
    single.append("outlet_id", outletId);
    single.append("document_type", documentType);
    single.append("trigger_source", "manual_upload");
    return uploadFile(single);
  };

  const [itemResult, paymentResult] = await Promise.all([
    itemFile ? uploadOne(itemFile, "petpooja_item_bill") : Promise.resolve(null),
    paymentFile ? uploadOne(paymentFile, "petpooja_payment_summary") : Promise.resolve(null),
  ]);

  if (itemResult) await parseRun(itemResult.runId, "petpooja_item_bill");
  if (paymentResult) await parseRun(paymentResult.runId, "petpooja_payment_summary");

  return {
    itemRunId: itemResult?.runId ?? "",
    paymentRunId: paymentResult?.runId ?? "",
  };
}

// ─── Parse ───────────────────────────────────────────────────────────────────

export async function parseRun(runId: string, sourceTypeOverride?: string): Promise<void> {
  await requirePartner();

  const supabase = await createClient();
  const parserSupabase = supabase as unknown as ParserSupabaseClient;

  const { data: run, error: fetchErr } = await supabase
    .from("ingestion_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (fetchErr || !run) throw new Error("Run not found.");
  if (run.status !== "uploaded") {
    throw new Error(`Cannot parse a run with status "${run.status}".`);
  }

  const sourceType = sourceTypeOverride ?? run.source_type;

  await supabase
    .from("ingestion_runs")
    .update({
      status: "parsing",
      source_type: sourceType,
      ...(sourceTypeOverride
        ? { detection_method: "user_override", user_confirmed_source: true }
        : {}),
      parsing_started_at: new Date().toISOString(),
    })
    .eq("id", runId);

  try {
    const parser = getParser(sourceType);
    if (!parser) {
      throw new IngestionError(
        "parser_not_implemented",
        sourceType === "unknown"
          ? "Could not identify the file type. Please select the source manually."
          : `No parser is available for source type "${sourceType}" yet.`
      );
    }

    const { data: fileBlob, error: dlErr } = await supabase.storage
      .from("ingestion-uploads")
      .download(run.file_storage_path);

    if (dlErr || !fileBlob) throw new Error("Could not retrieve the uploaded file for parsing.");

    const fileBuffer = Buffer.from(await fileBlob.arrayBuffer());
    const rowErrors: {
      rowNumber: number;
      errorCode: string;
      errorMessage: string;
      fieldName?: string;
      rawValue?: string;
      rawRow?: unknown;
    }[] = [];

    const parseResult = await parser.parse({
      runId,
      outletId: run.outlet_id,
      filePath: run.file_storage_path,
      fileBuffer,
      recordError: (err) => rowErrors.push(err),
    });

    const normalizeResult = await parser.normalize({
      runId,
      outletId: run.outlet_id,
      records: parseResult.records,
      supabase: parserSupabase,
    });

    if (rowErrors.length > 0) {
      await supabase.from("ingestion_row_errors").insert(
        rowErrors.map((err) => ({
          run_id: runId,
          row_number: err.rowNumber,
          error_code: err.errorCode,
          error_message: err.errorMessage,
          field_name: err.fieldName ?? null,
          raw_value: err.rawValue ? String(err.rawValue).slice(0, 500) : null,
          raw_row: (err.rawRow ?? null) as unknown as import("@stride-os/db").Json,
        }))
      );
    }

    await supabase
      .from("ingestion_runs")
      .update({
        status: "preview_ready",
        parsing_completed_at: new Date().toISOString(),
        rows_seen: parseResult.rowsSeen,
        rows_parsed: parseResult.records.length,
        rows_to_insert: normalizeResult.rowsToInsertCount ?? normalizeResult.toInsert.length,
        rows_duplicate: normalizeResult.duplicateCount,
        rows_errored: rowErrors.length,
        preview_payload: (normalizeResult.previewPayload ?? {
          displayName: parser.displayName,
          canonicalRecords: normalizeResult.toInsert,
        }) as unknown as import("@stride-os/db").Json,
      })
      .eq("id", runId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    await supabase
      .from("ingestion_runs")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_details: { message },
      })
      .eq("id", runId);
    throw err instanceof Error ? err : new Error(message);
  }

  revalidatePath(`/ingest/${runId}`);
  revalidateOperationalSurfaces();
}

// ─── Commit ──────────────────────────────────────────────────────────────────

export async function commitRun(runId: string): Promise<void> {
  const userId = await requirePartner();

  const supabase = await createClient();
  const parserSupabase = supabase as unknown as ParserSupabaseClient;

  const { data: run, error: fetchErr } = await supabase
    .from("ingestion_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (fetchErr || !run) throw new Error("Run not found.");
  if (run.status !== "preview_ready") {
    throw new Error(`Cannot commit a run with status "${run.status}".`);
  }

  const parser = getParser(run.source_type);
  if (!parser) throw new Error(`No parser available for source type "${run.source_type}".`);

  await supabase
    .from("ingestion_runs")
    .update({ status: "committing", committing_started_at: new Date().toISOString() })
    .eq("id", runId);

  try {
    const payload = run.preview_payload as { canonicalRecords: unknown[] } | null;
    const canonicalRecords = payload?.canonicalRecords ?? [];

    const result = await parser.commit({
      runId,
      outletId: run.outlet_id,
      records: canonicalRecords,
      committedBy: userId,
      supabase: parserSupabase,
    });

    await supabase
      .from("ingestion_runs")
      .update({
        status: "committed",
        committed_at: new Date().toISOString(),
        committed_by: userId,
        rows_to_insert: result.rowsInserted,
      })
      .eq("id", runId);

    if (run.source_type === "petpooja_payment_summary") {
      await commitMatchingPetpoojaItemRun({
        supabase,
        parserSupabase,
        paymentRun: run,
        userId,
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "An unexpected error occurred.";
    try {
      await parser.rollback({ runId, supabase: parserSupabase });
    } catch {
      // Best-effort cleanup keeps partially written parser rows from lingering after a failed commit.
    }
    await supabase
      .from("ingestion_runs")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_details: { message },
      })
      .eq("id", runId);
    throw err instanceof Error ? err : new Error(message);
  }

  revalidatePath(`/ingest/${runId}`);
  revalidateOperationalSurfaces();
}

async function commitMatchingPetpoojaItemRun({
  supabase,
  parserSupabase,
  paymentRun,
  userId,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  parserSupabase: ParserSupabaseClient;
  paymentRun: {
    id: string;
    outlet_id: string | null;
    preview_payload: unknown;
  };
  userId: string;
}) {
  const payload = paymentRun.preview_payload as { businessDate?: string | null } | null;
  if (!paymentRun.outlet_id || !payload?.businessDate) return;

  const { data: itemRuns, error } = await supabase
    .from("ingestion_runs")
    .select("*")
    .eq("outlet_id", paymentRun.outlet_id)
    .eq("source_type", "petpooja_item_bill")
    .eq("status", "preview_ready")
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });

  if (error) throw new Error(error.message);

  const match = ((itemRuns ?? []) as Array<Record<string, unknown>>).find((candidate) => {
    const candidatePayload = candidate.preview_payload as { businessDate?: string | null } | null;
    return candidatePayload?.businessDate === payload.businessDate;
  });

  if (!match) return;

  const parser = getParser("petpooja_item_bill");
  if (!parser) throw new Error("No parser available for Petpooja item bill reports.");

  const rawRecords = ((match.preview_payload as { rawRecords?: unknown[] } | null)?.rawRecords ??
    []) as unknown[];
  const normalizeResult = await parser.normalize({
    runId: match.id as string,
    outletId: paymentRun.outlet_id,
    records: rawRecords,
    supabase: parserSupabase,
  });

  await supabase
    .from("ingestion_runs")
    .update({ status: "committing", committing_started_at: new Date().toISOString() })
    .eq("id", match.id as string);

  const itemResult = await parser.commit({
    runId: match.id as string,
    outletId: paymentRun.outlet_id,
    records: normalizeResult.toInsert,
    committedBy: userId,
    supabase: parserSupabase,
  });

  await supabase
    .from("ingestion_runs")
    .update({
      status: "committed",
      committed_at: new Date().toISOString(),
      committed_by: userId,
      rows_to_insert: itemResult.rowsInserted,
      rows_duplicate: normalizeResult.duplicateCount,
      preview_payload: normalizeResult.previewPayload as unknown as import("@stride-os/db").Json,
    })
    .eq("id", match.id as string);

  revalidatePath(`/ingest/${match.id as string}`);
}

// ─── Cancel ──────────────────────────────────────────────────────────────────

export async function cancelRun(runId: string): Promise<void> {
  await requirePartner();

  const supabase = await createClient();

  const { data: run, error: fetchErr } = await supabase
    .from("ingestion_runs")
    .select("id, status")
    .eq("id", runId)
    .single();

  if (fetchErr || !run) throw new Error("Run not found.");
  if (run.status !== "preview_ready") {
    throw new Error(`Cannot cancel a run with status "${run.status}".`);
  }

  await supabase
    .from("ingestion_runs")
    .update({
      status: "failed",
      failed_at: new Date().toISOString(),
      error_details: { message: "Cancelled by user." },
    })
    .eq("id", runId);

  revalidatePath(`/ingest/${runId}`);
  revalidateOperationalSurfaces();
}

// ─── Rollback ─────────────────────────────────────────────────────────────────

export async function rollbackRun(runId: string, reason: string): Promise<void> {
  const userId = await requirePartner();

  const supabase = await createClient();
  const parserSupabase = supabase as unknown as ParserSupabaseClient;

  const { data: run, error: fetchErr } = await supabase
    .from("ingestion_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (fetchErr || !run) throw new Error("Run not found.");
  if (run.status !== "committed") {
    throw new Error(`Cannot roll back a run with status "${run.status}".`);
  }

  const parser = getParser(run.source_type);
  if (!parser) throw new Error(`No parser available for source type "${run.source_type}".`);

  await parser.rollback({ runId, supabase: parserSupabase });

  await supabase
    .from("ingestion_runs")
    .update({
      status: "rolled_back",
      rolled_back_at: new Date().toISOString(),
      rolled_back_by: userId,
      rollback_reason: reason.trim() || null,
    })
    .eq("id", runId);

  revalidatePath(`/ingest/${runId}`);
  revalidateOperationalSurfaces();
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteRun(runId: string): Promise<void> {
  await requirePartner();

  const supabase = await createClient();

  const { data: run, error: fetchErr } = await supabase
    .from("ingestion_runs")
    .select("id, status, file_storage_path")
    .eq("id", runId)
    .single();

  if (fetchErr || !run) throw new Error("Run not found.");
  if (run.status !== "failed" && run.status !== "rolled_back") {
    throw new Error("Only failed or rolled-back runs can be deleted.");
  }

  await deleteRunArtifacts(supabase, [runId]);
  await supabase.storage.from("ingestion-uploads").remove([run.file_storage_path]);
  await supabase.from("ingestion_runs").delete().eq("id", runId);

  revalidateOperationalSurfaces();
}

export async function deleteRuns(runIds: string[]): Promise<void> {
  await requirePartner();

  const uniqueRunIds = Array.from(new Set(runIds)).filter(Boolean);
  if (uniqueRunIds.length === 0) return;

  const supabase = await createClient();

  const { data: runs, error: fetchErr } = await supabase
    .from("ingestion_runs")
    .select("id, status, file_storage_path")
    .in("id", uniqueRunIds);

  if (fetchErr) throw new Error(fetchErr.message);

  const typedRuns = (runs ?? []) as Array<{
    id: string;
    status: string;
    file_storage_path: string;
  }>;

  if (typedRuns.length !== uniqueRunIds.length) {
    throw new Error("One or more runs could not be found.");
  }

  const invalidRun = typedRuns.find(
    (run) => run.status !== "failed" && run.status !== "rolled_back"
  );
  if (invalidRun) {
    throw new Error("Only failed or rolled-back runs can be deleted.");
  }

  const storagePaths = typedRuns.map((run) => run.file_storage_path);

  await deleteRunArtifacts(supabase, uniqueRunIds);

  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from("ingestion-uploads")
      .remove(storagePaths);

    if (storageError) throw new Error(storageError.message);
  }

  const { error: deleteError } = await supabase
    .from("ingestion_runs")
    .delete()
    .in("id", uniqueRunIds);

  if (deleteError) throw new Error(deleteError.message);

  revalidateOperationalSurfaces();
}

export type DeleteImpact = {
  totals: {
    salesOrders: number;
    salesPaymentSplits: number;
    paymentTransactions: number;
    aggregatorPayouts: number;
  };
  runs: Array<{
    runId: string;
    fileName: string;
    salesOrders: number;
    salesPaymentSplits: number;
    paymentTransactions: number;
    aggregatorPayouts: number;
  }>;
  customerImpact: {
    keptCustomers: number;
    removedCustomers: number;
  };
};

export async function getDeleteImpact(runIds: string[]): Promise<DeleteImpact> {
  await requirePartner();

  const uniqueRunIds = Array.from(new Set(runIds)).filter(Boolean);
  if (uniqueRunIds.length === 0) {
    return {
      totals: {
        salesOrders: 0,
        salesPaymentSplits: 0,
        paymentTransactions: 0,
        aggregatorPayouts: 0,
      },
      runs: [],
      customerImpact: { keptCustomers: 0, removedCustomers: 0 },
    };
  }

  const supabase = await createClient();
  const [
    { data: runs },
    { data: orderRows },
    { data: splitRows },
    { data: paymentRows },
    { data: payoutRows },
  ] = await Promise.all([
    supabase.from("ingestion_runs").select("id, file_name").in("id", uniqueRunIds),
    supabase
      .from("sales_orders")
      .select("id, ingestion_run_id, customer_id")
      .in("ingestion_run_id", uniqueRunIds),
    supabase
      .from("sales_payment_splits")
      .select("id, ingestion_run_id")
      .in("ingestion_run_id", uniqueRunIds),
    supabase
      .from("payment_transactions")
      .select("id, ingestion_run_id, customer_id")
      .in("ingestion_run_id", uniqueRunIds),
    supabase
      .from("aggregator_payouts")
      .select("id, ingestion_run_id")
      .in("ingestion_run_id", uniqueRunIds),
  ]);

  const runMap = new Map(
    ((runs ?? []) as Array<{ id: string; file_name: string }>).map((run) => [
      run.id,
      {
        runId: run.id,
        fileName: run.file_name,
        salesOrders: 0,
        salesPaymentSplits: 0,
        paymentTransactions: 0,
        aggregatorPayouts: 0,
      },
    ])
  );

  const selectedCustomerIds = new Set<string>();
  ((orderRows ?? []) as Array<{ ingestion_run_id: string; customer_id: string | null }>).forEach(
    (row) => {
      const current = runMap.get(row.ingestion_run_id);
      if (current) current.salesOrders += 1;
      if (row.customer_id) selectedCustomerIds.add(row.customer_id);
    }
  );
  ((paymentRows ?? []) as Array<{ ingestion_run_id: string; customer_id: string | null }>).forEach(
    (row) => {
      const current = runMap.get(row.ingestion_run_id);
      if (current) current.paymentTransactions += 1;
      if (row.customer_id) selectedCustomerIds.add(row.customer_id);
    }
  );
  ((splitRows ?? []) as Array<{ ingestion_run_id: string }>).forEach((row) => {
    const current = runMap.get(row.ingestion_run_id);
    if (current) current.salesPaymentSplits += 1;
  });
  ((payoutRows ?? []) as Array<{ ingestion_run_id: string }>).forEach((row) => {
    const current = runMap.get(row.ingestion_run_id);
    if (current) current.aggregatorPayouts += 1;
  });

  let keptCustomers = 0;
  let removedCustomers = 0;

  if (selectedCustomerIds.size > 0) {
    const customerIds = Array.from(selectedCustomerIds);
    const [{ data: otherOrders }, { data: otherPayments }] = await Promise.all([
      supabase
        .from("active_sales_orders")
        .select("customer_id, ingestion_run_id")
        .in("customer_id", customerIds),
      supabase
        .from("active_payment_transactions")
        .select("customer_id, ingestion_run_id")
        .in("customer_id", customerIds),
    ]);

    const kept = new Set<string>();
    (
      (otherOrders ?? []) as Array<{ customer_id: string | null; ingestion_run_id: string }>
    ).forEach((row) => {
      if (row.customer_id && !uniqueRunIds.includes(row.ingestion_run_id))
        kept.add(row.customer_id);
    });
    (
      (otherPayments ?? []) as Array<{ customer_id: string | null; ingestion_run_id: string }>
    ).forEach((row) => {
      if (row.customer_id && !uniqueRunIds.includes(row.ingestion_run_id))
        kept.add(row.customer_id);
    });

    customerIds.forEach((customerId) => {
      if (kept.has(customerId)) keptCustomers += 1;
      else removedCustomers += 1;
    });
  }

  const runRows = Array.from(runMap.values()).sort((left, right) =>
    left.fileName.localeCompare(right.fileName)
  );

  return {
    totals: {
      salesOrders: runRows.reduce((sum, row) => sum + row.salesOrders, 0),
      salesPaymentSplits: runRows.reduce((sum, row) => sum + row.salesPaymentSplits, 0),
      paymentTransactions: runRows.reduce((sum, row) => sum + row.paymentTransactions, 0),
      aggregatorPayouts: runRows.reduce((sum, row) => sum + row.aggregatorPayouts, 0),
    },
    runs: runRows,
    customerImpact: {
      keptCustomers,
      removedCustomers,
    },
  };
}

export async function softDeleteRun(runId: string): Promise<void> {
  const userId = await requirePartner();
  const supabase = await createClient();

  const { data: run, error } = await supabase
    .from("ingestion_runs")
    .select("id, status, deleted_at")
    .eq("id", runId)
    .single();

  if (error || !run) throw new Error("Run not found.");
  if (run.status !== "committed")
    throw new Error("Only committed runs can be marked for deletion.");
  if (run.deleted_at) return;

  const { error: updateError } = await supabase
    .from("ingestion_runs")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: userId,
    })
    .eq("id", runId);

  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/ingest/${runId}`);
  revalidateOperationalSurfaces();
}

export async function undoDeleteRun(runId: string): Promise<void> {
  await requirePartner();
  const supabase = await createClient();

  const { data: run, error } = await supabase
    .from("ingestion_runs")
    .select("id, status, deleted_at")
    .eq("id", runId)
    .single();

  if (error || !run) throw new Error("Run not found.");
  if (run.status === "purged") throw new Error("Purged runs cannot be restored.");
  if (!run.deleted_at) return;

  const { error: updateError } = await supabase
    .from("ingestion_runs")
    .update({
      status: "committed",
      deleted_at: null,
      deleted_by: null,
    })
    .eq("id", runId);

  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/ingest/${runId}`);
  revalidateOperationalSurfaces();
}

export async function updatePnlPreviewPeriod(
  runId: string,
  periodStart: string,
  periodEnd: string
): Promise<void> {
  await requirePartner();
  const supabase = await createClient();

  const { data: run, error } = await supabase
    .from("ingestion_runs")
    .select("id, status, source_type, preview_payload")
    .eq("id", runId)
    .single();

  if (error || !run) throw new Error("Run not found.");
  if (run.status !== "preview_ready") {
    throw new Error("P&L preview can only be edited before commit.");
  }
  if (run.source_type !== "franchise_pnl_pdf") {
    throw new Error("Only P&L previews support period overrides.");
  }

  const payload = (run.preview_payload ?? null) as {
    canonicalRecords?: Array<Record<string, unknown>>;
    report?: Record<string, unknown>;
  } | null;

  const currentRecord = payload?.canonicalRecords?.[0];
  if (!currentRecord) throw new Error("Preview payload is missing.");

  const nextPayload = {
    ...payload,
    canonicalRecords: [
      {
        ...currentRecord,
        periodStart,
        periodEnd,
      },
    ],
    report: {
      ...(payload?.report ?? {}),
      periodStart,
      periodEnd,
    },
  };

  const { error: updateError } = await supabase
    .from("ingestion_runs")
    .update({ preview_payload: nextPayload as unknown as import("@stride-os/db").Json })
    .eq("id", runId);

  if (updateError) throw new Error(updateError.message);

  revalidatePath(`/ingest/${runId}`);
}
