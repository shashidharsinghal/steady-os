import { execFileSync } from "child_process";
import path from "path";
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
import { filenameMatches, parseMoneyToPaise, stripExcelNoise } from "./helpers";

type CanonicalPnlExpenseLine = {
  category: string;
  subcategory: string | null;
  label: string;
  amountPaise: number;
  paidByFranchise: boolean;
  notes: string | null;
};

type CanonicalPnlRecord = {
  outletId: string;
  periodStart: string | null;
  periodEnd: string | null;
  entityName: string | null;
  storeName: string | null;
  grossSalesPaise: number;
  tradeDiscountPaise: number;
  netSalesPaise: number;
  dineInSalesPaise: number;
  swiggySalesPaise: number;
  zomatoSalesPaise: number;
  otherOnlineSalesPaise: number;
  openingStockPaise: number;
  purchasesPaise: number;
  closingStockPaise: number;
  cogsPaise: number;
  grossProfitPaise: number;
  totalExpensesPaise: number;
  miscellaneousPaise: number;
  onlineAggregatorChargesPaise: number;
  salariesPaise: number;
  rentTotalPaise: number;
  utilitiesPaise: number;
  marketingFeesPaise: number;
  managementFeesPaise: number;
  logisticCostPaise: number;
  corporateExpensesPaise: number;
  maintenancePaise: number;
  netProfitPaise: number;
  gstAmountPaise: number;
  invoiceValuePaise: number;
  paidByFranchiseItems: Array<{ label: string; category: string }>;
  rawText: string;
  expenseLines: CanonicalPnlExpenseLine[];
};

type ParsedPnlLine = {
  lineNumber: number;
  indent: number;
  label: string;
  amountPaise: number;
  notes: string | null;
  paidByFranchise: boolean;
  section: "trading" | "cost_of_sales" | "income_statement";
};

type RawPnlRecord = {
  entityName: string | null;
  storeName: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  rawText: string;
  lines: ParsedPnlLine[];
};

const LABEL_FIELD_MAP: Record<
  string,
  keyof Omit<
    CanonicalPnlRecord,
    | "outletId"
    | "periodStart"
    | "periodEnd"
    | "entityName"
    | "storeName"
    | "paidByFranchiseItems"
    | "rawText"
    | "expenseLines"
  >
> = {
  "gross sales": "grossSalesPaise",
  "trade discount": "tradeDiscountPaise",
  "sales accounts": "netSalesPaise",
  "dine in": "dineInSalesPaise",
  "swiggy online sales": "swiggySalesPaise",
  "zomato online sales": "zomatoSalesPaise",
  "opening stock": "openingStockPaise",
  "purchase accounts": "purchasesPaise",
  "closing stock": "closingStockPaise",
  "gross profit": "grossProfitPaise",
  "total expenses": "totalExpensesPaise",
  miscellaneous: "miscellaneousPaise",
  "online aggregator charges": "onlineAggregatorChargesPaise",
  salaries: "salariesPaise",
  "total rent cost": "rentTotalPaise",
  utilities: "utilitiesPaise",
  "marketing fees": "marketingFeesPaise",
  "management fees": "managementFeesPaise",
  "logistic cost": "logisticCostPaise",
  "corporate expenses": "corporateExpensesPaise",
  maintenance: "maintenancePaise",
  "nett profit": "netProfitPaise",
  "net profit": "netProfitPaise",
  gst: "gstAmountPaise",
  "gst 18%": "gstAmountPaise",
  "invoice value": "invoiceValuePaise",
};

function normalizeLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/^less\s*:\s*/, "")
    .replace(/^add\s*:\s*/, "")
    .replace(/[:\s]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePnlDate(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})[-/]([A-Za-z]{3,9})[-/](\d{2,4})$/);
  if (!match) return null;

  const yearPart = match[3] ?? "";
  const year = yearPart.length === 2 ? `20${yearPart}` : yearPart;
  const parsed = new Date(`${match[1]} ${match[2]} ${year}`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function extractPdfText(fileBuffer: Buffer): string {
  try {
    return execFileSync("pdftotext", ["-layout", "-", "-"], {
      input: fileBuffer,
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "ENOENT"
    ) {
      throw new IngestionError(
        "parse_error",
        "The server is missing `pdftotext`, so PDF parsing cannot run yet. Install poppler (`pdftotext`) and retry."
      );
    }

    throw new IngestionError(
      "parse_error",
      error instanceof Error ? error.message : "Failed to extract text from the PDF."
    );
  }
}

function parseHeaderField(rawText: string, label: "Entity" | "Store"): string | null {
  const match = rawText.match(new RegExp(`${label}:\\s*([^\\n]+)`, "i"));
  if (match) return stripExcelNoise(match[1]);

  const lines = rawText
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => stripExcelNoise(line))
    .filter(Boolean);

  if (label === "Store") {
    return lines.find((line) => /store[_\s]/i.test(line) || /store_foco/i.test(line)) ?? null;
  }

  const entityLine = lines.find(
    (line) =>
      !/^particulars$/i.test(line) &&
      !/store[_\s]/i.test(line) &&
      !/^trading account:?$/i.test(line) &&
      /foods|pvt ltd|private limited|llp|restaurant|hospitality/i.test(line)
  );

  if (!entityLine) return null;
  return stripExcelNoise(entityLine.replace(/\s*-\s*\(from.*$/i, ""));
}

function monthBounds(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    periodStart: start.toISOString().slice(0, 10),
    periodEnd: end.toISOString().slice(0, 10),
  };
}

function parseFilenamePeriod(filePath: string): { periodStart: string; periodEnd: string } | null {
  const fileName = path.basename(filePath);
  const match = fileName.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[\s_-]*(20\d{2}|\d{2})\b/i
  );

  if (!match) return null;

  const monthToken = (match[1] ?? "").slice(0, 3).toLowerCase();
  const yearToken = match[2] ?? "";
  const monthIndex = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ].indexOf(monthToken);

  if (monthIndex === -1) return null;

  const year = yearToken.length === 2 ? Number(`20${yearToken}`) : Number(yearToken);
  if (!Number.isFinite(year)) return null;

  return monthBounds(year, monthIndex);
}

function parsePeriod(
  rawText: string,
  filePath: string
): { periodStart: string | null; periodEnd: string | null } {
  const collapsed = rawText.replace(/\s+/g, " ");
  const patterns = [
    /from\s+(\d{1,2}\s*[-/]\s*[A-Za-z]{3,9}\s*[-/]\s*\d{2,4})\s+to\s+(\d{1,2}\s*[-/]\s*[A-Za-z]{3,9}\s*[-/]\s*\d{2,4})/i,
    /period\s*:\s*from\s+(\d{1,2}\s*[-/]\s*[A-Za-z]{3,9}\s*[-/]\s*\d{2,4})\s+to\s+(\d{1,2}\s*[-/]\s*[A-Za-z]{3,9}\s*[-/]\s*\d{2,4})/i,
    /(\d{1,2}\s*[-/]\s*[A-Za-z]{3,9}\s*[-/]\s*\d{2,4})\s+to\s+(\d{1,2}\s*[-/]\s*[A-Za-z]{3,9}\s*[-/]\s*\d{2,4})/i,
  ];

  for (const pattern of patterns) {
    const match = collapsed.match(pattern);
    if (!match) continue;

    return {
      periodStart: parsePnlDate((match[1] ?? "").replace(/\s+/g, "")),
      periodEnd: parsePnlDate((match[2] ?? "").replace(/\s+/g, "")),
    };
  }

  const filenamePeriod = parseFilenamePeriod(filePath);
  if (filenamePeriod) {
    return filenamePeriod;
  }

  const dateMatches = Array.from(
    collapsed.matchAll(/(\d{1,2}\s*[-/]\s*[A-Za-z]{3,9}\s*[-/]\s*\d{2,4})/gi)
  )
    .map((match) => parsePnlDate((match[1] ?? "").replace(/\s+/g, "")))
    .filter((value): value is string => Boolean(value));

  if (dateMatches.length > 0) {
    const lastDate = dateMatches[dateMatches.length - 1] ?? null;
    if (lastDate) {
      const end = new Date(lastDate);
      if (!Number.isNaN(end.getTime())) {
        return monthBounds(end.getUTCFullYear(), end.getUTCMonth());
      }
    }
  }

  return { periodStart: null, periodEnd: null };
}

