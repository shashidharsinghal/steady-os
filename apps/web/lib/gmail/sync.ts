import { createHash, randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import type { Json, Tables } from "@stride-os/db";
import { getAllParsers, getParser } from "@stride-os/ingestion";
import type { ParserSupabaseClient } from "@stride-os/ingestion";
import { refreshGmailAccessToken } from "@/lib/gmail/oauth";
import {
  extractInvoiceFromAttachment as extractInvoiceFromDocument,
  type InvoiceExtraction,
} from "@/lib/openai/invoice-extraction";
import { createAdminClient } from "@/lib/supabase/admin";

type GmailConnectionRow = Tables<"gmail_connections">;
type GmailSyncRunRow = Tables<"gmail_sync_runs">;
type IngestionRunRow = Tables<"ingestion_runs">;
type OutletRow = Tables<"outlets">;
type TriggeredBy = GmailSyncRunRow["triggered_by"];
type TriggerSource = IngestionRunRow["trigger_source"];

type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailMessagePart = {
  filename?: string;
  mimeType?: string;
  headers?: GmailHeader[];
  body?: {
    attachmentId?: string;
    data?: string;
    size?: number;
  };
  parts?: GmailMessagePart[];
};

type GmailMessagePayload = {
  id?: string;
  threadId?: string;
  internalDate?: string;
  snippet?: string;
  payload?: GmailMessagePart;
};

type GmailAttachmentCandidate = {
  fileName: string;
  mimeType: string | null;
  attachmentId: string;
};

type AttachmentSyncResult = {
  runId: string;
  sourceType: string;
  businessDate: string | null;
  detectionConfidence: number;
  rowsErrored: number;
  rowsParsed: number;
  autoCommitEligible: boolean;
  autoCommitReasons: string[];
};

type SyncOptions = {
  outletId: string;
  triggeredBy: TriggeredBy;
  triggerSource: TriggerSource;
  requestedByUserId?: string | null;
  businessDate?: string | null;
};

export type SyncResult = {
  syncRunId: string;
  status: GmailSyncRunRow["status"];
  emailsFound: number;
  emailsProcessed: number;
  emailsSkipped: number;
  ingestionRunIds: string[];
};

type GmailConnectionStatus = "active" | "expired" | "revoked" | "error";

const REPORT_PATTERNS = [
  {
    sourceType: "petpooja_item_bill",
    subjectPattern: /Report Notification:\s*Item Wise Report With Bill No\./i,
    filePattern: /item[_\s-]*bill[_\s-]*report/i,
  },
  {
    sourceType: "petpooja_payment_summary",
    subjectPattern: /Report Notification:\s*Payment Wise Summary/i,
    filePattern: /payment[_\s-]*wise[_\s-]*summary/i,
  },
] as const;

const MAX_GMAIL_MESSAGES = 50;
const TOKEN_EXPIRY_SKEW_MS = 60 * 1000;
const AUTO_COMMIT_MIN_CONFIDENCE = 0.95;
const AUTO_COMMIT_MIN_BASELINE_SAMPLES = 3;
const AUTO_COMMIT_VARIANCE = 0.2;
const GMAIL_API_MAX_RETRIES = 3;

function normalizeText(value: string): string {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildLooseSignature(value: string): string {
  return normalizeText(value)
    .replace(/\s+/g, "")
    .replace(/[AEIOU]/g, "")
    .replace(/(.)\1+/g, "$1");
}

function extractSenderEmail(fromHeader: string): string | null {
  const emailMatch = fromHeader.match(/<([^>]+)>/);
  const raw = (emailMatch?.[1] ?? fromHeader).trim().toLowerCase();
  return raw.includes("@") ? raw : null;
}

export function isAllowedPetpoojaSender(fromHeader: string): boolean {
  const email = extractSenderEmail(fromHeader);
  return email?.endsWith("@petpooja.com") ?? false;
}

function extractRestaurantName(subject: string): string | null {
  const match = subject.match(/:\s*(.+?)\s*$/);
  return match?.[1]?.trim() ?? null;
}

export function subjectMatchesOutlet(subject: string, outlet: OutletRow): boolean {
  const restaurantName = extractRestaurantName(subject);
  if (!restaurantName) return true;

  const subjectNormalized = normalizeText(restaurantName);
  const subjectSignature = buildLooseSignature(restaurantName);
  const candidates = [outlet.name, outlet.brand, outlet.petpooja_restaurant_id ?? ""]
    .map((value) => ({
      normalized: normalizeText(value),
      signature: buildLooseSignature(value),
    }))
    .filter((candidate) => Boolean(candidate.normalized));

  return candidates.some(
    (candidate) =>
      subjectNormalized.includes(candidate.normalized) ||
      candidate.normalized.includes(subjectNormalized) ||
      subjectSignature.includes(candidate.signature) ||
      candidate.signature.includes(subjectSignature)
  );
}

function getHeader(headers: GmailHeader[] | undefined, name: string): string {
  const value = headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value;
  return value?.trim() ?? "";
}

function decodeBase64Url(data: string): Buffer {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64");
}

function collectAttachmentCandidates(
  part: GmailMessagePart | undefined
): GmailAttachmentCandidate[] {
  if (!part) return [];
  const candidates: GmailAttachmentCandidate[] = [];

  if (part.filename && part.body?.attachmentId) {
    candidates.push({
      fileName: part.filename,
      mimeType: part.mimeType ?? null,
      attachmentId: part.body.attachmentId,
    });
  }

  for (const child of part.parts ?? []) {
    candidates.push(...collectAttachmentCandidates(child));
  }

  return candidates;
}

function stripHtml(value: string): string {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function collectMessageBodyText(part: GmailMessagePart | undefined): string[] {
  if (!part) return [];
  const parts: string[] = [];
  const mime = part.mimeType?.toLowerCase() ?? "";
  const inlineData = part.body?.data;

  if (inlineData && (mime === "text/plain" || mime === "text/html")) {
    const decoded = decodeBase64Url(inlineData).toString("utf8");
    parts.push(mime === "text/html" ? stripHtml(decoded) : decoded.trim());
  }

  for (const child of part.parts ?? []) {
    parts.push(...collectMessageBodyText(child));
  }

  return parts.filter(Boolean);
}

function buildAfterQueryTimestamp(lastSyncAt: string | null, businessDate?: string | null): number {
  if (businessDate) {
    return Math.floor(new Date(`${businessDate}T00:00:00+05:30`).getTime() / 1000);
  }
  if (lastSyncAt) return Math.floor(new Date(lastSyncAt).getTime() / 1000);
  return Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
}

function buildBeforeQueryTimestamp(businessDate?: string | null): number | null {
  if (!businessDate) return null;
  const start = new Date(`${businessDate}T00:00:00+05:30`);
  return Math.floor(new Date(start.getTime() + 2 * 24 * 60 * 60 * 1000).getTime() / 1000);
}

function buildGmailQuery(args: {
  lastSyncAt: string | null;
  businessDate?: string | null;
}): string {
  const parts = [
    `after:${buildAfterQueryTimestamp(args.lastSyncAt, args.businessDate)}`,
    "has:attachment",
    "(",
    '"Report Notification: Item Wise Report"',
    "OR",
    '"Report Notification: Payment Wise Summary"',
    'OR invoice OR bill OR receipt OR "tax invoice" OR "payment due" OR rent OR lease OR maintenance OR CAM OR utility OR utilities OR electricity OR water OR LPG OR gas',
    ")",
  ];

  const before = buildBeforeQueryTimestamp(args.businessDate);
  if (before) parts.push(`before:${before}`);

  return parts.join(" ");
}

function isInvoiceSubject(subject: string): boolean {
  return /\b(invoice|bill|payment due|receipt|tax invoice|rent|lease|maintenance|cam|utility|utilities|electricity|water|lpg|gas)\b/i.test(
    subject
  );
}

function isInvoiceAttachment(candidate: GmailAttachmentCandidate): boolean {
  const name = candidate.fileName.toLowerCase();
  const mime = candidate.mimeType?.toLowerCase() ?? "";
  return mime.includes("pdf") || mime.startsWith("image/") || /\.(pdf|png|jpe?g|webp)$/i.test(name);
}
async function extractInvoiceFromAttachment(args: {
  subject: string;
  sender: string;
  internalDate: string | null;
  fileName: string;
  mimeType: string | null;
  fileBuffer: Buffer;
  bodyText?: string | null;
}): Promise<InvoiceExtraction> {
  return extractInvoiceFromDocument(args);
}

async function uploadInvoiceAttachment(args: {
  outletId: string;
  messageId: string;
  fileName: string;
  mimeType: string | null;
  fileBuffer: Buffer;
}): Promise<string | null> {
  const safeName = args.fileName.replace(/[^a-zA-Z0-9._-]+/g, "_");
  const now = new Date();
  const storagePath = `expense-invoices/${args.outletId}/${now.getUTCFullYear()}/${String(
    now.getUTCMonth() + 1
  ).padStart(2, "0")}/${args.messageId}/${safeName}`;
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from("ingestion-uploads")
    .upload(storagePath, args.fileBuffer, {
      contentType: args.mimeType || "application/octet-stream",
      upsert: true,
    });

  if (error) return null;
  return storagePath;
}

async function defaultExpenseCategoryId(outletId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, name")
    .eq("outlet_id", outletId)
    .eq("is_active", true)
    .order("display_order", { ascending: true });
  if (error) {
    if (isMissingExpenseSchemaError(error.message)) return null;
    throw new Error(error.message);
  }
  const categories = (data ?? []) as Array<{ id: string; name: string }>;
  return (
    categories.find((category) => /supplies|utilities|repairs/i.test(category.name))?.id ??
    categories[0]?.id ??
    null
  );
}

function isMissingExpenseSchemaError(message: string): boolean {
  return /schema cache|public\.expenses|public\.expense_categories|public\.activity_log|Could not find the table/i.test(
    message
  );
}

async function processInvoiceMessage(args: {
  outlet: OutletRow;
  connection: GmailConnectionRow;
  syncRunId: string;
  accessToken: string;
  messageId: string;
  subject: string;
  sender: string;
  internalDate: string | null;
  bodyText: string | null;
  candidates: GmailAttachmentCandidate[];
}): Promise<boolean> {
  if (!isInvoiceSubject(args.subject)) return false;
  const invoiceAttachment = args.candidates.find(isInvoiceAttachment);
  if (!invoiceAttachment) return false;

  const categoryId = await defaultExpenseCategoryId(args.outlet.id);
  if (!categoryId) return false;

  const supabase = createAdminClient();
  const existingExpense = await supabase
    .from("expenses")
    .select("id")
    .eq("outlet_id", args.outlet.id)
    .eq("source_email_id", args.messageId)
    .maybeSingle();
  if (existingExpense.error && !isMissingExpenseSchemaError(existingExpense.error.message)) {
    throw new Error(existingExpense.error.message);
  }
  if (existingExpense.data?.id) {
    await createProcessedMessage({
      outletId: args.outlet.id,
      connectionId: args.connection.id,
      syncRunId: args.syncRunId,
      messageId: args.messageId,
      sourceType: "gmail_invoice",
      subject: args.subject,
      sender: args.sender,
      receivedAt: args.internalDate,
      ingestionRunId: null,
    });
    return true;
  }

  const attachmentBuffer = await getGmailAttachment(
    args.accessToken,
    args.messageId,
    invoiceAttachment.attachmentId
  );
  const attachmentUrl = await uploadInvoiceAttachment({
    outletId: args.outlet.id,
    messageId: args.messageId,
    fileName: invoiceAttachment.fileName,
    mimeType: invoiceAttachment.mimeType,
    fileBuffer: attachmentBuffer,
  });
  const extraction = await extractInvoiceFromAttachment({
    subject: args.subject,
    sender: args.sender,
    internalDate: args.internalDate,
    fileName: invoiceAttachment.fileName,
    mimeType: invoiceAttachment.mimeType,
    fileBuffer: attachmentBuffer,
    bodyText: args.bodyText,
  });
  const isHighConfidence = extraction.confidence >= 90 && extraction.amountPaise > 0;
  const status =
    isHighConfidence && extraction.amountPaise <= args.outlet.auto_approve_under_paise
      ? "approved"
      : isHighConfidence
        ? "auto_scanned"
        : "needs_review";
  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      outlet_id: args.outlet.id,
      category_id: categoryId,
      vendor_name: extraction.vendorName,
      description: extraction.description,
      for_item: extraction.forItem,
      period_label: extraction.periodLabel,
      amount_paise: extraction.amountPaise,
      tax_paise: extraction.taxPaise,
      total_paise: extraction.amountPaise + extraction.taxPaise,
      status,
      invoice_date: extraction.invoiceDate,
      due_date: extraction.dueDate,
      source: "gmail_scan",
      source_email_id: args.messageId,
      source_email_addr: extractSenderEmail(args.sender),
      attachment_url: attachmentUrl,
      extraction_confidence: extraction.confidence,
      approved_at: status === "approved" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) {
    if (isMissingExpenseSchemaError(error.message)) {
      console.error("Skipping Gmail invoice scan because expense tables are unavailable.", {
        outletId: args.outlet.id,
        messageId: args.messageId,
      });
      return false;
    }
    throw new Error(error.message);
  }

  await createProcessedMessage({
    outletId: args.outlet.id,
    connectionId: args.connection.id,
    syncRunId: args.syncRunId,
    messageId: args.messageId,
    sourceType: "gmail_invoice",
    subject: args.subject,
    sender: args.sender,
    receivedAt: args.internalDate,
    ingestionRunId: null,
  });

  const { error: activityError } = await supabase.from("activity_log").insert({
    outlet_id: args.outlet.id,
    user_id: args.connection.connected_by,
    action: "gmail_invoice_scanned",
    target_type: "expense",
    target_id: expense?.id ?? null,
    details: { subject: args.subject, confidence: extraction.confidence } as Json,
  });
  if (activityError && !isMissingExpenseSchemaError(activityError.message)) {
    throw new Error(activityError.message);
  }

  return true;
}

export function buildGmailBackfillDates(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const normalizedStart = start <= end ? start : end;
  const normalizedEnd = start <= end ? end : start;
  const dates: string[] = [];

  for (
    let current = new Date(normalizedStart);
    current <= normalizedEnd;
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000)
  ) {
    dates.push(current.toISOString().slice(0, 10));
  }

  return dates;
}

export function evaluateAutoCommitReadiness(args: {
  detectionConfidence: number;
  rowsErrored: number;
  rowCountEligible: boolean;
  rowCountReason?: string | null;
}): string[] {
  const reasons: string[] = [];

  if (args.detectionConfidence < AUTO_COMMIT_MIN_CONFIDENCE) {
    reasons.push(
      `Parser confidence ${args.detectionConfidence.toFixed(2)} is below ${AUTO_COMMIT_MIN_CONFIDENCE.toFixed(2)}.`
    );
  }
  if (args.rowsErrored > 0) {
    reasons.push(
      `${args.rowsErrored} row-level parse error${args.rowsErrored === 1 ? "" : "s"} found.`
    );
  }
  if (!args.rowCountEligible && args.rowCountReason) {
    reasons.push(args.rowCountReason);
  }

  return reasons;
}

function inferSourceType(subject: string, fileName: string): string | null {
  const match = REPORT_PATTERNS.find(
    (pattern) =>
      pattern.subjectPattern.test(subject) &&
      (!fileName || pattern.filePattern.test(fileName.toLowerCase()))
  );
  return match?.sourceType ?? null;
}

function mapDetectionMethod(confidence: number): IngestionRunRow["detection_method"] {
  if (confidence >= 0.95) return "header_inspection";
  if (confidence >= 0.7) return "filename_pattern";
  return "header_inspection";
}

async function updateConnectionStatus(args: {
  connectionId: string;
  status: GmailConnectionStatus;
  errorMessage?: string | null;
  accessToken?: string | null;
  tokenExpiresAt?: string | null;
  scopes?: string[];
}) {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("gmail_connections")
    .update({
      status: args.status,
      last_sync_error: args.errorMessage ?? null,
      access_token: args.accessToken,
      token_expires_at: args.tokenExpiresAt,
      scopes: args.scopes,
    })
    .eq("id", args.connectionId);

  if (error) throw new Error(error.message);
}

async function ensureAccessToken(connection: GmailConnectionRow): Promise<string> {
  if (
    connection.access_token &&
    connection.token_expires_at &&
    new Date(connection.token_expires_at).getTime() - TOKEN_EXPIRY_SKEW_MS > Date.now()
  ) {
    return connection.access_token;
  }

  if (!connection.refresh_token) {
    await updateConnectionStatus({
      connectionId: connection.id,
      status: "expired",
      errorMessage: "Gmail authorization needs to be renewed.",
      accessToken: null,
      tokenExpiresAt: null,
      scopes: connection.scopes,
    });
    throw new Error("Gmail authorization has expired.");
  }

  try {
    const refreshed = await refreshGmailAccessToken(connection.refresh_token);
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("gmail_connections")
      .update({
        status: "active",
        access_token: refreshed.accessToken,
        token_expires_at: refreshed.tokenExpiresAt,
        scopes: refreshed.scopes,
        last_sync_error: null,
      })
      .eq("id", connection.id);

    if (error) throw new Error(error.message);
    return refreshed.accessToken;
  } catch (error) {
    const typedError = error as Error & { code?: string };
    const expired =
      typedError.code === "invalid_grant" ||
      /invalid_grant|expired|revoked|reauthor/i.test(typedError.message);
    await updateConnectionStatus({
      connectionId: connection.id,
      status: expired ? "expired" : "error",
      errorMessage: typedError.message,
      accessToken: null,
      tokenExpiresAt: null,
      scopes: connection.scopes,
    });
    throw typedError;
  }
}

async function gmailApiJson<T>(url: string, accessToken: string): Promise<T> {
  let attempt = 0;

  while (attempt < GMAIL_API_MAX_RETRIES) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    const payload = (await response.json()) as T & {
      error?: { message?: string; status?: string };
    };

    if (response.ok) return payload;

    const isRateLimited =
      response.status === 429 ||
      (response.status === 403 && /rate limit|quota/i.test(payload.error?.message ?? ""));

    if (isRateLimited && attempt < GMAIL_API_MAX_RETRIES - 1) {
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
      attempt += 1;
      continue;
    }

    const error = new Error(payload.error?.message || "Gmail API request failed.") as Error & {
      status?: number;
    };
    error.status = response.status;
    throw error;
  }

  throw new Error("Gmail API request failed after retries.");
}

