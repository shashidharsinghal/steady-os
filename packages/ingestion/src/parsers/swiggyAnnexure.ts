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
  getSheetOrThrow,
  getSheetRows,
  mapRowsToObjects,
  normalizeHeader,
  parseMoneyToPaise,
  readWorkbook,
  sampleText,
  stripExcelNoise,
  toIstIsoString,
} from "./helpers";

interface SwiggyOrderRecord {
  sourceOrderId: string;
  orderedAt: string;
  status: "success" | "cancelled";
  grossAmountPaise: number;
  packagingChargePaise: number;
  discountAmountPaise: number;
  netAmountPaise: number;
  taxAmountPaise: number;
  totalAmountPaise: number;
  aggregatorCommissionPaise: number;
  aggregatorFeesPaise: number;
  aggregatorNetPayoutPaise: number;
  rawData: Record<string, string | number | boolean | null>;
}

interface SwiggyPayoutRecord {
  periodStart: string;
  periodEnd: string;
  settlementDate: string | null;
  totalOrders: number;
  cancelledOrders: number;
  itemTotalPaise: number;
  packagingChargesPaise: number;
  restaurantDiscountSharePaise: number;
  gstCollectedPaise: number;
  totalCustomerPaidPaise: number;
  commissionPaise: number;
  paymentCollectionPaise: number;
  longDistancePaise: number;
  swiggyOneFeesPaise: number;
  pocketHeroFeesPaise: number;
  boltFeesPaise: number;
  restaurantCancellationPaise: number;
  callCenterPaise: number;
  deliveryFeeSponsoredPaise: number;
  otherFeesPaise: number;
  gstOnFeesPaise: number;
  totalFeesPaise: number;
  customerCancellationsPaise: number;
  customerComplaintsPaise: number;
  gstDeductionPaise: number;
  tcsPaise: number;
  tdsPaise: number;
  totalTaxesPaise: number;
  netPayoutPaise: number;
  adjustmentsPaise: number;
  adjustmentsDetail: Record<string, string | number | boolean | null> | null;
  rawData: Record<string, string | number | boolean | null>;
}

interface SwiggyRawBundle {
  orders: SwiggyOrderRecord[];
  payout: SwiggyPayoutRecord;
}

interface SwiggyCanonicalRecord {
  kind: "order" | "payout";
  payload: SwiggyOrderRecord | SwiggyPayoutRecord;
}

function normalizedRowObject(headers: unknown[], row: unknown[]) {
  const objectRow =
    mapRowsToObjects(headers, [row as Array<string | number | boolean | Date | null>])[0] ?? {};
  const normalized: Record<string, string | number | boolean | null> = {};

  Object.entries(objectRow).forEach(([key, value]) => {
    normalized[normalizeHeader(key)] = value;
  });

  return normalized;
}

function findHeaderRow(rows: unknown[][], needle: string): number {
  for (let index = 0; index < rows.length; index += 1) {
    const headers = (rows[index] ?? []).map((cell) => normalizeHeader(cell));
    if (headers.includes(needle)) return index;
  }
  throw new IngestionError("missing_required_column", `Could not find header row for ${needle}.`);
}

function parseSummaryPeriod(
  summaryRows: Array<Array<string | number | boolean | Date | null>>,
  fallbackYear: number
) {
  const payoutRow = summaryRows.find((row) =>
    row.some((cell) => stripExcelNoise(cell).toLowerCase() === "payout period")
  );
  const settlementRow = summaryRows.find((row) =>
    row.some((cell) => stripExcelNoise(cell).toLowerCase() === "payout settlement date")
  );

  const periodText = payoutRow?.find((cell) => stripExcelNoise(cell).includes("-"));
  const settlementText = settlementRow?.find(
    (cell) => stripExcelNoise(cell) !== "Payout Settlement Date"
  );

  const periodMatch = stripExcelNoise(periodText).match(
    /(\d{1,2})\s+([A-Za-z]+)\s*-\s*(\d{1,2})\s+([A-Za-z]+)/
  );

  if (!periodMatch) {
    throw new IngestionError("invalid_date", "Could not determine the Swiggy payout period.");
  }

  const periodStart = new Date(`${periodMatch[1]} ${periodMatch[2]} ${fallbackYear}`);
  const periodEnd = new Date(`${periodMatch[3]} ${periodMatch[4]} ${fallbackYear}`);
  const settlementDate = settlementText
    ? new Date(`${stripExcelNoise(settlementText)} ${fallbackYear}`)
    : null;

  return {
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
    settlementDate:
      settlementDate && !Number.isNaN(settlementDate.getTime())
        ? settlementDate.toISOString().slice(0, 10)
        : null,
  };
}

