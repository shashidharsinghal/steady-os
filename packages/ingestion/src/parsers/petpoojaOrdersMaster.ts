import { IngestionError } from "../errors";
import type {
  CommitContext,
  DetectionContext,
  DetectionResult,
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
  normalizeCustomerName,
  normalizeHeader,
  parseMoneyToPaise,
  readWorkbook,
  rpcHashPhone,
  rpcNormalizePhone,
  sampleText,
  stripExcelNoise,
  toIstIsoString,
  truncateLast4,
} from "./helpers";
import {
  createCustomerRecord,
  deleteOrphanCustomers,
  findOrCreateCustomerByIdentity,
  refreshCustomerAggregates,
} from "./customer-identities";

interface PetpoojaRawRecord {
  rowNumber: number;
  invoiceNo: string;
  orderedAt: string;
  paymentType: string;
  orderTypeRaw: string | null;
  areaRaw: string | null;
  subOrderTypeRaw: string | null;
  status: string;
  grossAmountPaise: number;
  discountAmountPaise: number;
  netAmountPaise: number;
  deliveryChargePaise: number;
  packagingChargePaise: number;
  serviceChargePaise: number;
  taxAmountPaise: number;
  roundOffPaise: number;
  totalAmountPaise: number;
  cgstPaise: number;
  sgstPaise: number;
  igstPaise: number;
  gstPaidByMerchantPaise: number;
  gstPaidByEcommercePaise: number;
  phoneRaw: string | null;
  nameRaw: string | null;
  biller: string | null;
  kotNo: string | null;
  rawData: Record<string, string | number | boolean | null>;
}

interface PetpoojaCanonicalRecord extends Omit<PetpoojaRawRecord, "status" | "paymentType"> {
  channel: "dine_in" | "takeaway" | "swiggy" | "zomato" | "other";
  paymentMethod:
    | "cash"
    | "card"
    | "upi"
    | "wallet"
    | "online_aggregator"
    | "not_paid"
    | "part_payment"
    | "other";
  paymentMethodRaw: string;
  customerNameNormalized: string | null;
}

const REQUIRED_HEADERS = [
  "invoice no.",
  "date",
  "payment type",
  "order type",
  "status",
  "area",
  "sub order type",
  "my amount (₹)",
  "discount (₹)",
  "net sales (₹)(m.a - d)",
  "delivery charge",
  "container charge",
  "service charge",
  "total tax (₹)",
  "round off",
  "total (₹)",
  "cgst@2.5",
  "sgst@2.5",
  "gst paid by merchant",
  "gst paid by ecommerce",
  "phone",
  "name",
  "biller",
  "kot no.",
] as const;

function detectBySample(ctx: DetectionContext): DetectionResult {
  const lowerFileName = ctx.fileName.toLowerCase();
  const text = sampleText(ctx.sampleBuffer);

  if (filenameMatches(lowerFileName, /orders[_\s-]*master[_\s-]*report/)) {
    return { confidence: 0.9, reason: "Filename matches Petpooja Orders Master report." };
  }

  if (text.includes("orders: master report")) {
    return { confidence: 0.75, reason: "Workbook sample includes the Orders Master title." };
  }

  if (text.includes("invoice no.") && text.includes("sub order type") && text.includes("kot no.")) {
    return { confidence: 0.7, reason: "Workbook sample includes Petpooja order headers." };
  }

  return { confidence: 0, reason: "No Petpooja Orders Master signals found." };
}

function mapPaymentMethod(value: string): PetpoojaCanonicalRecord["paymentMethod"] {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case "cash":
      return "cash";
    case "card":
      return "card";
    case "upi":
      return "upi";
    case "wallet":
      return "wallet";
    case "online":
      return "online_aggregator";
    case "not paid":
      return "not_paid";
    case "part payment":
      return "part_payment";
    default:
      return "other";
  }
}

function mapChannel(value: string | null) {
  const normalized = (value ?? "").trim().toLowerCase();
  switch (normalized) {
    case "dine in":
      return "dine_in" as const;
    case "pick up":
      return "takeaway" as const;
    case "swiggy":
      return "swiggy" as const;
    case "zomato":
      return "zomato" as const;
    default:
      return "other" as const;
  }
}

