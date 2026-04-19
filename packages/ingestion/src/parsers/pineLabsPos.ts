import { IngestionError } from "../errors";
import type {
  CommitContext,
  NormalizeContext,
  NormalizeResult,
  ParseContext,
  ParseResult,
  Parser,
  RollbackContext,
} from "../types/parser";
import {
  assertSupabaseSuccess,
  batch,
  filenameMatches,
  getSheetRows,
  normalizeHeader,
  parseMoneyToPaise,
  readWorkbook,
  sampleText,
  stripExcelNoise,
  stripLeadingBacktick,
  toIstIsoString,
  truncateLast4,
  truncateUpiVpa,
} from "./helpers";

interface PineLabsRawRecord {
  rowNumber: number;
  sourceTransactionId: string;
  transactionType: string;
  amountPaise: number;
  currency: string;
  transactedAt: string;
  status: string;
  cardIssuer: string | null;
  cardNetwork: string | null;
  cardLast4: string | null;
  isContactless: boolean | null;
  isEmi: boolean | null;
  upiVpa: string | null;
  upiName: string | null;
  hardwareId: string | null;
  tid: string | null;
  mid: string | null;
  batchNo: string | null;
  rawData: Record<string, string | number | boolean | null>;
}

type PineLabsCanonicalRecord = PineLabsRawRecord;

function mapTransactionType(reportType: string, subReportType: string, cardType: string): string {
  const report = reportType.trim().toLowerCase();
  const sub = subReportType.trim().toLowerCase();
  const card = cardType.trim().toLowerCase();

  if (report === "upi") return "upi";
  if (report === "paper pos") return "paper_pos";
  if (report === "card" && card === "credit") return "card_credit";
  if (report === "card" && card === "debit") return "card_debit";
  if (sub) return `${report}_${sub}`.replace(/\s+/g, "_");
  return report.replace(/\s+/g, "_");
}

function parseBooleanFlag(value: unknown): boolean | null {
  const normalized = stripExcelNoise(value).toLowerCase();
  if (!normalized) return null;
  if (["yes", "y", "true", "1"].includes(normalized)) return true;
  if (["no", "n", "false", "0"].includes(normalized)) return false;
  return null;
}