export const swiggyAnnexureParser: Parser<SwiggyRawBundle, SwiggyCanonicalRecord> = {
  sourceType: "swiggy_annexure",
  displayName: "Swiggy Weekly Annexure",
  acceptedExtensions: ["xlsx", "xls"],

  async detect(ctx) {
    const text = sampleText(ctx.sampleBuffer);
    if (filenameMatches(ctx.fileName.toLowerCase(), /invoice[_\s-]*annexure/)) {
      return { confidence: 0.85, reason: "Filename matches the Swiggy annexure pattern." };
    }
    if (
      text.includes("order level") &&
      text.includes("payout breakup") &&
      text.includes("summary")
    ) {
      return { confidence: 0.8, reason: "Workbook sample includes the expected Swiggy sheets." };
    }
    return { confidence: 0, reason: "No Swiggy annexure signals found." };
  },

  async parse(ctx: ParseContext): Promise<ParseResult<SwiggyRawBundle>> {
    const workbook = readWorkbook(ctx.fileBuffer, ctx.filePath);
    const summarySheet = getSheetOrThrow(workbook, "Summary");
    const payoutSheet = getSheetOrThrow(workbook, "Payout Breakup");
    const orderSheet = getSheetOrThrow(workbook, "Order Level");

    const summaryRows = getSheetRows(summarySheet);
    const payoutRows = getSheetRows(payoutSheet);
    const orderRows = getSheetRows(orderSheet);

    const orderHeaderIndex = findHeaderRow(orderRows as unknown[][], "order id");
    const orderHeaders = orderRows[orderHeaderIndex] ?? [];
    const normalizedHeaders = orderHeaders.map((header) => normalizeHeader(header));
    const orderIdIndex = normalizedHeaders.indexOf("order id");
    const orderDateIndex = normalizedHeaders.indexOf("order date");
    const orderStatusIndex = normalizedHeaders.indexOf("order status");
    const itemTotalIndex = normalizedHeaders.indexOf("item total");
    const packagingIndex = normalizedHeaders.indexOf("packaging charges");
    const discountShareIndex = normalizedHeaders.indexOf("restaurant discount share");
    const netBillIndex = normalizedHeaders.findIndex((header) => header.includes("net bill value"));
    const gstIndex = normalizedHeaders.indexOf("gst collected");
    const totalPaidIndex = normalizedHeaders.indexOf("total customer paid");
    const commissionIndex = normalizedHeaders.indexOf("commission");
    const totalFeesIndex = normalizedHeaders.indexOf("total swiggy fees");
    const payoutIndex = normalizedHeaders.findIndex((header) =>
      header.includes("net payout for order")
    );

    const requiredIndices = [
      orderIdIndex,
      orderDateIndex,
      orderStatusIndex,
      itemTotalIndex,
      packagingIndex,
      discountShareIndex,
      netBillIndex,
      gstIndex,
      totalPaidIndex,
      commissionIndex,
      totalFeesIndex,
      payoutIndex,
    ];

    if (requiredIndices.some((value) => value === -1)) {
      throw new IngestionError(
        "missing_required_column",
        "The Order Level sheet is missing one or more required columns."
      );
    }

    const orders: SwiggyOrderRecord[] = [];

    for (let rowIndex = orderHeaderIndex + 1; rowIndex < orderRows.length; rowIndex += 1) {
      const row = orderRows[rowIndex] ?? [];
      const sourceOrderId = stripExcelNoise(row[orderIdIndex]);
      if (!sourceOrderId) continue;

      try {
        const normalizedRow = normalizedRowObject(orderHeaders, row);
        const statusRaw = stripExcelNoise(row[orderStatusIndex]).toLowerCase();
        const status = statusRaw.includes("cancel") ? "cancelled" : "success";
        if (status !== "success") continue;

        orders.push({
          sourceOrderId,
          orderedAt: toIstIsoString(row[orderDateIndex]),
          status,
          grossAmountPaise: parseMoneyToPaise(row[itemTotalIndex], "Item Total"),
          packagingChargePaise: parseMoneyToPaise(row[packagingIndex], "Packaging Charges"),
          discountAmountPaise: parseMoneyToPaise(
            row[discountShareIndex],
            "Restaurant Discount Share"
          ),
          netAmountPaise: parseMoneyToPaise(row[netBillIndex], "Net Bill Value"),
          taxAmountPaise: parseMoneyToPaise(row[gstIndex], "GST Collected"),
          totalAmountPaise: parseMoneyToPaise(row[totalPaidIndex], "Total Customer Paid"),
          aggregatorCommissionPaise: parseMoneyToPaise(row[commissionIndex], "Commission"),
          aggregatorFeesPaise: parseMoneyToPaise(row[totalFeesIndex], "Total Swiggy Fees"),
          aggregatorNetPayoutPaise: parseMoneyToPaise(row[payoutIndex], "Net Payout for Order"),
          rawData: normalizedRow,
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

    const payoutHeaderIndex = findHeaderRow(payoutRows as unknown[][], "particulars");
    const payoutHeader = payoutRows[payoutHeaderIndex] ?? [];
    const particularsIndex = (payoutHeader ?? []).findIndex(
      (value) => normalizeHeader(value) === "particulars"
    );
    const totalIndex = (payoutHeader ?? []).findIndex(
      (value) => normalizeHeader(value) === "total"
    );

    if (particularsIndex === -1 || totalIndex === -1) {
      throw new IngestionError(
        "missing_required_column",
        "The Payout Breakup sheet is missing the Particulars/Total columns."
      );
    }

    const payoutDataRows = payoutRows
      .slice(payoutHeaderIndex + 1)
      .filter((row) => row.some((cell) => stripExcelNoise(cell) !== ""));
    const payoutEntries = new Map<string, string | number | boolean | null>();

    for (const row of payoutDataRows) {
      const description = normalizeHeader(row[particularsIndex]);
      if (!description) continue;
      payoutEntries.set(description, row[totalIndex] as string | number | boolean | null);
    }
    const fallbackYear = new Date(orders[0]?.orderedAt ?? Date.now()).getUTCFullYear();
    const summaryPeriod = parseSummaryPeriod(summaryRows, fallbackYear);

    const payoutRaw = normalizedRowObject(payoutHeader, payoutDataRows[0] ?? []);
    const payout: SwiggyPayoutRecord = {
      periodStart: summaryPeriod.periodStart,
      periodEnd: summaryPeriod.periodEnd,
      settlementDate: summaryPeriod.settlementDate,
      totalOrders: Number(payoutEntries.get("total orders") ?? orders.length),
      cancelledOrders: Number(payoutEntries.get("cancelled orders") ?? 0),
      itemTotalPaise: parseMoneyToPaise(payoutEntries.get("item total"), "Item Total"),
      packagingChargesPaise: parseMoneyToPaise(
        payoutEntries.get("packaging charges"),
        "Packaging Charges"
      ),
      restaurantDiscountSharePaise: parseMoneyToPaise(
        payoutEntries.get("restaurant discount share"),
        "Restaurant Discount Share"
      ),
      gstCollectedPaise: parseMoneyToPaise(payoutEntries.get("gst collected"), "GST Collected"),
      totalCustomerPaidPaise: parseMoneyToPaise(
        payoutEntries.get("total customer paid"),
        "Total Customer Paid"
      ),
      commissionPaise: parseMoneyToPaise(payoutEntries.get("commission"), "Commission"),
      paymentCollectionPaise: parseMoneyToPaise(
        payoutEntries.get("payment collection charges"),
        "Payment Collection Charges"
      ),
      longDistancePaise: parseMoneyToPaise(
        payoutEntries.get("long distance charges"),
        "Long Distance Charges"
      ),
      swiggyOneFeesPaise: parseMoneyToPaise(payoutEntries.get("swiggy one fees"), "Swiggy One"),
      pocketHeroFeesPaise: parseMoneyToPaise(
        payoutEntries.get("pocket hero fees"),
        "Pocket Hero Fees"
      ),
      boltFeesPaise: parseMoneyToPaise(payoutEntries.get("bolt fees"), "Bolt Fees"),
      restaurantCancellationPaise: parseMoneyToPaise(
        payoutEntries.get("restaurant cancellation charges"),
        "Restaurant Cancellation Charges"
      ),
      callCenterPaise: parseMoneyToPaise(
        payoutEntries.get("call center charges"),
        "Call Center Charges"
      ),
      deliveryFeeSponsoredPaise: parseMoneyToPaise(
        payoutEntries.get("delivery fee sponsored by restaurant"),
        "Delivery Fee Sponsored"
      ),
      otherFeesPaise: parseMoneyToPaise(payoutEntries.get("other fees"), "Other Fees"),
      gstOnFeesPaise: parseMoneyToPaise(
        payoutEntries.get("gst on service fee @18%"),
        "GST on Fees"
      ),
      totalFeesPaise: parseMoneyToPaise(payoutEntries.get("total swiggy fees"), "Total Fees"),
      customerCancellationsPaise: parseMoneyToPaise(
        payoutEntries.get("customer cancellations"),
        "Customer Cancellations"
      ),
      customerComplaintsPaise: parseMoneyToPaise(
        payoutEntries.get("customer complaints"),
        "Customer Complaints"
      ),
      gstDeductionPaise: parseMoneyToPaise(payoutEntries.get("gst deduction"), "GST Deduction"),
      tcsPaise: parseMoneyToPaise(payoutEntries.get("tcs"), "TCS"),
      tdsPaise: parseMoneyToPaise(payoutEntries.get("tds"), "TDS"),
      totalTaxesPaise: parseMoneyToPaise(payoutEntries.get("total taxes"), "Total Taxes"),
      netPayoutPaise: parseMoneyToPaise(payoutEntries.get("net payout"), "Net Payout"),
      adjustmentsPaise: 0,
      adjustmentsDetail: null,
      rawData: payoutRaw,
    };

    return {
      rowsSeen: orderRows.length + payoutRows.length + summaryRows.length,
      records: [{ orders, payout }],
    };
  },

  async normalize(
    ctx: NormalizeContext<SwiggyRawBundle>
  ): Promise<NormalizeResult<SwiggyCanonicalRecord>> {
    if (!ctx.outletId) {
      throw new IngestionError("parse_error", "Swiggy annexures require an outlet.");
    }

    const bundle = ctx.records[0];
    if (!bundle) return { toInsert: [], duplicateCount: 0 };

    const existingOrderIds = new Set<string>();
    for (const chunk of batch(bundle.orders.map((order) => order.sourceOrderId))) {
      const result = await ctx.supabase
        .from("sales_orders")
        .select("source_order_id")
        .eq("outlet_id", ctx.outletId)
        .eq("source", "swiggy")
        .in("source_order_id", chunk);
      assertSupabaseSuccess(result, "Failed to check for duplicate Swiggy orders.");
      const rows = (result.data as Array<{ source_order_id: string }> | null) ?? [];
      rows.forEach((row) => existingOrderIds.add(row.source_order_id));
    }

    const payoutResult = await ctx.supabase
      .from("aggregator_payouts")
      .select("id")
      .eq("outlet_id", ctx.outletId)
      .eq("source", "swiggy")
      .eq("period_start", bundle.payout.periodStart)
      .eq("period_end", bundle.payout.periodEnd);
    assertSupabaseSuccess(payoutResult, "Failed to check for duplicate Swiggy payout rows.");

    const payoutExists = ((payoutResult.data as Array<{ id: string }> | null) ?? []).length > 0;

    const toInsert: SwiggyCanonicalRecord[] = bundle.orders
      .filter((order) => !existingOrderIds.has(order.sourceOrderId))
      .map((order) => ({ kind: "order" as const, payload: order }));

    if (!payoutExists) {
      toInsert.push({ kind: "payout", payload: bundle.payout });
    }

    return {
      toInsert,
      duplicateCount:
        bundle.orders.length -
        toInsert.filter((row) => row.kind === "order").length +
        (payoutExists ? 1 : 0),
    };
  },

  async commit(ctx: CommitContext<SwiggyCanonicalRecord>) {
    if (!ctx.outletId) {
      throw new IngestionError("parse_error", "Swiggy annexures require an outlet.");
    }

    const orderRows = ctx.records
      .filter(
        (record): record is { kind: "order"; payload: SwiggyOrderRecord } => record.kind === "order"
      )
      .map((record) => ({
        outlet_id: ctx.outletId,
        source: "swiggy",
        source_order_id: record.payload.sourceOrderId,
        channel: "swiggy",
        order_type_raw: null,
        area_raw: null,
        sub_order_type_raw: "Swiggy",
        status: record.payload.status,
        ordered_at: record.payload.orderedAt,
        gross_amount_paise: record.payload.grossAmountPaise,
        discount_amount_paise: record.payload.discountAmountPaise,
        net_amount_paise: record.payload.netAmountPaise,
        delivery_charge_paise: 0,
        packaging_charge_paise: record.payload.packagingChargePaise,
        service_charge_paise: 0,
        tax_amount_paise: record.payload.taxAmountPaise,
        round_off_paise: 0,
        total_amount_paise: record.payload.totalAmountPaise,
        cgst_paise: 0,
        sgst_paise: 0,
        igst_paise: 0,
        gst_paid_by_merchant_paise: 0,
        gst_paid_by_ecommerce_paise: 0,
        aggregator_commission_paise: record.payload.aggregatorCommissionPaise,
        aggregator_fees_paise: record.payload.aggregatorFeesPaise,
        aggregator_net_payout_paise: record.payload.aggregatorNetPayoutPaise,
        payment_method: "online_aggregator",
        payment_method_raw: "Swiggy Online",
        customer_id: null,
        customer_name_raw: null,
        customer_phone_last_4: null,
        biller: null,
        kot_no: null,
        notes: null,
        ingestion_run_id: ctx.runId,
        raw_data: record.payload.rawData,
      }));

    const payoutRow = ctx.records.find(
      (record): record is { kind: "payout"; payload: SwiggyPayoutRecord } =>
        record.kind === "payout"
    );

    if (orderRows.length > 0) {
      const insertOrders = await ctx.supabase.from("sales_orders").insert(orderRows);
      assertSupabaseSuccess(insertOrders, "Failed to insert Swiggy order rows.");
    }

    if (payoutRow) {
      const insertPayout = await ctx.supabase.from("aggregator_payouts").insert({
        outlet_id: ctx.outletId,
        source: "swiggy",
        period_start: payoutRow.payload.periodStart,
        period_end: payoutRow.payload.periodEnd,
        total_orders: payoutRow.payload.totalOrders,
        cancelled_orders: payoutRow.payload.cancelledOrders,
        item_total_paise: payoutRow.payload.itemTotalPaise,
        packaging_charges_paise: payoutRow.payload.packagingChargesPaise,
        restaurant_discount_share_paise: payoutRow.payload.restaurantDiscountSharePaise,
        gst_collected_paise: payoutRow.payload.gstCollectedPaise,
        total_customer_paid_paise: payoutRow.payload.totalCustomerPaidPaise,
        commission_paise: payoutRow.payload.commissionPaise,
        payment_collection_paise: payoutRow.payload.paymentCollectionPaise,
        long_distance_paise: payoutRow.payload.longDistancePaise,
        swiggy_one_fees_paise: payoutRow.payload.swiggyOneFeesPaise,
        pocket_hero_fees_paise: payoutRow.payload.pocketHeroFeesPaise,
        bolt_fees_paise: payoutRow.payload.boltFeesPaise,
        restaurant_cancellation_paise: payoutRow.payload.restaurantCancellationPaise,
        call_center_paise: payoutRow.payload.callCenterPaise,
        delivery_fee_sponsored_paise: payoutRow.payload.deliveryFeeSponsoredPaise,
        other_fees_paise: payoutRow.payload.otherFeesPaise,
        gst_on_fees_paise: payoutRow.payload.gstOnFeesPaise,
        total_fees_paise: payoutRow.payload.totalFeesPaise,
        customer_cancellations_paise: payoutRow.payload.customerCancellationsPaise,
        customer_complaints_paise: payoutRow.payload.customerComplaintsPaise,
        gst_deduction_paise: payoutRow.payload.gstDeductionPaise,
        tcs_paise: payoutRow.payload.tcsPaise,
        tds_paise: payoutRow.payload.tdsPaise,
        total_taxes_paise: payoutRow.payload.totalTaxesPaise,
        net_payout_paise: payoutRow.payload.netPayoutPaise,
        settlement_date: payoutRow.payload.settlementDate,
        adjustments_paise: payoutRow.payload.adjustmentsPaise,
        adjustments_detail: payoutRow.payload.adjustmentsDetail,
        raw_data: payoutRow.payload.rawData,
        ingestion_run_id: ctx.runId,
      });
      assertSupabaseSuccess(insertPayout, "Failed to insert Swiggy payout row.");
    }

    return { rowsInserted: orderRows.length + (payoutRow ? 1 : 0) };
  },

  async rollback(ctx: RollbackContext) {
    const deleteOrders = await ctx.supabase
      .from("sales_orders")
      .delete()
      .eq("ingestion_run_id", ctx.runId);
    assertSupabaseSuccess(deleteOrders, "Failed to roll back Swiggy order rows.");

    const deletePayouts = await ctx.supabase
      .from("aggregator_payouts")
      .delete()
      .eq("ingestion_run_id", ctx.runId);
    assertSupabaseSuccess(deletePayouts, "Failed to roll back Swiggy payout rows.");
  },
};
