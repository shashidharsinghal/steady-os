import * as XLSX from "xlsx";
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
  mapRowsToObjects,
  normalizeHeader,
  parseMoneyToPaise,
  readWorkbook,
  sampleText,
  stripExcelNoise,
  toIstIsoString,
} from "./helpers";

type SalesChannel = "dine_in" | "takeaway" | "swiggy" | "zomato" | "other";
type SalesStatus = "success" | "cancelled";
type OrderPaymentMethod =
  | "cash"
  | "card"
  | "upi"
  | "wallet"
  | "online_aggregator"
  | "not_paid"
  | "part_payment"
  | "other";
type SplitMethod =
  | "cash"
  | "card"
  | "upi"
  | "online_aggregator"
  | "wallet"
  | "due"
  | "not_paid"
  | "other";

export interface PetpoojaItemBillRecord {
  rowNumber: number;
  businessDate: string;
  invoiceNo: string;
  orderedAt: string;
  serverName: string | null;
  tableNo: string | null;
  covers: number | null;
  category: string | null;
  itemName: string;
  variation: string | null;
  quantity: number;
  unitPricePaise: number;
  subTotalPaise: number;
  discountPaise: number;
  taxPaise: number;
  lineTotalPaise: number;
  rawData: Record<string, string | number | boolean | null>;
}

export interface PetpoojaItemBillCanonicalRecord extends PetpoojaItemBillRecord {
  orderId: string | null;
}

export interface PetpoojaPaymentSplit {
  method: SplitMethod;
  amountPaise: number;
}

export interface PetpoojaPaymentSummaryRecord {
  rowNumber: number;
  businessDate: string;
  invoiceNo: string;
  orderedAt: string;
  paymentTypeRaw: string;
  orderType: string | null;
  status: SalesStatus;
  covers: number | null;
  areaRaw: string | null;
  splits: PetpoojaPaymentSplit[];
  totalAmountPaise: number;
  channel: SalesChannel;
  paymentMethod: OrderPaymentMethod;
  settlementStatus: "settled" | "pending" | "unknown";
  rawData: Record<string, string | number | boolean | null>;
}

const ITEM_HEADERS = [
  "date",
  "timestamp",
  "server name",
  "table no.",
  "covers",
  "invoice no.",
  "hsn_code",
  "category",
  "item",
  "variation",
  "price",
  "qty.",
  "sub total",
  "discount",
  "tax",
  "final total",
] as const;

const PAYMENT_HEADERS = [
  "invoice no.",
  "date",
  "payment type",
  "order type",
  "status",
  "persons",
  "area",
  "assign to",
  "not paid",
  "cash",
  "card",
  "due payment",
  "other",
  "wallet",
  "upi",
  "online",
] as const;

const PAYMENT_COLUMNS: Array<{ header: (typeof PAYMENT_HEADERS)[number]; method: SplitMethod }> = [
  { header: "not paid", method: "not_paid" },
  { header: "cash", method: "cash" },
  { header: "card", method: "card" },
  { header: "due payment", method: "due" },
  { header: "other", method: "other" },
  { header: "wallet", method: "wallet" },
  { header: "upi", method: "upi" },
  { header: "online", method: "online_aggregator" },
];

function requiredIndex(headers: unknown[], required: readonly string[]): Record<string, number> {
  const normalizedHeaders = headers.map((cell) => normalizeHeader(cell));
  const index: Record<string, number> = {};

  for (const header of required) {
    const foundIndex = normalizedHeaders.indexOf(header);
    if (foundIndex === -1) {
      throw new IngestionError(
        "missing_required_column",
        `The report is missing the "${header}" column.`
      );
    }
    index[header] = foundIndex;
  }

  return index;
}

