import * as XLSX from "xlsx";
import { IngestionError } from "../errors";
import type { ParserSupabaseClient, ParserSupabaseResult } from "../types/parser";

type Matrix = Array<Array<string | number | boolean | Date | null>>;
type JsonRecord = Record<string, string | number | boolean | null>;

const IST_OFFSET_MINUTES = 5 * 60 + 30;

export function getExtension(filePath: string): string {
  return filePath.split(".").pop()?.toLowerCase() ?? "";
}

export function sampleText(buffer: Buffer): string {
  return buffer.toString("latin1").replace(/\0/g, " ").toLowerCase();
}

export function filenameMatches(fileName: string, pattern: RegExp): boolean {
  return pattern.test(fileName.toLowerCase());
}

export function readWorkbook(fileBuffer: Buffer, filePath: string): XLSX.WorkBook {
  const extension = getExtension(filePath);

  if (extension === "csv") {
    return XLSX.read(fileBuffer.toString("utf8"), { type: "string", cellDates: true });
  }

  return XLSX.read(fileBuffer, { type: "buffer", cellDates: true });
}

export function getSheetOrThrow(workbook: XLSX.WorkBook, sheetName: string): XLSX.WorkSheet {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new IngestionError(
      "missing_required_column",
      `Expected sheet "${sheetName}" was not found in the workbook.`
    );
  }
  return sheet;
}

export function getSheetRows(sheet: XLSX.WorkSheet): Matrix {
  return XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
    blankrows: false,
  }) as Matrix;
}

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/\r/g, " ")
    .replace(/\n/g, " ")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function stripExcelNoise(value: unknown): string {
  return String(value ?? "")
    .replace(/\u00a0/g, " ")
    .trim();
}

export function isBlank(value: unknown): boolean {
  if (value == null) return true;
  return stripExcelNoise(value) === "";
}

export function parseMoneyToPaise(value: unknown, fieldName: string): number {
  if (value == null || value === "") return 0;

  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100);
  }

  const normalized = stripExcelNoise(value)
    .replace(/,/g, "")
    .replace(/₹/g, "")
    .replace(/\s+/g, "")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    throw new IngestionError("invalid_amount", `Invalid amount in ${fieldName}.`, { value });
  }

  return Math.round(parsed * 100);
}

function parseDateParts(value: string): { year: number; month: number; day: number } | null {
  const trimmed = value.trim();
  const isoDateTimeMatch = trimmed.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([APMapm]{2}))?)?$/
  );
  if (isoDateTimeMatch) {
    return {
      year: Number(isoDateTimeMatch[1]),
      month: Number(isoDateTimeMatch[2]),
      day: Number(isoDateTimeMatch[3]),
    };
  }

  const isoMatch = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }

  const slashMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (slashMatch) {
    const yearPart = slashMatch[3] ?? "";
    const year = Number(yearPart.length === 2 ? `20${yearPart}` : yearPart);
    return {
      day: Number(slashMatch[1]),
      month: Number(slashMatch[2]),
      year,
    };
  }

  const fallback = new Date(trimmed);
  if (!Number.isNaN(fallback.getTime())) {
    return {
      year: fallback.getUTCFullYear(),
      month: fallback.getUTCMonth() + 1,
      day: fallback.getUTCDate(),
    };
  }

  return null;
}

function parseTimeParts(value: string): { hour: number; minute: number; second: number } | null {
  const cleaned = value.trim().replace(/^t/i, "");
  const dateTimeMatch = cleaned.match(
    /(?:\d{4}-\d{1,2}-\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*([APMapm]{2}))?$/
  );
  if (dateTimeMatch) {
    let hour = Number(dateTimeMatch[1]);
    const meridiem = dateTimeMatch[4]?.toLowerCase();
    if (meridiem === "pm" && hour < 12) hour += 12;
    if (meridiem === "am" && hour === 12) hour = 0;

    return {
      hour,
      minute: Number(dateTimeMatch[2]),
      second: Number(dateTimeMatch[3] ?? 0),
    };
  }

  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  return {
    hour: Number(match[1]),
    minute: Number(match[2]),
    second: Number(match[3] ?? 0),
  };
}

