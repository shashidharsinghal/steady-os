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
  filenameMatches,
  getSheetRows,
  normalizeHeader,
  parseMoneyToPaise,
  readWorkbook,
  sampleText,
  stripExcelNoise,
} from "./helpers";

interface PetpoojaDayWiseRawRecord {
  rowNumber: number;
  dateKey: string;
  petpoojaTotalPaise: number;
  rawData: Record<string, string | number | boolean | null>;
}

interface DayWiseValidationRecord {
  dateKey: string;
  petpoojaTotalPaise: number;
  computedTotalPaise: number;
  variancePaise: number;
}

export const petpoojaDayWiseParser: Parser<PetpoojaDayWiseRawRecord, DayWiseValidationRecord> = {
  sourceType: "petpooja_day_wise",
  displayName: "Petpooja Day-Wise Validation",
  acceptedExtensions: ["xlsx", "xls"],

  async detect(ctx) {
    const text = sampleText(ctx.sampleBuffer);
    if (filenameMatches(ctx.fileName.toLowerCase(), /(miracle|daywise|day_wise)/)) {
      return { confidence: 0.7, reason: "Filename looks like a Petpooja day-wise report." };
    }
    if (text.includes("all restaurant report: day wise")) {
      return { confidence: 0.8, reason: "Workbook sample includes the day-wise report title." };
    }
    return { confidence: 0, reason: "No Petpooja day-wise signals found." };
  },

  async parse(ctx: ParseContext): Promise<ParseResult<PetpoojaDayWiseRawRecord>> {
    const workbook = readWorkbook(ctx.fileBuffer, ctx.filePath);
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new IngestionError("parse_error", "The workbook did not contain any sheets.");
    }

    const rows = getSheetRows(workbook.Sheets[firstSheetName]!);
    const headerRowIndex = rows.findIndex((row) => {
      const normalized = (row ?? []).map((value) => normalizeHeader(value));
      return normalized.includes("date") && normalized.includes("total sales");
    });

    if (headerRowIndex === -1) {
      throw new IngestionError(
        "missing_required_column",
        "Could not find the day-wise header row."
      );
    }

    const headerRow = rows[headerRowIndex] ?? [];

    const normalizedHeaders = headerRow.map((value) => normalizeHeader(value));
    const dateIndex = normalizedHeaders.indexOf("date");
    const totalSalesIndex = normalizedHeaders.indexOf("total sales");

    if (dateIndex === -1 || totalSalesIndex === -1) {
      throw new IngestionError(
        "missing_required_column",
        'The report must include "Date" and "Total Sales" columns.'
      );
    }

    const records: PetpoojaDayWiseRawRecord[] = [];

    for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] ?? [];
      const dateValue = stripExcelNoise(row[dateIndex]);
      if (!dateValue || dateValue.toLowerCase() === "total" || dateValue.toLowerCase() === "min.") {
        continue;
      }
      if (!/\d{4}-\d{2}-\d{2}/.test(dateValue)) continue;

      try {
        const dateKey = new Date(dateValue).toISOString().slice(0, 10);
        const objectRow: Record<string, string | number | boolean | null> = {};
        normalizedHeaders.forEach((header, index) => {
          objectRow[header] = row[index] == null ? null : (row[index] as string | number | boolean);
        });

        records.push({
          rowNumber: rowIndex + 1,
          dateKey,
          petpoojaTotalPaise: parseMoneyToPaise(row[totalSalesIndex], "Total Sales"),
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
    ctx: NormalizeContext<PetpoojaDayWiseRawRecord>
  ): Promise<NormalizeResult<DayWiseValidationRecord>> {
    if (!ctx.outletId) {
      throw new IngestionError("parse_error", "Petpooja day-wise validation requires an outlet.");
    }

    const results: DayWiseValidationRecord[] = [];

    for (const record of ctx.records) {
      const startIso = new Date(`${record.dateKey}T00:00:00+05:30`).toISOString();
      const endIso = new Date(`${record.dateKey}T23:59:59+05:30`).toISOString();

      const query = await ctx.supabase
        .from("sales_orders")
        .select("total_amount_paise")
        .eq("outlet_id", ctx.outletId)
        .eq("source", "petpooja")
        .gte("ordered_at", startIso)
        .lte("ordered_at", endIso);

      assertSupabaseSuccess(query, "Failed to compute day-wise validation totals.");

      const rows = (query.data as Array<{ total_amount_paise: number }> | null) ?? [];
      const computedTotalPaise = rows.reduce((sum, row) => sum + row.total_amount_paise, 0);

      results.push({
        dateKey: record.dateKey,
        petpoojaTotalPaise: record.petpoojaTotalPaise,
        computedTotalPaise,
        variancePaise: computedTotalPaise - record.petpoojaTotalPaise,
      });
    }

    return { toInsert: results, duplicateCount: 0 };
  },

  async commit(_ctx: CommitContext<DayWiseValidationRecord>) {
    return { rowsInserted: 0 };
  },

  async rollback(_ctx: RollbackContext) {},
};