function parseBusinessDate(value: unknown): string {
  const text = stripExcelNoise(value);
  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const indiaMatch = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (indiaMatch) {
    return `${indiaMatch[3]}-${String(indiaMatch[2]).padStart(2, "0")}-${String(indiaMatch[1]).padStart(2, "0")}`;
  }

  throw new IngestionError("invalid_date", "Could not parse the report business date.", {
    value,
  });
}

function parseNullableInt(value: unknown): number | null {
  const text = stripExcelNoise(value);
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function parseQuantity(value: unknown): number {
  const text = stripExcelNoise(value).replace(/,/g, "");
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new IngestionError("invalid_amount", "Could not parse item quantity.", { value });
  }
  return parsed;
}

function withVariation(itemName: string, variation: string | null): string {
  if (!variation) return itemName;
  const normalizedItem = itemName.trim().toLowerCase();
  const normalizedVariation = variation.trim().toLowerCase();
  if (normalizedItem.endsWith(`(${normalizedVariation})`)) return itemName;
  return `${itemName} (${variation})`;
}

function decodeHtml(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"');
}

function parseHtmlTableRows(html: string): string[][] {
  const rows: string[][] = [];
  const rowMatches = html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi);

  for (const rowMatch of rowMatches) {
    const cells = Array.from(
      rowMatch[1]!.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi),
      (cellMatch) =>
        stripExcelNoise(decodeHtml(cellMatch[1]!.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")))
    );
    if (cells.length > 0) rows.push(cells);
  }

  if (rows.length === 0) {
    throw new IngestionError("parse_error", "Could not find an HTML table in the payment file.");
  }

  return rows;
}

function mapAreaToChannel(area: string | null, orderType: string | null): SalesChannel {
  const areaText = (area ?? "").trim().toLowerCase();
  const orderTypeText = (orderType ?? "").trim().toLowerCase();

  if (areaText === "zomato") return "zomato";
  if (areaText === "swiggy") return "swiggy";
  if (areaText === "parcel") return "takeaway";
  if (!areaText && orderTypeText === "dine in") return "dine_in";
  if (orderTypeText === "pick up") return "takeaway";
  return "other";
}

function mapStatus(value: unknown): SalesStatus {
  const normalized = stripExcelNoise(value).toLowerCase();
  if (normalized === "success") return "success";
  if (normalized === "cancelled" || normalized === "canceled") return "cancelled";
  throw new IngestionError("parse_error", "Unsupported payment report status.", { value });
}

function findHeaderRow(rows: Array<Array<unknown>>, requiredSignals: readonly string[]): number {
  const foundIndex = rows.findIndex((row) => {
    const normalized = row.map((cell) => normalizeHeader(cell));
    return requiredSignals.every((signal) => normalized.includes(signal));
  });
  if (foundIndex === -1) {
    throw new IngestionError("missing_required_column", "Could not find the report header row.");
  }
  return foundIndex;
}

function getPreferredSheet(
  workbook: XLSX.WorkBook,
  preferredSheetName: string,
  requiredSignals: readonly string[]
): XLSX.WorkSheet {
  const exactSheet = workbook.Sheets[preferredSheetName];
  if (exactSheet) return exactSheet;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const rows = getSheetRows(sheet);
    const hasHeader = rows.some((row) => {
      const normalized = row.map((cell) => normalizeHeader(cell));
      return requiredSignals.every((signal) => normalized.includes(signal));
    });
    if (hasHeader) return sheet;
  }

  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = firstSheetName ? workbook.Sheets[firstSheetName] : undefined;
  if (!firstSheet) {
    throw new IngestionError("parse_error", "The workbook does not contain any worksheets.");
  }
  return firstSheet;
}

function hasItemBillDate(value: unknown): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value === "number") return Number.isFinite(value);

  const normalized = stripExcelNoise(value);
  if (!normalized) return false;

  return (
    /^\d{4}-\d{2}-\d{2}/.test(normalized) ||
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(normalized) ||
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\s+\d{1,2}:\d{2}/.test(normalized)
  );
}