export const pineLabsPosParser: Parser<PineLabsRawRecord, PineLabsCanonicalRecord> = {
  sourceType: "pine_labs_pos",
  displayName: "Pine Labs POS",
  acceptedExtensions: ["xlsx", "xls"],

  async detect(ctx) {
    const text = sampleText(ctx.sampleBuffer);
    if (filenameMatches(ctx.fileName.toLowerCase(), /pinelab|pine[_\s-]*labs/)) {
      return { confidence: 0.9, reason: "Filename looks like a Pine Labs export." };
    }
    if (
      text.includes("transaction amount") &&
      text.includes("card issuer") &&
      text.includes("tid")
    ) {
      return { confidence: 0.75, reason: "Workbook sample includes Pine Labs headers." };
    }
    return { confidence: 0, reason: "No Pine Labs signals found." };
  },

  async parse(ctx: ParseContext): Promise<ParseResult<PineLabsRawRecord>> {
    const workbook = readWorkbook(ctx.fileBuffer, ctx.filePath);
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new IngestionError("parse_error", "The workbook did not contain any sheets.");
    }

    const rows = getSheetRows(workbook.Sheets[firstSheetName]!);
    const headerRow = rows[0];
    if (!headerRow) {
      throw new IngestionError(
        "missing_required_column",
        "Could not find the Pine Labs header row."
      );
    }

    const normalizedHeaders = headerRow.map((header) => normalizeHeader(header));
    const getIndex = (header: string): number => {
      const index = normalizedHeaders.indexOf(normalizeHeader(header));
      if (index === -1) {
        throw new IngestionError("missing_required_column", `Missing "${header}" column.`);
      }
      return index;
    };

    const txIdIndex = getIndex("Transaction Id");
    const reportTypeIndex = getIndex("Report Type");
    const subReportTypeIndex = getIndex("Sub Report Type");
    const cardTypeIndex = getIndex("Card Type");
    const amountIndex = getIndex("Transaction Amount");
    const currencyIndex = getIndex("Currency");
    const dateIndex = getIndex("Transaction Date");
    const timeIndex = getIndex("Time");
    const statusIndex = getIndex("Transaction Status");
    const paymentModeIndex = getIndex("Customer Payment Mode ID");

    const optionalIndex = (header: string): number | null => {
      const index = normalizedHeaders.indexOf(normalizeHeader(header));
      return index === -1 ? null : index;
    };

    const records: PineLabsRawRecord[] = [];

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] ?? [];
      if (row.every((cell) => stripExcelNoise(cell) === "")) continue;

      try {
        const sourceTransactionId = stripLeadingBacktick(row[txIdIndex]);
        if (!sourceTransactionId) {
          throw new IngestionError("missing_required_field", "Transaction Id is required.");
        }

        const paymentMode = stripExcelNoise(row[paymentModeIndex]);
        const reportType = stripExcelNoise(row[reportTypeIndex]);

        const objectRow: Record<string, string | number | boolean | null> = {};
        headerRow.forEach((header, index) => {
          const key = stripExcelNoise(header);
          const value = row[index];
          objectRow[key] =
            value instanceof Date
              ? value.toISOString()
              : (value as string | number | boolean | null);
        });

        records.push({
          rowNumber: rowIndex + 1,
          sourceTransactionId,
          transactionType: mapTransactionType(
            reportType,
            stripExcelNoise(row[subReportTypeIndex]),
            stripExcelNoise(row[cardTypeIndex])
          ),
          amountPaise: parseMoneyToPaise(row[amountIndex], "Transaction Amount"),
          currency: stripExcelNoise(row[currencyIndex]) || "INR",
          transactedAt: toIstIsoString(row[dateIndex], row[timeIndex]),
          status: stripExcelNoise(row[statusIndex]).toLowerCase(),
          cardIssuer:
            optionalIndex("Card Issuer") != null
              ? stripExcelNoise(row[optionalIndex("Card Issuer")!]) || null
              : null,
          cardNetwork:
            optionalIndex("Card Network") != null
              ? stripExcelNoise(row[optionalIndex("Card Network")!]) || null
              : null,
          cardLast4: reportType.toLowerCase() === "card" ? truncateLast4(paymentMode) : null,
          isContactless:
            optionalIndex("Contactless") != null
              ? parseBooleanFlag(row[optionalIndex("Contactless")!])
              : null,
          isEmi:
            optionalIndex("Is Emi") != null
              ? parseBooleanFlag(row[optionalIndex("Is Emi")!])
              : null,
          upiVpa: reportType.toLowerCase() === "upi" ? truncateUpiVpa(paymentMode) : null,
          upiName:
            optionalIndex("Name") != null
              ? stripExcelNoise(row[optionalIndex("Name")!]) || null
              : null,
          hardwareId:
            optionalIndex("Hardware ID") != null
              ? stripExcelNoise(row[optionalIndex("Hardware ID")!]) || null
              : null,
          tid:
            optionalIndex("TID") != null
              ? stripExcelNoise(row[optionalIndex("TID")!]) || null
              : null,
          mid:
            optionalIndex("MID") != null
              ? stripExcelNoise(row[optionalIndex("MID")!]) || null
              : null,
          batchNo:
            optionalIndex("Batch No") != null
              ? stripExcelNoise(row[optionalIndex("Batch No")!]) || null
              : null,
          rawData: objectRow,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not parse row.";
        ctx.recordError({
          rowNumber: rowIndex + 1,
          errorCode: error instanceof IngestionError ? error.code : "parse_error",
          errorMessage: message,
          rawRow: row,
        });
      }
    }

    return { rowsSeen: rows.length, records };
  },

  async normalize(
    ctx: NormalizeContext<PineLabsRawRecord>
  ): Promise<NormalizeResult<PineLabsCanonicalRecord>> {
    if (!ctx.outletId) {
      throw new IngestionError("parse_error", "Pine Labs transactions require an outlet.");
    }

    const existingIds = new Set<string>();
    const transactionIds = ctx.records.map((record) => record.sourceTransactionId);

    for (const chunk of batch(transactionIds)) {
      const result = await ctx.supabase
        .from("payment_transactions")
        .select("source_transaction_id")
        .eq("outlet_id", ctx.outletId)
        .eq("source", "pine_labs")
        .in("source_transaction_id", chunk);

      assertSupabaseSuccess(result, "Failed to check for duplicate Pine Labs transactions.");
      const rows = (result.data as Array<{ source_transaction_id: string }> | null) ?? [];
      rows.forEach((row) => existingIds.add(row.source_transaction_id));
    }

    const toInsert = ctx.records.filter((record) => !existingIds.has(record.sourceTransactionId));
    return { toInsert, duplicateCount: ctx.records.length - toInsert.length };
  },

  async commit(ctx: CommitContext<PineLabsCanonicalRecord>) {
    if (!ctx.outletId) {
      throw new IngestionError("parse_error", "Pine Labs transactions require an outlet.");
    }

    const rows = ctx.records.map((record) => ({
      outlet_id: ctx.outletId,
      source: "pine_labs",
      source_transaction_id: record.sourceTransactionId,
      transaction_type: record.transactionType,
      amount_paise: record.amountPaise,
      currency: record.currency,
      transacted_at: record.transactedAt,
      status: record.status,
      card_issuer: record.cardIssuer,
      card_network: record.cardNetwork,
      card_last_4: record.cardLast4,
      is_contactless: record.isContactless,
      is_emi: record.isEmi,
      upi_vpa: record.upiVpa,
      upi_name: record.upiName,
      hardware_id: record.hardwareId,
      tid: record.tid,
      mid: record.mid,
      batch_no: record.batchNo,
      matched_order_id: null,
      match_confidence: null,
      matched_at: null,
      raw_data: record.rawData,
      ingestion_run_id: ctx.runId,
    }));

    if (rows.length > 0) {
      const insertResult = await ctx.supabase.from("payment_transactions").insert(rows);
      assertSupabaseSuccess(insertResult, "Failed to insert Pine Labs transactions.");
    }

    for (const record of ctx.records) {
      const transactionLookup = await ctx.supabase
        .from("payment_transactions")
        .select("id")
        .eq("outlet_id", ctx.outletId)
        .eq("source", "pine_labs")
        .eq("source_transaction_id", record.sourceTransactionId)
        .single();
      assertSupabaseSuccess(transactionLookup, "Failed to load inserted Pine Labs transaction.");

      const transactionId = (transactionLookup.data as { id: string } | null)?.id;
      if (!transactionId) continue;

      const windowStart = new Date(
        new Date(record.transactedAt).getTime() - 5 * 60 * 1000
      ).toISOString();
      const windowEnd = new Date(
        new Date(record.transactedAt).getTime() + 5 * 60 * 1000
      ).toISOString();

      const candidateResult = await ctx.supabase
        .from("sales_orders")
        .select("id, total_amount_paise")
        .eq("outlet_id", ctx.outletId)
        .gte("ordered_at", windowStart)
        .lte("ordered_at", windowEnd);
      assertSupabaseSuccess(candidateResult, "Failed to find matching sales orders.");

      const candidates = (
        (candidateResult.data as Array<{ id: string; total_amount_paise: number }> | null) ?? []
      ).filter((candidate) => Math.abs(candidate.total_amount_paise - record.amountPaise) <= 100);

      const updatePayload =
        candidates.length === 1
          ? {
              matched_order_id: candidates[0]!.id,
              match_confidence: "heuristic",
              matched_at: new Date().toISOString(),
            }
          : {
              matched_order_id: null,
              match_confidence: "unmatched",
              matched_at: null,
            };

      const updateResult = await ctx.supabase
        .from("payment_transactions")
        .update(updatePayload)
        .eq("id", transactionId);
      assertSupabaseSuccess(updateResult, "Failed to store Pine Labs reconciliation result.");
    }

    return { rowsInserted: rows.length };
  },

  async rollback(ctx: RollbackContext) {
    const deleteRows = await ctx.supabase
      .from("payment_transactions")
      .delete()
      .eq("ingestion_run_id", ctx.runId);
    assertSupabaseSuccess(deleteRows, "Failed to roll back Pine Labs transactions.");
  },
};