export function toIstIsoString(dateValue: unknown, timeValue?: unknown): string {
  let dateParts: { year: number; month: number; day: number } | null = null;
  let timeParts = { hour: 0, minute: 0, second: 0 };

  if (dateValue instanceof Date) {
    dateParts = {
      year: dateValue.getFullYear(),
      month: dateValue.getMonth() + 1,
      day: dateValue.getDate(),
    };
    timeParts = {
      hour: dateValue.getHours(),
      minute: dateValue.getMinutes(),
      second: dateValue.getSeconds(),
    };
  } else if (typeof dateValue === "number") {
    const parsedDate = XLSX.SSF.parse_date_code(dateValue);
    if (!parsedDate) {
      throw new IngestionError("invalid_date", "Could not parse Excel date serial.", {
        value: dateValue,
      });
    }
    dateParts = {
      year: parsedDate.y,
      month: parsedDate.m,
      day: parsedDate.d,
    };
    timeParts = {
      hour: parsedDate.H,
      minute: parsedDate.M,
      second: Math.floor(parsedDate.S),
    };
  } else {
    const normalizedDate = stripExcelNoise(dateValue);
    dateParts = parseDateParts(normalizedDate);
    if (timeValue == null || stripExcelNoise(timeValue) === "") {
      const parsedInlineTime = parseTimeParts(normalizedDate);
      if (parsedInlineTime) {
        timeParts = parsedInlineTime;
      }
    }
  }

  if (!dateParts) {
    throw new IngestionError("invalid_date", "Could not parse date value.", { value: dateValue });
  }

  if (timeValue != null && stripExcelNoise(timeValue) !== "") {
    if (timeValue instanceof Date) {
      timeParts = {
        hour: timeValue.getHours(),
        minute: timeValue.getMinutes(),
        second: timeValue.getSeconds(),
      };
    } else if (typeof timeValue === "number") {
      const seconds = Math.round(timeValue * 24 * 60 * 60);
      timeParts = {
        hour: Math.floor(seconds / 3600),
        minute: Math.floor((seconds % 3600) / 60),
        second: seconds % 60,
      };
    } else {
      const parsedTime = parseTimeParts(stripExcelNoise(timeValue));
      if (!parsedTime) {
        throw new IngestionError("invalid_date", "Could not parse time value.", {
          value: timeValue,
        });
      }
      timeParts = parsedTime;
    }
  }

  const utcMillis =
    Date.UTC(
      dateParts.year,
      dateParts.month - 1,
      dateParts.day,
      timeParts.hour,
      timeParts.minute,
      timeParts.second
    ) -
    IST_OFFSET_MINUTES * 60 * 1000;

  return new Date(utcMillis).toISOString();
}

export function mapRowsToObjects(headers: unknown[], rows: Matrix): JsonRecord[] {
  const normalizedHeaders = headers.map((header) => stripExcelNoise(header));

  return rows.map((row) => {
    const record: JsonRecord = {};
    normalizedHeaders.forEach((header, index) => {
      record[header] = coerceJsonValue(row[index] ?? null);
    });
    return record;
  });
}

export function coerceJsonValue(value: unknown): string | number | boolean | null {
  if (value == null) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  return stripExcelNoise(value);
}

export function truncateLast4(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
}

export function normalizeCustomerName(name: unknown): string | null {
  const value = stripExcelNoise(name);
  if (!value) return null;
  if (value.length <= 3) return null;

  const normalized = value.toLowerCase();
  if (normalized === "abc" || normalized === "customer") return null;

  return value;
}

export function stripLeadingBacktick(value: unknown): string {
  return stripExcelNoise(value).replace(/^`+/, "");
}

export function truncateUpiVpa(value: unknown): string | null {
  const vpa = stripExcelNoise(value);
  if (!vpa || !vpa.includes("@")) return null;

  const [local, domain] = vpa.split("@");
  if (!local || !domain) return null;

  const safePrefix = local.slice(0, 2);
  const safeSuffix = local.slice(-2);
  return `${safePrefix}…${safeSuffix}@${domain}`;
}

export function batch<T>(values: readonly T[], size = 100): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

export function assertSupabaseSuccess(
  result: ParserSupabaseResult,
  fallbackMessage: string
): asserts result is ParserSupabaseResult {
  if (result.error) {
    throw new IngestionError("commit_conflict", result.error.message || fallbackMessage, {
      code: result.error.code,
    });
  }
}

export async function rpcNormalizePhone(
  supabase: ParserSupabaseClient,
  rawPhone: string
): Promise<string | null> {
  const result = await supabase.rpc("normalize_customer_phone", { raw_phone: rawPhone });
  assertSupabaseSuccess(result, "Failed to normalize phone.");
  return (result.data as string | null) ?? null;
}

export async function rpcHashPhone(
  supabase: ParserSupabaseClient,
  rawPhone: string
): Promise<string | null> {
  const result = await supabase.rpc("hash_customer_phone", { raw_phone: rawPhone });
  assertSupabaseSuccess(result, "Failed to hash phone.");
  return (result.data as string | null) ?? null;
}

export async function rpcHashCardFingerprint(
  supabase: ParserSupabaseClient,
  rawCardLast4: string | null,
  rawCardIssuer: string | null,
  rawCardNetwork: string | null
): Promise<string | null> {
  const result = await supabase.rpc("hash_card_fingerprint", {
    raw_card_last_4: rawCardLast4,
    raw_card_issuer: rawCardIssuer,
    raw_card_network: rawCardNetwork,
  });
  assertSupabaseSuccess(result, "Failed to hash card fingerprint.");
  return (result.data as string | null) ?? null;
}