function parseLines(rawText: string): ParsedPnlLine[] {
  const sourceLines = rawText.replace(/\r/g, "").split("\n");
  const parsed: ParsedPnlLine[] = [];
  let section: ParsedPnlLine["section"] | null = null;

  sourceLines.forEach((rawLine, index) => {
    const line = rawLine.replace(/\t/g, "    ").replace(/\s+$/g, "");
    const trimmed = line.trim();
    if (!trimmed) return;

    if (/^trading account:?$/i.test(trimmed)) {
      section = "trading";
      return;
    }
    if (/^cost of sales:?$/i.test(trimmed)) {
      section = "cost_of_sales";
      return;
    }
    if (/^income statement:?$/i.test(trimmed)) {
      section = "income_statement";
      return;
    }

    if (!section) return;
    if (/^(entity|store):/i.test(trimmed)) return;
    if (/^from\s+/i.test(trimmed)) return;

    const paidByFranchise = /paid by franchise/i.test(trimmed);
    const notes = paidByFranchise ? "Paid by Franchise" : null;
    const withoutNote = line.replace(/\s+paid by franchise\s*$/i, "");
    const amountMatch = withoutNote.match(/(-?\d[\d,]*(?:\.\d{1,2})?)\s*$/);
    const amountPaise = amountMatch ? parseMoneyToPaise(amountMatch[1], trimmed) : 0;
    const labelSource = amountMatch
      ? withoutNote.slice(0, Math.max(0, amountMatch.index ?? 0))
      : withoutNote;
    const label = stripExcelNoise(labelSource).replace(/:$/, "");

    if (!label) return;

    parsed.push({
      lineNumber: index + 1,
      indent: line.length - line.trimStart().length,
      label,
      amountPaise,
      notes,
      paidByFranchise,
      section,
    });
  });

  return parsed;
}

function buildExpenseLines(lines: ParsedPnlLine[]): CanonicalPnlExpenseLine[] {
  const expenseLines = lines.filter(
    (line) =>
      line.section === "income_statement" &&
      !["total expenses", "nett profit", "net profit", "gst", "gst 18%", "invoice value"].includes(
        normalizeLabel(line.label)
      )
  );

  const stack: Array<{ indent: number; label: string }> = [];

  return expenseLines.map((line) => {
    while (stack.length > 0 && stack[stack.length - 1]!.indent >= line.indent) {
      stack.pop();
    }

    const ancestors = [...stack];
    stack.push({ indent: line.indent, label: line.label });

    return {
      category: ancestors[0]?.label ?? line.label,
      subcategory: ancestors[1]?.label ?? null,
      label: line.label,
      amountPaise: line.amountPaise,
      paidByFranchise: line.paidByFranchise,
      notes: line.notes,
    };
  });
}

function buildCanonicalRecord(
  raw: RawPnlRecord,
  outletId: string,
  recordError: ParseContext["recordError"]
): CanonicalPnlRecord {
  const expenseLines = buildExpenseLines(raw.lines);
  const record: CanonicalPnlRecord = {
    outletId,
    periodStart: raw.periodStart,
    periodEnd: raw.periodEnd,
    entityName: raw.entityName,
    storeName: raw.storeName,
    grossSalesPaise: 0,
    tradeDiscountPaise: 0,
    netSalesPaise: 0,
    dineInSalesPaise: 0,
    swiggySalesPaise: 0,
    zomatoSalesPaise: 0,
    otherOnlineSalesPaise: 0,
    openingStockPaise: 0,
    purchasesPaise: 0,
    closingStockPaise: 0,
    cogsPaise: 0,
    grossProfitPaise: 0,
    totalExpensesPaise: 0,
    miscellaneousPaise: 0,
    onlineAggregatorChargesPaise: 0,
    salariesPaise: 0,
    rentTotalPaise: 0,
    utilitiesPaise: 0,
    marketingFeesPaise: 0,
    managementFeesPaise: 0,
    logisticCostPaise: 0,
    corporateExpensesPaise: 0,
    maintenancePaise: 0,
    netProfitPaise: 0,
    gstAmountPaise: 0,
    invoiceValuePaise: 0,
    paidByFranchiseItems: expenseLines
      .filter((line) => line.paidByFranchise)
      .map((line) => ({ label: line.label, category: line.category })),
    rawText: raw.rawText,
    expenseLines,
  };

  const labels = new Map<string, ParsedPnlLine>();
  raw.lines.forEach((line) => {
    labels.set(normalizeLabel(line.label), line);
  });

  Object.entries(LABEL_FIELD_MAP).forEach(([label, field]) => {
    const matched = labels.get(label);
    if (matched) {
      record[field] = matched.amountPaise as never;
    }
  });

  const onlineSalesTotal = labels.get("online sales")?.amountPaise ?? 0;
  record.otherOnlineSalesPaise = Math.max(
    0,
    onlineSalesTotal - record.swiggySalesPaise - record.zomatoSalesPaise
  );
  record.cogsPaise =
    labels.get("cost of sales")?.amountPaise ??
    record.openingStockPaise + record.purchasesPaise - record.closingStockPaise;

  [
    {
      code: "pnl_net_sales_mismatch",
      expected: record.grossSalesPaise - record.tradeDiscountPaise,
      actual: record.netSalesPaise,
      message: "Net Sales does not reconcile with Gross Sales minus Trade Discount.",
    },
    {
      code: "pnl_gross_profit_mismatch",
      expected: record.netSalesPaise - record.cogsPaise,
      actual: record.grossProfitPaise,
      message: "Gross Profit does not reconcile with Net Sales minus COGS.",
    },
    {
      code: "pnl_net_profit_mismatch",
      expected: record.grossProfitPaise - record.totalExpensesPaise,
      actual: record.netProfitPaise,
      message: "Net Profit does not reconcile with Gross Profit minus Total Expenses.",
    },
  ].forEach((validation) => {
    if (Math.abs(validation.expected - validation.actual) > 100) {
      recordError({
        rowNumber: 1,
        errorCode: validation.code,
        errorMessage: validation.message,
        rawRow: validation,
      });
    }
  });

  if (!record.periodStart || !record.periodEnd) {
    recordError({
      rowNumber: 1,
      errorCode: "pnl_period_missing",
      errorMessage:
        "Could not determine the reporting period from the PDF. Enter it in preview before commit.",
    });
  }

  return record;
}