function derivePaymentMethod(splits: PetpoojaPaymentSplit[]): OrderPaymentMethod {
  if (splits.length === 0) return "other";
  if (splits.length > 1) return "part_payment";
  const method = splits[0]!.method;
  if (method === "due") return "not_paid";
  if (method === "online_aggregator") return "online_aggregator";
  return method;
}

function deriveSettlementStatus(channel: SalesChannel): "settled" | "pending" | "unknown" {
  if (channel === "zomato" || channel === "swiggy") return "pending";
  if (channel === "other") return "unknown";
  return "settled";
}

function aggregateBy<T>(
  records: readonly T[],
  keyFor: (record: T) => string | null,
  valueFor: (record: T) => number
): Array<{ key: string; value: number; count: number }> {
  const map = new Map<string, { key: string; value: number; count: number }>();
  records.forEach((record) => {
    const key = keyFor(record);
    if (!key) return;
    const current = map.get(key) ?? { key, value: 0, count: 0 };
    current.value += valueFor(record);
    current.count += 1;
    map.set(key, current);
  });
  return Array.from(map.values()).sort((left, right) => right.value - left.value);
}

export const petpoojaItemBillParser: Parser<
  PetpoojaItemBillRecord,
  PetpoojaItemBillCanonicalRecord
> = {
  sourceType: "petpooja_item_bill",
  displayName: "Petpooja Item Wise Bill Report",
  acceptedExtensions: ["xlsx"],

  async detect(ctx) {
    if (filenameMatches(ctx.fileName, /item[_\s-]*bill[_\s-]*report/i)) {
      return { confidence: 0.96, reason: "Filename matches Petpooja item bill report." };
    }
    const text = sampleText(ctx.sampleBuffer);
    if (text.includes("item wise report with bill no")) {
      return { confidence: 0.98, reason: "Workbook title matches Item Wise Report With Bill No." };
    }
    return { confidence: 0, reason: "No Petpooja item bill signals found." };
  },

  async parse(ctx: ParseContext): Promise<ParseResult<PetpoojaItemBillRecord>> {
    const workbook = readWorkbook(ctx.fileBuffer, ctx.filePath);
    const sheet = getPreferredSheet(workbook, "Report", [
      "date",
      "invoice no.",
      "item",
      "final total",
    ]);
    const rows = getSheetRows(sheet);
    const headerRowIndex = findHeaderRow(rows, ["date", "invoice no.", "item", "final total"]);
    const headerRow = rows[headerRowIndex] ?? [];
    const index = requiredIndex(headerRow, ITEM_HEADERS);
    const businessDate = parseBusinessDate(rows[0]?.[1] ?? rows[0]?.[0]);
    const records: PetpoojaItemBillRecord[] = [];
    let candidateRowCount = 0;

    for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] ?? [];
      const rowDate = row[index.date!];
      const invoiceNo = stripExcelNoise(row[index["invoice no."]!]);
      const itemValue = stripExcelNoise(row[index.item!]);
      if (!hasItemBillDate(rowDate) || !invoiceNo || !itemValue) continue;
      candidateRowCount += 1;

      try {
        const item = itemValue;
        const variation = stripExcelNoise(row[index.variation!]) || null;
        const objectRow = mapRowsToObjects(headerRow, [row])[0] ?? {};
        records.push({
          rowNumber: rowIndex + 1,
          businessDate,
          invoiceNo,
          orderedAt: toIstIsoString(row[index.timestamp!]),
          serverName: stripExcelNoise(row[index["server name"]!]) || null,
          tableNo: stripExcelNoise(row[index["table no."]!]) || null,
          covers: parseNullableInt(row[index.covers!]),
          category: stripExcelNoise(row[index.category!]) || null,
          itemName: withVariation(item, variation),
          variation,
          quantity: parseQuantity(row[index["qty."]!]),
          unitPricePaise: parseMoneyToPaise(row[index.price!], "Price"),
          subTotalPaise: parseMoneyToPaise(row[index["sub total"]!], "Sub Total"),
          discountPaise: parseMoneyToPaise(row[index.discount!], "Discount"),
          taxPaise: parseMoneyToPaise(row[index.tax!], "Tax"),
          lineTotalPaise: parseMoneyToPaise(row[index["final total"]!], "Final Total"),
          rawData: objectRow,
        });
      } catch (error) {
        ctx.recordError({
          rowNumber: rowIndex + 1,
          errorCode: error instanceof IngestionError ? error.code : "parse_error",
          errorMessage: error instanceof Error ? error.message : "Could not parse line item.",
          rawRow: row,
        });
      }
    }

    if (records.length === 0 && candidateRowCount === 0) {
      throw new IngestionError(
        "parse_error",
        "Could not find any item rows in the Petpooja item bill workbook."
      );
    }

    return { rowsSeen: rows.length, records };
  },

  async normalize(
    ctx: NormalizeContext<PetpoojaItemBillRecord>
  ): Promise<NormalizeResult<PetpoojaItemBillCanonicalRecord>> {
    if (!ctx.outletId) {
      throw new IngestionError("parse_error", "Petpooja item reports require an outlet selection.");
    }

    const invoiceNos = Array.from(new Set(ctx.records.map((record) => record.invoiceNo)));
    const orderIds = new Map<string, string>();

    for (const chunk of batch(invoiceNos)) {
      const result = await ctx.supabase
        .from("sales_orders")
        .select("id, source_order_id")
        .eq("outlet_id", ctx.outletId)
        .eq("source", "petpooja_daily")
        .in("source_order_id", chunk);
      assertSupabaseSuccess(result, "Failed to look up Petpooja daily orders.");
      ((result.data as Array<{ id: string; source_order_id: string }> | null) ?? []).forEach(
        (row) => orderIds.set(row.source_order_id, row.id)
      );
    }

    const canonical = ctx.records.map((record) => ({
      ...record,
      orderId: orderIds.get(record.invoiceNo) ?? null,
    }));
    const existingLineKeys = new Set<string>();
    const linkedOrderIds = Array.from(
      new Set(canonical.map((record) => record.orderId).filter((value): value is string => !!value))
    );

    for (const chunk of batch(linkedOrderIds)) {
      const result = await ctx.supabase
        .from("sales_line_items")
        .select("order_id, item_name, quantity, unit_price_paise")
        .in("order_id", chunk);
      assertSupabaseSuccess(result, "Failed to check for duplicate Petpooja line items.");
      (
        (result.data as Array<{
          order_id: string;
          item_name: string;
          quantity: number | string;
          unit_price_paise: number | string;
        }> | null) ?? []
      ).forEach((row) => {
        existingLineKeys.add(
          `${row.order_id}|${row.item_name}|${Number(row.quantity)}|${Number(row.unit_price_paise)}`
        );
      });
    }

    const linkedRecords = canonical.filter((record) => record.orderId);
    const toInsert = linkedRecords.filter(
      (record) =>
        !existingLineKeys.has(
          `${record.orderId}|${record.itemName}|${record.quantity}|${record.unitPricePaise}`
        )
    );
    const missingOrderCount = canonical.length - linkedRecords.length;
    const duplicateLineCount = linkedRecords.length - toInsert.length;
    const categories = aggregateBy(
      ctx.records,
      (record) => record.category,
      (record) => record.lineTotalPaise
    ).slice(0, 5);
    const items = aggregateBy(
      ctx.records,
      (record) => record.itemName,
      (record) => record.lineTotalPaise
    ).slice(0, 5);

    return {
      toInsert,
      duplicateCount: missingOrderCount + duplicateLineCount,
      rowsToInsertCount: toInsert.length,
      previewPayload: {
        displayName: petpoojaItemBillParser.displayName,
        sourceType: petpoojaItemBillParser.sourceType,
        businessDate: ctx.records[0]?.businessDate ?? null,
        invoiceCount: new Set(ctx.records.map((record) => record.invoiceNo)).size,
        lineItemCount: ctx.records.length,
        linkedLineItemCount: toInsert.length,
        missingOrderCount,
        duplicateLineCount,
        warning:
          missingOrderCount > 0
            ? "Payment report for this business date is not committed yet. Line items will be written after matching Petpooja daily orders exist."
            : null,
        topCategories: categories,
        topItems: items,
        canonicalRecords: toInsert,
        rawRecords: ctx.records,
      },
    };
  },

  async commit(ctx: CommitContext<PetpoojaItemBillCanonicalRecord>) {
    const rows = ctx.records
      .filter((record) => record.orderId)
      .map((record) => ({
        order_id: record.orderId,
        item_name: record.itemName,
        category: record.category,
        quantity: record.quantity,
        unit_price_paise: record.unitPricePaise,
        discount_paise: record.discountPaise,
        tax_paise: record.taxPaise,
        line_total_paise: record.lineTotalPaise,
        raw_data: record.rawData,
        ingestion_run_id: ctx.runId,
      }));

    if (rows.length > 0) {
      const result = await ctx.supabase.from("sales_line_items").insert(rows);
      assertSupabaseSuccess(result, "Failed to insert Petpooja line items.");
    }

    return { rowsInserted: rows.length };
  },

  async rollback(ctx: RollbackContext) {
    const result = await ctx.supabase
      .from("sales_line_items")
      .delete()
      .eq("ingestion_run_id", ctx.runId);
    assertSupabaseSuccess(result, "Failed to roll back Petpooja line items.");
  },
};