async function listGmailMessages(
  accessToken: string,
  query: string
): Promise<Array<{ id: string }>> {
  const messages: Array<{ id: string }> = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      userId: "me",
      q: query,
      maxResults: String(MAX_GMAIL_MESSAGES),
    });
    if (pageToken) params.set("pageToken", pageToken);

    const payload = await gmailApiJson<{
      messages?: Array<{ id: string }>;
      nextPageToken?: string;
    }>(`https://gmail.googleapis.com/gmail/v1/users/me/messages?${params.toString()}`, accessToken);

    messages.push(...(payload.messages ?? []));
    pageToken = payload.nextPageToken;
  } while (pageToken && messages.length < MAX_GMAIL_MESSAGES);

  return messages.slice(0, MAX_GMAIL_MESSAGES);
}

async function getGmailMessage(
  accessToken: string,
  messageId: string
): Promise<GmailMessagePayload> {
  return gmailApiJson<GmailMessagePayload>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    accessToken
  );
}

async function getGmailAttachment(
  accessToken: string,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const payload = await gmailApiJson<{ data?: string }>(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/attachments/${attachmentId}`,
    accessToken
  );

  if (!payload.data) {
    throw new Error("Gmail attachment payload was empty.");
  }

  return decodeBase64Url(payload.data);
}

async function createSyncRun(
  connectionId: string,
  outletId: string,
  triggeredBy: TriggeredBy
): Promise<GmailSyncRunRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gmail_sync_runs")
    .insert({
      connection_id: connectionId,
      outlet_id: outletId,
      triggered_by: triggeredBy,
      status: "running",
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Could not create Gmail sync run.");
  return data;
}

async function finalizeSyncRun(
  syncRunId: string,
  patch: Partial<Tables<"gmail_sync_runs">>
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("gmail_sync_runs")
    .update({
      ...patch,
      completed_at: patch.completed_at ?? new Date().toISOString(),
    })
    .eq("id", syncRunId);

  if (error) throw new Error(error.message);
}

async function createIngestionRunFromBuffer(args: {
  outletId: string;
  uploadedBy: string;
  triggerSource: TriggerSource;
  fileName: string;
  mimeType: string | null;
  fileBuffer: Buffer;
  expectedSourceType: string;
}): Promise<{
  run: IngestionRunRow;
  parserSourceType: string;
  detectionConfidence: number;
}> {
  const supabase = createAdminClient();
  const parsers = getAllParsers();
  const sampleBuffer = args.fileBuffer.subarray(0, 50 * 1024);

  let bestConfidence = 0;
  let bestSourceType = args.expectedSourceType;
  for (const parser of parsers) {
    const result = await parser.detect({
      fileName: args.fileName,
      fileSize: args.fileBuffer.byteLength,
      sampleBuffer,
    });
    if (result.confidence > bestConfidence) {
      bestConfidence = result.confidence;
      bestSourceType = parser.sourceType;
    }
  }

  const runId = randomUUID();
  const fileSha256 = createHash("sha256").update(args.fileBuffer).digest("hex");
  const now = new Date();
  const storagePath = `${args.outletId}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${runId}/${args.fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("ingestion-uploads")
    .upload(storagePath, args.fileBuffer, {
      contentType: args.mimeType || "application/octet-stream",
      upsert: false,
    });
  if (uploadError) throw new Error(uploadError.message);

  const { data, error } = await supabase
    .from("ingestion_runs")
    .insert({
      id: runId,
      outlet_id: args.outletId,
      uploaded_by: args.uploadedBy,
      source_type: args.expectedSourceType,
      detection_method: mapDetectionMethod(bestConfidence),
      detection_confidence: bestConfidence || null,
      user_confirmed_source: false,
      file_name: args.fileName,
      file_size_bytes: args.fileBuffer.byteLength,
      file_mime_type: args.mimeType,
      file_storage_path: storagePath,
      file_sha256: fileSha256,
      trigger_source: args.triggerSource,
      status: "uploaded",
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message || "Could not create ingestion run.");
  return { run: data, parserSourceType: bestSourceType, detectionConfidence: bestConfidence };
}

async function parseIngestionRun(run: IngestionRunRow): Promise<{
  run: IngestionRunRow;
  businessDate: string | null;
  rowsErrored: number;
  rowsParsed: number;
}> {
  const supabase = createAdminClient();
  const parserSupabase = supabase as unknown as ParserSupabaseClient;
  const parser = getParser(run.source_type);
  if (!parser) throw new Error(`No parser available for source type "${run.source_type}".`);

  await supabase
    .from("ingestion_runs")
    .update({
      status: "parsing",
      parsing_started_at: new Date().toISOString(),
    })
    .eq("id", run.id);

  const { data: blob, error: downloadError } = await supabase.storage
    .from("ingestion-uploads")
    .download(run.file_storage_path);
  if (downloadError || !blob) {
    throw new Error(downloadError?.message || "Could not download ingestion file.");
  }

  const rowErrors: Array<{
    rowNumber: number;
    errorCode: string;
    errorMessage: string;
    fieldName?: string;
    rawValue?: string;
    rawRow?: unknown;
  }> = [];
  const fileBuffer = Buffer.from(await blob.arrayBuffer());
  const parseResult = await parser.parse({
    runId: run.id,
    outletId: run.outlet_id,
    filePath: run.file_storage_path,
    fileBuffer,
    recordError: (error) => rowErrors.push(error),
  });
  const normalizeResult = await parser.normalize({
    runId: run.id,
    outletId: run.outlet_id,
    records: parseResult.records,
    supabase: parserSupabase,
  });

  if (rowErrors.length > 0) {
    await supabase.from("ingestion_row_errors").insert(
      rowErrors.map((error) => ({
        run_id: run.id,
        row_number: error.rowNumber,
        error_code: error.errorCode,
        error_message: error.errorMessage,
        field_name: error.fieldName ?? null,
        raw_value: error.rawValue ? String(error.rawValue).slice(0, 500) : null,
        raw_row: (error.rawRow ?? null) as Json,
      }))
    );
  }

  const previewPayload = (normalizeResult.previewPayload ?? {
    displayName: parser.displayName,
    canonicalRecords: normalizeResult.toInsert,
  }) as Json;

  const { data: updatedRun, error: updateError } = await supabase
    .from("ingestion_runs")
    .update({
      status: "preview_ready",
      parsing_completed_at: new Date().toISOString(),
      rows_seen: parseResult.rowsSeen,
      rows_parsed: parseResult.records.length,
      rows_to_insert: normalizeResult.rowsToInsertCount ?? normalizeResult.toInsert.length,
      rows_duplicate: normalizeResult.duplicateCount,
      rows_errored: rowErrors.length,
      preview_payload: previewPayload,
    })
    .eq("id", run.id)
    .select("*")
    .single();

  if (updateError || !updatedRun) throw new Error(updateError?.message || "Could not update run.");
  const payload = updatedRun.preview_payload as { businessDate?: string | null } | null;

  return {
    run: updatedRun,
    businessDate: payload?.businessDate ?? null,
    rowsErrored: rowErrors.length,
    rowsParsed: parseResult.records.length,
  };
}

async function computeRowCountEligibility(run: IngestionRunRow): Promise<{
  eligible: boolean;
  reason: string | null;
}> {
  if (!run.outlet_id) {
    return {
      eligible: false,
      reason: "Auto-commit requires an outlet-scoped ingestion run.",
    };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ingestion_runs")
    .select("rows_parsed")
    .eq("outlet_id", run.outlet_id)
    .eq("source_type", run.source_type)
    .eq("status", "committed")
    .is("deleted_at", null)
    .order("committed_at", { ascending: false })
    .limit(7);

  if (error) throw new Error(error.message);
  const samples = ((data ?? []) as Array<{ rows_parsed: number | null }>)
    .map((row) => row.rows_parsed ?? 0)
    .filter((value) => value > 0);

  if (samples.length < AUTO_COMMIT_MIN_BASELINE_SAMPLES) {
    return { eligible: true, reason: null };
  }

  const average = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  const lower = average * (1 - AUTO_COMMIT_VARIANCE);
  const upper = average * (1 + AUTO_COMMIT_VARIANCE);
  const current = run.rows_parsed ?? 0;

  if (current < lower || current > upper) {
    return {
      eligible: false,
      reason: `Row count ${current} is outside the expected ${Math.round(lower)}-${Math.round(
        upper
      )} range.`,
    };
  }

  return { eligible: true, reason: null };
}

async function commitRunInternal(runId: string, committedBy: string): Promise<void> {
  const supabase = createAdminClient();
  const parserSupabase = supabase as unknown as ParserSupabaseClient;
  const { data: run, error } = await supabase
    .from("ingestion_runs")
    .select("*")
    .eq("id", runId)
    .single();
  if (error || !run) throw new Error(error?.message || "Run not found.");
  if (!run.outlet_id) throw new Error("Auto-commit requires an outlet-scoped ingestion run.");

  const parser = getParser(run.source_type);
  if (!parser) throw new Error(`No parser available for source type "${run.source_type}".`);

  await supabase
    .from("ingestion_runs")
    .update({ status: "committing", committing_started_at: new Date().toISOString() })
    .eq("id", runId);

  try {
    const payload = run.preview_payload as { canonicalRecords?: unknown[] } | null;
    const result = await parser.commit({
      runId,
      outletId: run.outlet_id,
      records: payload?.canonicalRecords ?? [],
      committedBy,
      supabase: parserSupabase,
    });

    await supabase
      .from("ingestion_runs")
      .update({
        status: "committed",
        committed_at: new Date().toISOString(),
        committed_by: committedBy,
        rows_to_insert: result.rowsInserted,
      })
      .eq("id", runId);

    if (run.source_type === "petpooja_payment_summary") {
      const businessDate = (run.preview_payload as { businessDate?: string | null } | null)
        ?.businessDate;
      if (businessDate) {
        const { data: items } = await supabase
          .from("ingestion_runs")
          .select("id")
          .eq("outlet_id", run.outlet_id)
          .eq("source_type", "petpooja_item_bill")
          .eq("status", "preview_ready")
          .is("deleted_at", null);

        for (const itemRun of (items ?? []) as Array<{ id: string }>) {
          const { data: fullItem } = await supabase
            .from("ingestion_runs")
            .select("id, preview_payload")
            .eq("id", itemRun.id)
            .single();
          const itemBusinessDate = (
            fullItem?.preview_payload as { businessDate?: string | null } | null
          )?.businessDate;
          if (itemBusinessDate === businessDate) {
            const itemParser = getParser("petpooja_item_bill");
            if (!itemParser) continue;
            const normalizeResult = await itemParser.normalize({
              runId: itemRun.id,
              outletId: run.outlet_id,
              records: ((fullItem?.preview_payload as { rawRecords?: unknown[] } | null)
                ?.rawRecords ?? []) as unknown[],
              supabase: parserSupabase,
            });

            await supabase
              .from("ingestion_runs")
              .update({
                preview_payload: normalizeResult.previewPayload as Json,
                rows_to_insert:
                  normalizeResult.rowsToInsertCount ?? normalizeResult.toInsert.length,
                rows_duplicate: normalizeResult.duplicateCount,
                status: "committing",
                committing_started_at: new Date().toISOString(),
              })
              .eq("id", itemRun.id);

            const itemCommit = await itemParser.commit({
              runId: itemRun.id,
              outletId: run.outlet_id,
              records: normalizeResult.toInsert,
              committedBy,
              supabase: parserSupabase,
            });

            await supabase
              .from("ingestion_runs")
              .update({
                status: "committed",
                committed_at: new Date().toISOString(),
                committed_by: committedBy,
                rows_to_insert: itemCommit.rowsInserted,
              })
              .eq("id", itemRun.id);
          }
        }
      }
    }
  } catch (error) {
    try {
      await parser.rollback({ runId, supabase: parserSupabase });
    } catch {
      // leave original error path intact
    }
    await supabase
      .from("ingestion_runs")
      .update({
        status: "failed",
        failed_at: new Date().toISOString(),
        error_details: { message: error instanceof Error ? error.message : "Commit failed." },
      })
      .eq("id", runId);
    throw error;
  }
}

async function createProcessedMessage(args: {
  outletId: string;
  connectionId: string;
  syncRunId: string;
  messageId: string;
  sourceType: string;
  subject: string;
  sender: string;
  receivedAt: string | null;
  ingestionRunId?: string | null;
}) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("gmail_processed_messages").upsert(
    {
      outlet_id: args.outletId,
      connection_id: args.connectionId,
      sync_run_id: args.syncRunId,
      message_id: args.messageId,
      source_type: args.sourceType,
      subject: args.subject,
      sender: args.sender,
      received_at: args.receivedAt,
      ingestion_run_id: args.ingestionRunId ?? null,
    },
    { onConflict: "outlet_id,message_id" }
  );

  if (error) throw new Error(error.message);
}

async function alreadyProcessedMessage(outletId: string, messageId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gmail_processed_messages")
    .select("id")
    .eq("outlet_id", outletId)
    .eq("message_id", messageId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return Boolean(data);
}

async function sendWhatsappReviewAlert(args: {
  outlet: OutletRow;
  reason: string;
  businessDate: string | null;
  runIds: string[];
}) {
  const webhookUrl = process.env.WHATSAPP_ALERT_WEBHOOK_URL;
  const payload = {
    outletId: args.outlet.id,
    outletName: args.outlet.name,
    businessDate: args.businessDate,
    reason: args.reason,
    runIds: args.runIds,
    reviewUrl: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/ingest`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/ingest`
        : "/ingest",
  };

  if (!webhookUrl) {
    console.error("WhatsApp alert webhook is not configured.", payload);
    return;
  }

  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function processAttachment(args: {
  outlet: OutletRow;
  connection: GmailConnectionRow;
  syncRunId: string;
  uploadedBy: string;
  triggerSource: TriggerSource;
  subject: string;
  sender: string;
  messageId: string;
  internalDate: string | null;
  candidate: GmailAttachmentCandidate;
  attachmentBuffer: Buffer;
}): Promise<AttachmentSyncResult> {
  const expectedSourceType = inferSourceType(args.subject, args.candidate.fileName);
  if (!expectedSourceType) {
    throw new Error(`Could not infer source type from subject "${args.subject}".`);
  }

  const created = await createIngestionRunFromBuffer({
    outletId: args.outlet.id,
    uploadedBy: args.uploadedBy,
    triggerSource: args.triggerSource,
    fileName: args.candidate.fileName,
    mimeType: args.candidate.mimeType,
    fileBuffer: args.attachmentBuffer,
    expectedSourceType,
  });

  const parsed = await parseIngestionRun(created.run);
  const rowCountCheck = await computeRowCountEligibility(parsed.run);

  const reasons = evaluateAutoCommitReadiness({
    detectionConfidence: created.detectionConfidence,
    rowsErrored: parsed.rowsErrored,
    rowCountEligible: rowCountCheck.eligible,
    rowCountReason: rowCountCheck.reason,
  });

  await createProcessedMessage({
    outletId: args.outlet.id,
    connectionId: args.connection.id,
    syncRunId: args.syncRunId,
    messageId: args.messageId,
    sourceType: expectedSourceType,
    subject: args.subject,
    sender: args.sender,
    receivedAt: args.internalDate,
    ingestionRunId: parsed.run.id,
  });

  if (reasons.length > 0) {
    const supabase = createAdminClient();
    await supabase
      .from("ingestion_runs")
      .update({
        error_details: {
          auto_review_required: true,
          reasons,
        } as Json,
      })
      .eq("id", parsed.run.id);
  }

  return {
    runId: parsed.run.id,
    sourceType: expectedSourceType,
    businessDate: parsed.businessDate,
    detectionConfidence: created.detectionConfidence,
    rowsErrored: parsed.rowsErrored,
    rowsParsed: parsed.rowsParsed,
    autoCommitEligible: reasons.length === 0,
    autoCommitReasons: reasons,
  };
}

export type GmailSyncHistoryRow = GmailSyncRunRow;

export async function listGmailSyncHistory(
  outletId: string,
  limit = 14
): Promise<GmailSyncHistoryRow[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gmail_sync_runs")
    .select("*")
    .eq("outlet_id", outletId)
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []) as GmailSyncHistoryRow[];
}

export async function syncGmailForOutlet(options: SyncOptions): Promise<SyncResult> {
  const supabase = createAdminClient();
  const [{ data: connection, error: connectionError }, { data: outlet, error: outletError }] =
    await Promise.all([
      supabase
        .from("gmail_connections")
        .select("*")
        .eq("outlet_id", options.outletId)
        .maybeSingle(),
      supabase.from("outlets").select("*").eq("id", options.outletId).single(),
    ]);

  if (connectionError) throw new Error(connectionError.message);
  if (!connection) throw new Error("No Gmail connection found for this outlet.");
  if (outletError || !outlet) throw new Error(outletError?.message || "Outlet not found.");

  const syncRun = await createSyncRun(connection.id, options.outletId, options.triggeredBy);
  const uploadedBy = options.requestedByUserId ?? connection.connected_by;

  try {
    const accessToken = await ensureAccessToken(connection);
    const query = buildGmailQuery({
      lastSyncAt: connection.last_sync_at,
      businessDate: options.businessDate,
    });
    const messageRefs = await listGmailMessages(accessToken, query);

    let emailsProcessed = 0;
    let emailsSkipped = 0;
    const attachmentResults: AttachmentSyncResult[] = [];
    const partialErrors: string[] = [];

    for (const messageRef of messageRefs) {
      if (await alreadyProcessedMessage(options.outletId, messageRef.id)) {
        emailsSkipped += 1;
        continue;
      }

      const message = await getGmailMessage(accessToken, messageRef.id);
      const payload = message.payload;
      const subject = getHeader(payload?.headers, "Subject");
      const sender = getHeader(payload?.headers, "From");
      const internalDate = message.internalDate
        ? new Date(Number(message.internalDate)).toISOString()
        : null;
      const bodyText =
        [message.snippet?.trim() || "", ...collectMessageBodyText(payload)]
          .filter(Boolean)
          .join("\n\n")
          .trim() || null;

      const matchingSubject = REPORT_PATTERNS.some((pattern) =>
        pattern.subjectPattern.test(subject)
      );
      const candidates = collectAttachmentCandidates(payload);
      if (!matchingSubject) {
        if (
          await processInvoiceMessage({
            outlet,
            connection,
            syncRunId: syncRun.id,
            accessToken,
            messageId: messageRef.id,
            subject,
            sender,
            internalDate,
            bodyText,
            candidates,
          })
        ) {
          emailsProcessed += 1;
          continue;
        }
        emailsSkipped += 1;
        continue;
      }

      if (!isAllowedPetpoojaSender(sender)) {
        await createProcessedMessage({
          outletId: options.outletId,
          connectionId: connection.id,
          syncRunId: syncRun.id,
          messageId: messageRef.id,
          sourceType: "rejected_sender",
          subject,
          sender,
          receivedAt: internalDate,
          ingestionRunId: null,
        });
        emailsSkipped += 1;
        continue;
      }

      if (!subjectMatchesOutlet(subject, outlet)) {
        await createProcessedMessage({
          outletId: options.outletId,
          connectionId: connection.id,
          syncRunId: syncRun.id,
          messageId: messageRef.id,
          sourceType: "outlet_mismatch",
          subject,
          sender,
          receivedAt: internalDate,
          ingestionRunId: null,
        });
        emailsSkipped += 1;
        continue;
      }

      for (const candidate of candidates) {
        const expectedSourceType = inferSourceType(subject, candidate.fileName);
        if (!expectedSourceType) continue;

        try {
          const attachmentBuffer = await getGmailAttachment(
            accessToken,
            messageRef.id,
            candidate.attachmentId
          );

          const result = await processAttachment({
            outlet,
            connection,
            syncRunId: syncRun.id,
            uploadedBy,
            triggerSource: options.triggerSource,
            subject,
            sender,
            messageId: messageRef.id,
            internalDate,
            candidate,
            attachmentBuffer,
          });

          attachmentResults.push(result);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Attachment processing failed unexpectedly.";
          partialErrors.push(`${candidate.fileName}: ${message}`);
          await sendWhatsappReviewAlert({
            outlet,
            reason: `Auto-sync could not process ${candidate.fileName}. ${message}`,
            businessDate: null,
            runIds: [],
          });
        }
      }

      emailsProcessed += 1;
    }

    const groupedByBusinessDate = new Map<
      string,
      { item?: AttachmentSyncResult; payment?: AttachmentSyncResult }
    >();
    for (const result of attachmentResults) {
      const key = result.businessDate ?? `unknown-${result.runId}`;
      const current = groupedByBusinessDate.get(key) ?? {};
      if (result.sourceType === "petpooja_item_bill") current.item = result;
      if (result.sourceType === "petpooja_payment_summary") current.payment = result;
      groupedByBusinessDate.set(key, current);
    }

    let status: GmailSyncRunRow["status"] =
      partialErrors.length > 0 && attachmentResults.length === 0 ? "failed" : "success";
    for (const [businessDate, pair] of groupedByBusinessDate) {
      const pairRunIds = [pair.item?.runId, pair.payment?.runId].filter(Boolean) as string[];

      if (
        pair.item &&
        pair.payment &&
        pair.item.autoCommitEligible &&
        pair.payment.autoCommitEligible
      ) {
        await commitRunInternal(pair.payment.runId, uploadedBy);
      } else {
        status = "partial";
        const reasons = [
          ...(pair.item?.autoCommitReasons ?? []),
          ...(pair.payment?.autoCommitReasons ?? []),
        ];
        if (!pair.item || !pair.payment) {
          reasons.push("Both Petpooja daily reports were not available for this business date.");
        }
        await sendWhatsappReviewAlert({
          outlet,
          reason: reasons.join(" "),
          businessDate: businessDate.startsWith("unknown-") ? null : businessDate,
          runIds: pairRunIds,
        });
      }
    }

    if (attachmentResults.length === 0 && emailsProcessed === 0 && messageRefs.length === 0) {
      status = "no_emails";
    } else if (partialErrors.length > 0 && status === "success") {
      status = "partial";
    } else if (attachmentResults.length === 0 && emailsSkipped > 0 && status === "success") {
      status = "partial";
    }

    const ingestionRunIds = attachmentResults.map((result) => result.runId);
    await finalizeSyncRun(syncRun.id, {
      status,
      emails_found: messageRefs.length,
      emails_processed: emailsProcessed,
      emails_skipped: emailsSkipped,
      ingestion_run_ids: ingestionRunIds,
      processed_message_ids: messageRefs.map((message) => message.id),
      error_message: partialErrors.length > 0 ? partialErrors.join(" | ") : null,
    });

    await supabase
      .from("gmail_connections")
      .update({
        status: "active",
        last_sync_at: new Date().toISOString(),
        last_sync_status: status,
        last_sync_error: null,
      })
      .eq("id", connection.id);

    revalidatePath("/ingest");
    revalidatePath("/dashboard");

    return {
      syncRunId: syncRun.id,
      status,
      emailsFound: messageRefs.length,
      emailsProcessed: emailsProcessed,
      emailsSkipped: emailsSkipped,
      ingestionRunIds,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail sync failed.";
    await finalizeSyncRun(syncRun.id, {
      status: "failed",
      emails_found: 0,
      emails_processed: 0,
      emails_skipped: 0,
      ingestion_run_ids: [],
      processed_message_ids: [],
      error_message: message,
    });

    const connectionPatch: Partial<Tables<"gmail_connections">> = {
      last_sync_status: "failed",
      last_sync_error: message,
    };
    if (/expired|reauthor|invalid_grant|revoked/i.test(message)) {
      connectionPatch.status = "expired";
    }
    await supabase.from("gmail_connections").update(connectionPatch).eq("id", connection.id);
    revalidatePath("/ingest");
    throw error;
  }
}

export async function syncAllGmailConnections(triggeredBy: TriggeredBy): Promise<{
  results: SyncResult[];
}> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("gmail_connections")
    .select("outlet_id")
    .in("status", ["active", "expired"]);

  if (error) throw new Error(error.message);
  const outletIds = Array.from(
    new Set(((data ?? []) as Array<{ outlet_id: string }>).map((row) => row.outlet_id))
  );
  const triggerSource: TriggerSource = triggeredBy === "manual" ? "gmail_manual" : "gmail_auto";
  const results: SyncResult[] = [];

  for (const outletId of outletIds) {
    try {
      results.push(
        await syncGmailForOutlet({
          outletId,
          triggeredBy,
          triggerSource,
        })
      );
    } catch (error) {
      console.error(`Gmail sync failed for outlet ${outletId}:`, error);
    }
  }

  return { results };
}