function requiredHeaderIndex(headerRow: unknown[]): Record<string, number> {
  const headerIndex: Record<string, number> = {};
  const normalizedHeaders = headerRow.map((cell) => normalizeHeader(cell));

  for (const header of REQUIRED_HEADERS) {
    const index = normalizedHeaders.indexOf(header);
    if (index === -1) {
      throw new IngestionError(
        "missing_required_column",
        `The report is missing the "${header}" column.`
      );
    }
    headerIndex[header] = index;
  }

  return headerIndex;
}

function findPetpoojaHeaderRow(
  rows: Array<Array<string | number | boolean | Date | null>>
): number {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const normalizedHeaders = (rows[rowIndex] ?? []).map((cell) => normalizeHeader(cell));
    if (
      normalizedHeaders.includes("invoice no.") &&
      normalizedHeaders.includes("payment type") &&
      normalizedHeaders.includes("sub order type")
    ) {
      return rowIndex;
    }
  }

  throw new IngestionError("missing_required_column", "Could not find the Petpooja header row.");
}

export const petpoojaOrdersMasterParser: Parser<PetpoojaRawRecord, PetpoojaCanonicalRecord> = {
  sourceType: "petpooja_orders_master",
  displayName: "Petpooja Orders Master",
  acceptedExtensions: ["xlsx", "xls", "csv"],

  async detect(ctx) {
    return detectBySample(ctx);
  },

  async parse(ctx: ParseContext): Promise<ParseResult<PetpoojaRawRecord>> {
    const workbook = readWorkbook(ctx.fileBuffer, ctx.filePath);
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new IngestionError("parse_error", "The workbook did not contain any sheets.");
    }

    const rows = getSheetRows(workbook.Sheets[firstSheetName]!);
    if (rows.length <= 4) {
      throw new IngestionError("parse_error", "The report did not contain enough rows to parse.");
    }

    const headerRowIndex = findPetpoojaHeaderRow(rows);
    const headerRow = rows[headerRowIndex] ?? [];

    const index = requiredHeaderIndex(headerRow);
    const invoiceNoIndex = index["invoice no."]!;
    const dateIndex = index["date"]!;
    const paymentTypeIndex = index["payment type"]!;
    const orderTypeIndex = index["order type"]!;
    const statusIndex = index["status"]!;
    const areaIndex = index["area"]!;
    const subOrderTypeIndex = index["sub order type"]!;
    const grossAmountIndex = index["my amount (₹)"]!;
    const discountIndex = index["discount (₹)"]!;
    const netSalesIndex = index["net sales (₹)(m.a - d)"]!;
    const deliveryChargeIndex = index["delivery charge"]!;
    const containerChargeIndex = index["container charge"]!;
    const serviceChargeIndex = index["service charge"]!;
    const totalTaxIndex = index["total tax (₹)"]!;
    const roundOffIndex = index["round off"]!;
    const totalIndex = index["total (₹)"]!;
    const cgstIndex = index["cgst@2.5"]!;
    const sgstIndex = index["sgst@2.5"]!;
    const gstMerchantIndex = index["gst paid by merchant"]!;
    const gstEcommerceIndex = index["gst paid by ecommerce"]!;
    const phoneIndex = index["phone"]!;
    const nameIndex = index["name"]!;
    const billerIndex = index["biller"]!;
    const kotIndex = index["kot no."]!;
    const records: PetpoojaRawRecord[] = [];

    for (let rowIndex = headerRowIndex + 1; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] ?? [];
      const invoiceValue = stripExcelNoise(row[invoiceNoIndex]);

      if (!/^\d+$/.test(invoiceValue)) continue;

      try {
        const objectRow = mapRowsToObjects(headerRow, [row])[0] ?? {};
        const status = stripExcelNoise(row[statusIndex]);
        if (status.toLowerCase() !== "success") continue;

        records.push({
          rowNumber: rowIndex + 1,
          invoiceNo: invoiceValue,
          orderedAt: toIstIsoString(row[dateIndex]),
          paymentType: stripExcelNoise(row[paymentTypeIndex]),
          orderTypeRaw: stripExcelNoise(row[orderTypeIndex]) || null,
          areaRaw: stripExcelNoise(row[areaIndex]) || null,
          subOrderTypeRaw: stripExcelNoise(row[subOrderTypeIndex]) || null,
          status,
          grossAmountPaise: parseMoneyToPaise(row[grossAmountIndex], "My Amount"),
          discountAmountPaise: parseMoneyToPaise(row[discountIndex], "Discount"),
          netAmountPaise: parseMoneyToPaise(row[netSalesIndex], "Net Sales (M.A - D)"),
          deliveryChargePaise: parseMoneyToPaise(row[deliveryChargeIndex], "Delivery Charge"),
          packagingChargePaise: parseMoneyToPaise(row[containerChargeIndex], "Container Charge"),
          serviceChargePaise: parseMoneyToPaise(row[serviceChargeIndex], "Service Charge"),
          taxAmountPaise: parseMoneyToPaise(row[totalTaxIndex], "Total Tax"),
          roundOffPaise: parseMoneyToPaise(row[roundOffIndex], "Round Off"),
          totalAmountPaise: parseMoneyToPaise(row[totalIndex], "Total"),
          cgstPaise: parseMoneyToPaise(row[cgstIndex], "CGST"),
          sgstPaise: parseMoneyToPaise(row[sgstIndex], "SGST"),
          igstPaise: 0,
          gstPaidByMerchantPaise: parseMoneyToPaise(row[gstMerchantIndex], "GST Paid by Merchant"),
          gstPaidByEcommercePaise: parseMoneyToPaise(
            row[gstEcommerceIndex],
            "GST Paid by Ecommerce"
          ),
          phoneRaw: stripExcelNoise(row[phoneIndex]) || null,
          nameRaw: stripExcelNoise(row[nameIndex]) || null,
          biller: stripExcelNoise(row[billerIndex]) || null,
          kotNo: stripExcelNoise(row[kotIndex]) || null,
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
    ctx: NormalizeContext<PetpoojaRawRecord>
  ): Promise<NormalizeResult<PetpoojaCanonicalRecord>> {
    if (!ctx.outletId) {
      throw new IngestionError("parse_error", "Petpooja orders require an outlet selection.");
    }

    const sourceOrderIds = ctx.records.map((record) => record.invoiceNo);
    const existingIds = new Set<string>();

    for (const chunk of batch(sourceOrderIds)) {
      const result = await ctx.supabase
        .from("sales_orders")
        .select("source_order_id")
        .eq("outlet_id", ctx.outletId)
        .eq("source", "petpooja")
        .in("source_order_id", chunk);

      assertSupabaseSuccess(result, "Failed to check for duplicate Petpooja orders.");
      const rows = (result.data as Array<{ source_order_id: string }> | null) ?? [];
      rows.forEach((row) => existingIds.add(row.source_order_id));
    }

    const toInsert: PetpoojaCanonicalRecord[] = ctx.records
      .filter((record) => !existingIds.has(record.invoiceNo))
      .map((record) => ({
        ...record,
        channel: mapChannel(record.subOrderTypeRaw),
        paymentMethod: mapPaymentMethod(record.paymentType),
        paymentMethodRaw: record.paymentType,
        customerNameNormalized: normalizeCustomerName(record.nameRaw),
      }));

    return {
      toInsert,
      duplicateCount: ctx.records.length - toInsert.length,
    };
  },

  async commit(ctx: CommitContext<PetpoojaCanonicalRecord>) {
    if (!ctx.outletId) {
      throw new IngestionError("parse_error", "Petpooja orders require an outlet selection.");
    }

    const salesOrdersToInsert = [];
    const customerCache = new Map<string, string>();
    const touchedCustomerIds: string[] = [];

    for (const record of ctx.records) {
      let customerId: string | null = null;
      let customerPhoneLast4: string | null = null;

      if (record.phoneRaw) {
        const normalizedPhone = await rpcNormalizePhone(ctx.supabase, record.phoneRaw);
        const phoneHash = await rpcHashPhone(ctx.supabase, record.phoneRaw);
        customerPhoneLast4 = truncateLast4(normalizedPhone);

        if (phoneHash) {
          customerId = await findOrCreateCustomerByIdentity({
            supabase: ctx.supabase,
            runId: ctx.runId,
            observedAt: record.orderedAt,
            preferredName: record.customerNameNormalized,
            phoneLast4: customerPhoneLast4,
            cache: customerCache,
            identity: {
              kind: "phone_hash",
              value: phoneHash,
              displayValue: customerPhoneLast4 ? `···${customerPhoneLast4}` : null,
            },
          });
        }
      } else if (
        record.customerNameNormalized &&
        (record.channel === "swiggy" || record.channel === "zomato")
      ) {
        const cacheKey = `name:${record.customerNameNormalized}`;
        if (customerCache.has(cacheKey)) {
          customerId = customerCache.get(cacheKey) ?? null;
        } else {
          customerId = await createCustomerRecord({
            supabase: ctx.supabase,
            runId: ctx.runId,
            observedAt: record.orderedAt,
            preferredName: record.customerNameNormalized,
          });
          if (customerId) customerCache.set(cacheKey, customerId);
        }
      }

      if (customerId) touchedCustomerIds.push(customerId);

      salesOrdersToInsert.push({
        outlet_id: ctx.outletId,
        source: "petpooja",
        source_order_id: record.invoiceNo,
        channel: record.channel,
        order_type_raw: record.orderTypeRaw,
        area_raw: record.areaRaw,
        sub_order_type_raw: record.subOrderTypeRaw,
        status: "success",
        ordered_at: record.orderedAt,
        gross_amount_paise: record.grossAmountPaise,
        discount_amount_paise: record.discountAmountPaise,
        net_amount_paise: record.netAmountPaise,
        delivery_charge_paise: record.deliveryChargePaise,
        packaging_charge_paise: record.packagingChargePaise,
        service_charge_paise: record.serviceChargePaise,
        tax_amount_paise: record.taxAmountPaise,
        round_off_paise: record.roundOffPaise,
        total_amount_paise: record.totalAmountPaise,
        cgst_paise: record.cgstPaise,
        sgst_paise: record.sgstPaise,
        igst_paise: record.igstPaise,
        gst_paid_by_merchant_paise: record.gstPaidByMerchantPaise,
        gst_paid_by_ecommerce_paise: record.gstPaidByEcommercePaise,
        aggregator_commission_paise: null,
        aggregator_fees_paise: null,
        aggregator_net_payout_paise: null,
        payment_method: record.paymentMethod,
        payment_method_raw: record.paymentMethodRaw,
        customer_id: customerId,
        customer_name_raw: record.nameRaw,
        customer_phone_last_4: customerPhoneLast4,
        biller: record.biller,
        kot_no: record.kotNo,
        notes: null,
        ingestion_run_id: ctx.runId,
        raw_data: record.rawData,
      });
    }

    if (salesOrdersToInsert.length > 0) {
      const insertOrders = await ctx.supabase.from("sales_orders").insert(salesOrdersToInsert);
      assertSupabaseSuccess(insertOrders, "Failed to insert Petpooja orders.");
    }

    await refreshCustomerAggregates(ctx.supabase, touchedCustomerIds);

    return { rowsInserted: salesOrdersToInsert.length };
  },

  async rollback(ctx: RollbackContext) {
    const customerResult = await ctx.supabase
      .from("sales_orders")
      .select("customer_id")
      .eq("ingestion_run_id", ctx.runId);
    assertSupabaseSuccess(customerResult, "Failed to load customers for rollback.");
    const touchedCustomerIds = (
      (customerResult.data as Array<{ customer_id: string | null }> | null) ?? []
    )
      .map((row) => row.customer_id)
      .filter((value): value is string => Boolean(value));

    const deleteOrders = await ctx.supabase
      .from("sales_orders")
      .delete()
      .eq("ingestion_run_id", ctx.runId);
    assertSupabaseSuccess(deleteOrders, "Failed to roll back Petpooja orders.");

    await refreshCustomerAggregates(ctx.supabase, touchedCustomerIds);
    await deleteOrphanCustomers(ctx.supabase, touchedCustomerIds);
  },
};