export const petpoojaPaymentSummaryParser: Parser<
  PetpoojaPaymentSummaryRecord,
  PetpoojaPaymentSummaryRecord
> = {
  sourceType: "petpooja_payment_summary",
  displayName: "Petpooja Payment Wise Summary",
  acceptedExtensions: ["xls"],

  async detect(ctx) {
    if (filenameMatches(ctx.fileName, /payment[_\s-]*wise[_\s-]*summary/i)) {
      return { confidence: 0.9, reason: "Filename matches Petpooja payment summary." };
    }
    const text = ctx.sampleBuffer.toString("utf8").trimStart().toLowerCase();
    if (
      text.startsWith("<html") &&
      text.includes("invoice no.") &&
      text.includes("payment type") &&
      text.includes("upi") &&
      text.includes("online")
    ) {
      return { confidence: 0.98, reason: "HTML table matches Payment Wise Summary columns." };
    }
    return { confidence: 0, reason: "No Petpooja payment summary signals found." };
  },

  async parse(ctx: ParseContext): Promise<ParseResult<PetpoojaPaymentSummaryRecord>> {
    const html = ctx.fileBuffer.toString("utf8");
    if (!html.trimStart().toLowerCase().startsWith("<html")) {
      throw new IngestionError(
        "parse_error",
        "Payment Wise Summary must be parsed as an HTML table, not an Excel workbook."
      );
    }

    const rows = parseHtmlTableRows(html);
    const headerRowIndex = rows.findIndex((row) =>
      row.map((cell) => normalizeHeader(cell)).includes("invoice no.")
    );
    if (headerRowIndex === -1) {
      throw new IngestionError("missing_required_column", "Could not find payment table headers.");
    }
    const headerRow = rows[headerRowIndex] ?? [];
    const index = requiredIndex(headerRow, PAYMENT_HEADERS);
    const businessDate = parseBusinessDate(rows[0]?.[1] ?? rows[0]?.[0]);
    const records: PetpoojaPaymentSummaryRecord[] = [];

    for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] ?? [];
      const invoiceNo = stripExcelNoise(row[index["invoice no."]!]);
      if (!invoiceNo || invoiceNo.toLowerCase() === "total") continue;

      try {
        const objectRow = mapRowsToObjects(headerRow, [row])[0] ?? {};
        const splits = PAYMENT_COLUMNS.map((column) => ({
          method: column.method,
          amountPaise: parseMoneyToPaise(row[index[column.header]!], column.header),
        })).filter((split) => split.amountPaise > 0);
        const totalAmountPaise = splits.reduce((sum, split) => sum + split.amountPaise, 0);
        const orderType = stripExcelNoise(row[index["order type"]!]) || null;
        const areaRaw = stripExcelNoise(row[index.area!]) || null;
        const channel = mapAreaToChannel(areaRaw, orderType);

        records.push({
          rowNumber: rowIndex + 1,
          businessDate,
          invoiceNo,
          orderedAt: toIstIsoString(row[index.date!]),
          paymentTypeRaw: stripExcelNoise(row[index["payment type"]!]),
          orderType,
          status: mapStatus(row[index.status!]),
          covers: parseNullableInt(row[index.persons!]),
          areaRaw,
          splits,
          totalAmountPaise,
          channel,
          paymentMethod: derivePaymentMethod(splits),
          settlementStatus: deriveSettlementStatus(channel),
          rawData: objectRow,
        });
      } catch (error) {
        ctx.recordError({
          rowNumber: rowIndex + 1,
          errorCode: error instanceof IngestionError ? error.code : "parse_error",
          errorMessage: error instanceof Error ? error.message : "Could not parse payment row.",
          rawRow: row,
        });
      }
    }

    return { rowsSeen: rows.length, records };
  },

  async normalize(
    ctx: NormalizeContext<PetpoojaPaymentSummaryRecord>
  ): Promise<NormalizeResult<PetpoojaPaymentSummaryRecord>> {
    if (!ctx.outletId) {
      throw new IngestionError(
        "parse_error",
        "Petpooja payment summaries require an outlet selection."
      );
    }

    const existingIds = new Set<string>();
    for (const chunk of batch(ctx.records.map((record) => record.invoiceNo))) {
      const result = await ctx.supabase
        .from("sales_orders")
        .select("source_order_id")
        .eq("outlet_id", ctx.outletId)
        .eq("source", "petpooja_daily")
        .in("source_order_id", chunk);
      assertSupabaseSuccess(result, "Failed to check for duplicate Petpooja daily orders.");
      ((result.data as Array<{ source_order_id: string }> | null) ?? []).forEach((row) =>
        existingIds.add(row.source_order_id)
      );
    }

    const toInsert = ctx.records.filter((record) => !existingIds.has(record.invoiceNo));
    const successful = ctx.records.filter((record) => record.status === "success");
    const cancelled = ctx.records.filter((record) => record.status === "cancelled");
    const paymentMix = aggregateBy(
      ctx.records.flatMap((record) => record.splits),
      (split) => split.method,
      (split) => split.amountPaise
    );
    const pendingCount = ctx.records.filter(
      (record) => record.settlementStatus === "pending"
    ).length;
    const settledCount = ctx.records.filter(
      (record) => record.settlementStatus === "settled"
    ).length;

    return {
      toInsert,
      duplicateCount: ctx.records.length - toInsert.length,
      rowsToInsertCount:
        toInsert.length + toInsert.reduce((sum, record) => sum + record.splits.length, 0),
      previewPayload: {
        displayName: petpoojaPaymentSummaryParser.displayName,
        sourceType: petpoojaPaymentSummaryParser.sourceType,
        businessDate: ctx.records[0]?.businessDate ?? null,
        invoiceCount: ctx.records.length,
        successfulCount: successful.length,
        cancelledCount: cancelled.length,
        revenuePaise: ctx.records.reduce((sum, record) => sum + record.totalAmountPaise, 0),
        paymentMix,
        cancelledInvoices: cancelled.map((record) => ({
          invoiceNo: record.invoiceNo,
          amountPaise: record.totalAmountPaise,
          method: record.splits[0]?.method ?? "other",
        })),
        settlementSummary: { settledCount, pendingCount },
        warning:
          ctx.records.length > 0
            ? "Upload the matching Item Wise Bill report for this date to populate line items."
            : null,
        canonicalRecords: toInsert,
      },
    };
  },

  async commit(ctx: CommitContext<PetpoojaPaymentSummaryRecord>) {
    if (!ctx.outletId) {
      throw new IngestionError(
        "parse_error",
        "Petpooja payment summaries require an outlet selection."
      );
    }

    const orderRows = ctx.records.map((record) => ({
      outlet_id: ctx.outletId,
      source: "petpooja_daily",
      source_order_id: record.invoiceNo,
      channel: record.channel,
      order_type: record.orderType,
      order_type_raw: record.orderType,
      area_raw: record.areaRaw,
      sub_order_type_raw: null,
      status: record.status,
      ordered_at: record.orderedAt,
      gross_amount_paise: record.totalAmountPaise,
      discount_amount_paise: 0,
      net_amount_paise: record.totalAmountPaise,
      delivery_charge_paise: 0,
      packaging_charge_paise: 0,
      service_charge_paise: 0,
      tax_amount_paise: 0,
      round_off_paise: 0,
      total_amount_paise: record.totalAmountPaise,
      cgst_paise: 0,
      sgst_paise: 0,
      igst_paise: 0,
      gst_paid_by_merchant_paise: 0,
      gst_paid_by_ecommerce_paise: 0,
      aggregator_commission_paise: null,
      aggregator_fees_paise: null,
      aggregator_net_payout_paise: null,
      settlement_status: record.settlementStatus,
      payment_method: record.paymentMethod,
      payment_method_raw: record.paymentTypeRaw,
      customer_id: null,
      customer_name_raw: null,
      customer_phone_last_4: null,
      biller: null,
      kot_no: null,
      notes: null,
      covers: record.covers,
      server_name: null,
      table_no: null,
      ingestion_run_id: ctx.runId,
      raw_data: record.rawData,
    }));

    if (orderRows.length > 0) {
      const orderInsert = await ctx.supabase.from("sales_orders").insert(orderRows);
      assertSupabaseSuccess(orderInsert, "Failed to insert Petpooja daily orders.");
    }

    const orderLookup = await ctx.supabase
      .from("sales_orders")
      .select("id, source_order_id")
      .eq("outlet_id", ctx.outletId)
      .eq("source", "petpooja_daily")
      .in(
        "source_order_id",
        ctx.records.map((record) => record.invoiceNo)
      );
    assertSupabaseSuccess(orderLookup, "Failed to load inserted Petpooja daily orders.");
    const orderIds = new Map(
      ((orderLookup.data as Array<{ id: string; source_order_id: string }> | null) ?? []).map(
        (row) => [row.source_order_id, row.id]
      )
    );

    const splitRows = ctx.records.flatMap((record) => {
      const orderId = orderIds.get(record.invoiceNo);
      if (!orderId) return [];
      return record.splits.map((split) => ({
        order_id: orderId,
        outlet_id: ctx.outletId,
        method: split.method,
        amount_paise: split.amountPaise,
        ingestion_run_id: ctx.runId,
      }));
    });

    if (splitRows.length > 0) {
      const splitInsert = await ctx.supabase.from("sales_payment_splits").insert(splitRows);
      assertSupabaseSuccess(splitInsert, "Failed to insert Petpooja payment splits.");
    }

    return { rowsInserted: orderRows.length + splitRows.length };
  },

  async rollback(ctx: RollbackContext) {
    const deleteSplits = await ctx.supabase
      .from("sales_payment_splits")
      .delete()
      .eq("ingestion_run_id", ctx.runId);
    assertSupabaseSuccess(deleteSplits, "Failed to roll back Petpooja payment splits.");

    const deleteOrders = await ctx.supabase
      .from("sales_orders")
      .delete()
      .eq("ingestion_run_id", ctx.runId);
    assertSupabaseSuccess(deleteOrders, "Failed to roll back Petpooja daily orders.");
  },
};