function toPreviewPayload(record: CanonicalPnlRecord, duplicateCount: number) {
  return {
    displayName: "Franchise P&L Report",
    parserKind: "pnl_report",
    canonicalRecords: [record],
    report: {
      periodStart: record.periodStart,
      periodEnd: record.periodEnd,
      entityName: record.entityName,
      storeName: record.storeName,
      metrics: {
        grossSalesPaise: record.grossSalesPaise,
        netSalesPaise: record.netSalesPaise,
        cogsPaise: record.cogsPaise,
        grossProfitPaise: record.grossProfitPaise,
        totalExpensesPaise: record.totalExpensesPaise,
        netProfitPaise: record.netProfitPaise,
        invoiceValuePaise: record.invoiceValuePaise,
      },
      expenseLines: record.expenseLines,
      paidByFranchiseItems: record.paidByFranchiseItems,
      duplicateCount,
    },
  };
}

export const pnlPdfParser: Parser<RawPnlRecord, CanonicalPnlRecord> = {
  sourceType: "franchise_pnl_pdf",
  displayName: "Franchise P&L Report",
  acceptedExtensions: ["pdf"],

  async detect(ctx) {
    const looksLikePdf = ctx.sampleBuffer.subarray(0, 4).toString("utf8") === "%PDF";
    if (
      looksLikePdf &&
      (filenameMatches(ctx.fileName, /p[_&]?l/i) || filenameMatches(ctx.fileName, /profit.*loss/i))
    ) {
      return {
        confidence: 0.85,
        reason: "Filename and PDF signature match the franchise P&L format.",
      };
    }

    return { confidence: 0, reason: "No P&L PDF signals found." };
  },

  async parse(ctx: ParseContext): Promise<ParseResult<RawPnlRecord>> {
    const rawText = extractPdfText(ctx.fileBuffer);
    const { periodStart, periodEnd } = parsePeriod(rawText, ctx.filePath);
    const lines = parseLines(rawText);

    return {
      rowsSeen: lines.length,
      records: [
        {
          entityName: parseHeaderField(rawText, "Entity"),
          storeName: parseHeaderField(rawText, "Store"),
          periodStart,
          periodEnd,
          rawText,
          lines,
        },
      ],
    };
  },

  async normalize(
    ctx: NormalizeContext<RawPnlRecord>
  ): Promise<NormalizeResult<CanonicalPnlRecord>> {
    if (!ctx.outletId) {
      throw new IngestionError(
        "missing_required_column",
        "P&L ingestion is outlet-scoped. Select an outlet before uploading the PDF."
      );
    }

    const rawRecord = ctx.records[0];
    if (!rawRecord) {
      return { toInsert: [], duplicateCount: 0 };
    }

    const warnings: Parameters<ParseContext["recordError"]>[0][] = [];
    const record = buildCanonicalRecord(rawRecord, ctx.outletId, (warning) =>
      warnings.push(warning)
    );

    let duplicateCount = 0;
    if (record.periodStart && record.periodEnd) {
      const scopedDuplicateResult = await ctx.supabase
        .from("pnl_reports")
        .select("id")
        .eq("outlet_id", ctx.outletId)
        .eq("period_start", record.periodStart)
        .eq("period_end", record.periodEnd);

      duplicateCount = Array.isArray(scopedDuplicateResult.data)
        ? scopedDuplicateResult.data.length
        : 0;
    }

    const canonicalRecords = duplicateCount > 0 ? [] : [record];

    return {
      toInsert: canonicalRecords,
      duplicateCount,
      previewPayload: {
        ...toPreviewPayload(record, duplicateCount),
        canonicalRecords,
        warnings,
      },
      rowsToInsertCount: canonicalRecords.length === 0 ? 0 : 1 + record.expenseLines.length,
    };
  },

  async commit(ctx: CommitContext<CanonicalPnlRecord>) {
    const [record] = ctx.records;
    if (!record) return { rowsInserted: 0 };
    if (!record.periodStart || !record.periodEnd) {
      throw new IngestionError(
        "invalid_date",
        "Set the P&L reporting period in preview before committing this run."
      );
    }

    const reportInsert = await ctx.supabase
      .from("pnl_reports")
      .insert({
        outlet_id: record.outletId,
        period_start: record.periodStart,
        period_end: record.periodEnd,
        entity_name: record.entityName,
        store_name: record.storeName,
        gross_sales_paise: record.grossSalesPaise,
        trade_discount_paise: record.tradeDiscountPaise,
        net_sales_paise: record.netSalesPaise,
        dine_in_sales_paise: record.dineInSalesPaise,
        swiggy_sales_paise: record.swiggySalesPaise,
        zomato_sales_paise: record.zomatoSalesPaise,
        other_online_sales_paise: record.otherOnlineSalesPaise,
        opening_stock_paise: record.openingStockPaise,
        purchases_paise: record.purchasesPaise,
        closing_stock_paise: record.closingStockPaise,
        cogs_paise: record.cogsPaise,
        gross_profit_paise: record.grossProfitPaise,
        total_expenses_paise: record.totalExpensesPaise,
        miscellaneous_paise: record.miscellaneousPaise,
        online_aggregator_charges_paise: record.onlineAggregatorChargesPaise,
        salaries_paise: record.salariesPaise,
        rent_total_paise: record.rentTotalPaise,
        utilities_paise: record.utilitiesPaise,
        marketing_fees_paise: record.marketingFeesPaise,
        management_fees_paise: record.managementFeesPaise,
        logistic_cost_paise: record.logisticCostPaise,
        corporate_expenses_paise: record.corporateExpensesPaise,
        maintenance_paise: record.maintenancePaise,
        net_profit_paise: record.netProfitPaise,
        gst_amount_paise: record.gstAmountPaise,
        invoice_value_paise: record.invoiceValuePaise,
        paid_by_franchise_items: record.paidByFranchiseItems,
        raw_text: record.rawText,
        ingestion_run_id: ctx.runId,
      })
      .select("id")
      .single();

    if (reportInsert.error || !reportInsert.data || typeof reportInsert.data !== "object") {
      throw new IngestionError(
        "commit_conflict",
        reportInsert.error?.message ?? "Failed to create the P&L report."
      );
    }

    const reportId = (reportInsert.data as { id: string }).id;

    if (record.expenseLines.length > 0) {
      const expenseInsert = await ctx.supabase.from("pnl_expense_lines").insert(
        record.expenseLines.map((line) => ({
          report_id: reportId,
          category: line.category,
          subcategory: line.subcategory,
          label: line.label,
          amount_paise: line.amountPaise,
          paid_by_franchise: line.paidByFranchise,
          notes: line.notes,
          ingestion_run_id: ctx.runId,
        }))
      );

      if (expenseInsert.error) {
        throw new IngestionError("commit_conflict", expenseInsert.error.message);
      }
    }

    return { rowsInserted: 1 + record.expenseLines.length };
  },

  async rollback(ctx: RollbackContext) {
    const result = await ctx.supabase
      .from("pnl_reports")
      .delete()
      .eq("ingestion_run_id", ctx.runId);
    if (result.error) {
      throw new IngestionError("commit_conflict", result.error.message);
    }
  },
};