export function buildItemWorkbook(rows: PetpoojaItemBillRecord[]): Buffer {
  const matrix = [
    ["Date", rows[0]?.businessDate ?? "2026-04-28"],
    ["Name", "Item Wise Report With Bill No."],
    ["Restaurant Name", "Test Outlet"],
    [],
    ITEM_HEADERS.map((header) => {
      const original: Record<string, string> = {
        date: "Date",
        timestamp: "Timestamp",
        "server name": "Server Name",
        "table no.": "Table No.",
        covers: "Covers",
        "invoice no.": "Invoice No.",
        hsn_code: "hsn_code",
        category: "Category",
        item: "Item",
        variation: "Variation",
        price: "Price",
        "qty.": "Qty.",
        "sub total": "Sub Total",
        discount: "Discount",
        tax: "Tax",
        "final total": "Final Total",
      };
      return original[header] ?? header;
    }),
    ...rows.map((row) => [
      `${row.businessDate} 00:00:00`,
      row.orderedAt,
      row.serverName,
      row.tableNo,
      row.covers,
      row.invoiceNo,
      row.rawData.hsn_code ?? "",
      row.category,
      row.itemName.replace(/\s+\([^)]*\)$/, ""),
      row.variation,
      row.unitPricePaise / 100,
      row.quantity,
      row.subTotalPaise / 100,
      row.discountPaise / 100,
      row.taxPaise / 100,
      row.lineTotalPaise / 100,
    ]),
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(matrix), "Report");
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

export function buildItemWorkbookWithExcelDates(rows: PetpoojaItemBillRecord[]): Buffer {
  const matrix = [
    [
      "Date:",
      `${rows[0]?.businessDate ?? "2026-04-28"} to ${rows[0]?.businessDate ?? "2026-04-28"}`,
    ],
    ["Name:", "Item Wise Report With Bill No."],
    ["Restaurant Name:", "Test Outlet"],
    ITEM_HEADERS.map((header) => {
      const original: Record<string, string> = {
        date: "Date",
        timestamp: "Timestamp",
        "server name": "Server Name",
        "table no.": "Table No.",
        covers: "Covers",
        "invoice no.": "Invoice No.",
        hsn_code: "hsn_code",
        category: "Category",
        item: "Item",
        variation: "Variation",
        price: "Price",
        "qty.": "Qty.",
        "sub total": "Sub Total",
        discount: "Discount",
        tax: "Tax",
        "final total": "Final Total",
      };
      return original[header] ?? header;
    }),
    ...rows.map((row) => [
      new Date(`${row.businessDate}T00:00:00+05:30`),
      new Date(row.orderedAt),
      row.serverName,
      row.tableNo,
      row.covers,
      row.invoiceNo,
      row.rawData.hsn_code ?? "",
      row.category,
      row.itemName.replace(/\s+\([^)]*\)$/, ""),
      row.variation,
      row.unitPricePaise / 100,
      row.quantity,
      row.subTotalPaise / 100,
      row.discountPaise / 100,
      row.taxPaise / 100,
      row.lineTotalPaise / 100,
    ]),
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(matrix), "Report");
  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}

export function buildItemWorkbookOnAlternateSheet(rows: PetpoojaItemBillRecord[]): Buffer {
  const workbook = XLSX.read(buildItemWorkbookWithExcelDates(rows), {
    type: "buffer",
    cellDates: true,
  });
  const reportSheet = workbook.Sheets.Report;
  if (!reportSheet) {
    throw new IngestionError(
      "parse_error",
      'Expected sheet "Report" was not found in the workbook.'
    );
  }

  delete workbook.Sheets.Report;
  workbook.Sheets["Daily Report "] = reportSheet;
  workbook.SheetNames = ["Daily Report "];

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}
