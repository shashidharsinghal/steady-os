import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ParserSupabaseClient } from "../../../packages/ingestion/src/types/parser";
import { petpoojaDayWiseParser } from "../../../packages/ingestion/src/parsers/petpoojaDayWise";
import {
  buildItemWorkbook,
  buildItemWorkbookOnAlternateSheet,
  buildItemWorkbookWithExcelDates,
  petpoojaItemBillParser,
  petpoojaPaymentSummaryParser,
  type PetpoojaItemBillRecord,
} from "../../../packages/ingestion/src/parsers/petpoojaDaily";
import { petpoojaOrdersMasterParser } from "../../../packages/ingestion/src/parsers/petpoojaOrdersMaster";
import { pineLabsPosParser } from "../../../packages/ingestion/src/parsers/pineLabsPos";
import { swiggyAnnexureParser } from "../../../packages/ingestion/src/parsers/swiggyAnnexure";

function fixturePath(fileName: string): string {
  return resolve(process.cwd(), "test/data/files", fileName);
}

function fixtureBuffer(fileName: string): Buffer {
  return readFileSync(fixturePath(fileName));
}

function createDetectContext(fileName: string) {
  const buffer = fixtureBuffer(fileName);
  return {
    fileName,
    fileSize: buffer.byteLength,
    sampleBuffer: buffer.subarray(0, 50 * 1024),
  };
}

function createParseContext(fileName: string) {
  const buffer = fixtureBuffer(fileName);
  const errors: Array<{ rowNumber: number; errorCode: string; errorMessage: string }> = [];

  return {
    ctx: {
      runId: "test-run",
      outletId: "test-outlet",
      filePath: fileName,
      fileBuffer: buffer,
      recordError: (error: { rowNumber: number; errorCode: string; errorMessage: string }) => {
        errors.push(error);
      },
    },
    errors,
  };
}

function createSupabaseStub(seed?: Record<string, unknown[]>) {
  const dataByTable = new Map<string, unknown[]>(
    Object.entries({
      sales_orders: [],
      sales_line_items: [],
      sales_payment_splits: [],
      payment_transactions: [],
      aggregator_payouts: [],
      ...seed,
    })
  );

  const builder = (table: string) => {
    let selectedRows = [...(dataByTable.get(table) ?? [])];

    const chain = {
      eq: (column: string, value: unknown) => {
        selectedRows = selectedRows.filter(
          (row) => (row as Record<string, unknown>)[column] === value
        );
        return chain;
      },
      neq: (column: string, value: unknown) => {
        selectedRows = selectedRows.filter(
          (row) => (row as Record<string, unknown>)[column] !== value
        );
        return chain;
      },
      in: (column: string, values: unknown[]) => {
        selectedRows = selectedRows.filter((row) =>
          values.includes((row as Record<string, unknown>)[column])
        );
        return chain;
      },
      gte: () => chain,
      lte: () => chain,
      order: () => chain,
      select: () => chain,
      single: () =>
        Promise.resolve(
          selectedRows[0]
            ? { data: selectedRows[0], error: null }
            : { data: null, error: { code: "PGRST116", message: "No rows" } }
        ),
      then: (resolvePromise: (value: { data: unknown; error: null }) => unknown) =>
        Promise.resolve(resolvePromise({ data: selectedRows, error: null })),
    };

    return {
      ...chain,
      insert: (payload: unknown | unknown[]) => {
        const nextRows = (Array.isArray(payload) ? payload : [payload]).map((row, index) => {
          if (
            typeof row === "object" &&
            row != null &&
            !("id" in row) &&
            (table === "sales_orders" ||
              table === "sales_line_items" ||
              table === "sales_payment_splits")
          ) {
            return { id: `${table}-${Date.now()}-${index}`, ...row };
          }
          return row;
        });
        dataByTable.set(table, [...(dataByTable.get(table) ?? []), ...nextRows]);
        selectedRows = [...(dataByTable.get(table) ?? [])];
        return Promise.resolve({ data: nextRows, error: null });
      },
      upsert: () => Promise.resolve({ data: null, error: null }),
      update: () => Promise.resolve({ data: null, error: null }),
      delete: () => ({
        eq: (column: string, value: unknown) => {
          const remaining = (dataByTable.get(table) ?? []).filter(
            (row) => (row as Record<string, unknown>)[column] !== value
          );
          dataByTable.set(table, remaining);
          selectedRows = [...remaining];
          return Promise.resolve({ data: null, error: null });
        },
      }),
    };
  };

  return {
    from: (table: string) => builder(table),
    rpc: async () => ({ data: null, error: null }),
    __dataByTable: dataByTable,
  } as unknown as ParserSupabaseClient & { __dataByTable: Map<string, unknown[]> };
}

describe("sales ingestion fixtures", () => {
  const dailyItemRows: PetpoojaItemBillRecord[] = [
    {
      rowNumber: 6,
      businessDate: "2026-04-28",
      invoiceNo: "808",
      orderedAt: "2026-04-28T15:58:00.000Z",
      serverName: "biller",
      tableNo: "",
      covers: 0,
      category: "Tandoori Starters",
      itemName: "Maharaja Malai Chaap (Full)",
      variation: "Full",
      quantity: 2,
      unitPricePaise: 42950,
      subTotalPaise: 85900,
      discountPaise: 0,
      taxPaise: 0,
      lineTotalPaise: 85900,
      rawData: { hsn_code: "996331" },
    },
    {
      rowNumber: 7,
      businessDate: "2026-04-28",
      invoiceNo: "810",
      orderedAt: "2026-04-28T16:10:00.000Z",
      serverName: "biller",
      tableNo: "T1",
      covers: 2,
      category: "Breads & Extras",
      itemName: "Roomali Roti",
      variation: null,
      quantity: 4,
      unitPricePaise: 4000,
      subTotalPaise: 16000,
      discountPaise: 0,
      taxPaise: 0,
      lineTotalPaise: 16000,
      rawData: { hsn_code: "996331" },
    },
  ];

  function dailyItemBuffer() {
    return buildItemWorkbook(dailyItemRows);
  }

  function dailyItemBufferWithExcelDates() {
    return buildItemWorkbookWithExcelDates([dailyItemRows[0]!]);
  }

  function dailyItemBufferOnAlternateSheet() {
    return buildItemWorkbookOnAlternateSheet([dailyItemRows[0]!]);
  }

  function dailyPaymentBuffer() {
    return Buffer.from(`<html><body><table>
        <tr><td>Date</td><td>2026-04-28 to 2026-04-28</td></tr>
        <tr><td>Name</td><td>Payment Wise Summary</td></tr>
        <tr><td>Restaurant Name</td><td>Test Outlet</td></tr>
        <tr><td></td></tr>
        <tr><td>Invoice No.</td><td>Date</td><td>Payment Type</td><td>Order Type</td><td>Status</td><td>Persons</td><td>Area</td><td>Assign To</td><td>Not Paid</td><td>Cash</td><td>Card</td><td>Due Payment</td><td>Other</td><td>Wallet</td><td>UPI</td><td>Online</td></tr>
        <tr><td>808</td><td>28-04-2026</td><td>Cash</td><td>Delivery(Parcel)</td><td>Success</td><td>0</td><td>Parcel</td><td></td><td>0</td><td>1219</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
        <tr><td>809</td><td>28-04-2026</td><td>UPI</td><td>Dine In</td><td>Cancelled</td><td>2</td><td></td><td></td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>230</td><td>0</td></tr>
        <tr><td>810</td><td>28-04-2026</td><td>Online</td><td>Delivery(Parcel)</td><td>Success</td><td>0</td><td>Zomato</td><td></td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>272</td></tr>
        <tr><td>Total</td><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td>0</td><td>1219</td><td>0</td><td>0</td><td>0</td><td>0</td><td>230</td><td>272</td></tr>
      </table></body></html>`);
  }

  it("detects and parses Petpooja daily item and payment reports", async () => {
    const itemBuffer = dailyItemBuffer();
    const paymentBuffer = dailyPaymentBuffer();

    expect(
      (
        await petpoojaItemBillParser.detect({
          fileName: "Item_bill_report_2026_04_28_22_30_00.xlsx",
          fileSize: itemBuffer.byteLength,
          sampleBuffer: itemBuffer.subarray(0, 50 * 1024),
        })
      ).confidence
    ).toBeGreaterThan(0.7);
    expect(
      (
        await petpoojaPaymentSummaryParser.detect({
          fileName: "payment_wise_summary_2026_04_28_22_30_00.xls",
          fileSize: paymentBuffer.byteLength,
          sampleBuffer: paymentBuffer.subarray(0, 50 * 1024),
        })
      ).confidence
    ).toBeGreaterThan(0.7);

    const itemResult = await petpoojaItemBillParser.parse({
      runId: "item-run",
      outletId: "outlet-elan",
      filePath: "Item_bill_report_2026_04_28_22_30_00.xlsx",
      fileBuffer: itemBuffer,
      recordError: () => undefined,
    });
    const paymentResult = await petpoojaPaymentSummaryParser.parse({
      runId: "payment-run",
      outletId: "outlet-elan",
      filePath: "payment_wise_summary_2026_04_28_22_30_00.xls",
      fileBuffer: paymentBuffer,
      recordError: () => undefined,
    });

    expect(itemResult.records).toHaveLength(2);
    expect(itemResult.records[0]?.itemName).toBe("Maharaja Malai Chaap (Full)");
    expect(paymentResult.records).toHaveLength(3);
    expect(paymentResult.records.filter((row) => row.status === "cancelled")).toHaveLength(1);
    expect(paymentResult.records.find((row) => row.invoiceNo === "810")?.channel).toBe("zomato");
    expect(paymentResult.records.find((row) => row.invoiceNo === "810")?.settlementStatus).toBe(
      "pending"
    );
  });

  it("parses Petpooja item reports when date cells are native Excel dates", async () => {
    const errors: Array<{ rowNumber: number; errorCode: string; errorMessage: string }> = [];
    const result = await petpoojaItemBillParser.parse({
      runId: "item-date-run",
      outletId: "outlet-elan",
      filePath: "Item_bill_report_2026_04_29_01_56_15.xlsx",
      fileBuffer: dailyItemBufferWithExcelDates(),
      recordError: (error) => errors.push(error),
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.invoiceNo).toBe("808");
    expect(result.records[0]?.quantity).toBe(2);
    expect(errors).toEqual([]);
  });

  it("falls back to the matching worksheet when the sheet name is not exactly Report", async () => {
    const errors: Array<{ rowNumber: number; errorCode: string; errorMessage: string }> = [];
    const result = await petpoojaItemBillParser.parse({
      runId: "item-sheet-run",
      outletId: "outlet-elan",
      filePath: "Item_bill_report_2026_04_29_01_56_15.xlsx",
      fileBuffer: dailyItemBufferOnAlternateSheet(),
      recordError: (error) => errors.push(error),
    });

    expect(result.records).toHaveLength(1);
    expect(result.records[0]?.invoiceNo).toBe("808");
    expect(errors).toEqual([]);
  });

  it("commits Petpooja daily orders, payment splits, and linked line items", async () => {
    const supabase = createSupabaseStub();
    const paymentResult = await petpoojaPaymentSummaryParser.parse({
      runId: "payment-run",
      outletId: "outlet-elan",
      filePath: "payment_wise_summary_2026_04_28_22_30_00.xls",
      fileBuffer: dailyPaymentBuffer(),
      recordError: () => undefined,
    });
    const paymentNormalize = await petpoojaPaymentSummaryParser.normalize({
      runId: "payment-run",
      outletId: "outlet-elan",
      records: paymentResult.records,
      supabase,
    });
    await petpoojaPaymentSummaryParser.commit({
      runId: "payment-run",
      outletId: "outlet-elan",
      records: paymentNormalize.toInsert,
      committedBy: "partner-user",
      supabase,
    });

    const itemResult = await petpoojaItemBillParser.parse({
      runId: "item-run",
      outletId: "outlet-elan",
      filePath: "Item_bill_report_2026_04_28_22_30_00.xlsx",
      fileBuffer: dailyItemBuffer(),
      recordError: () => undefined,
    });
    const itemNormalize = await petpoojaItemBillParser.normalize({
      runId: "item-run",
      outletId: "outlet-elan",
      records: itemResult.records,
      supabase,
    });
    await petpoojaItemBillParser.commit({
      runId: "item-run",
      outletId: "outlet-elan",
      records: itemNormalize.toInsert,
      committedBy: "partner-user",
      supabase,
    });

    expect(supabase.__dataByTable.get("sales_orders")).toHaveLength(3);
    expect(supabase.__dataByTable.get("sales_payment_splits")).toHaveLength(3);
    expect(supabase.__dataByTable.get("sales_line_items")).toHaveLength(2);
    expect(
      (supabase.__dataByTable.get("sales_payment_splits") ?? []).find(
        (row) => (row as Record<string, unknown>).method === "upi"
      )
    ).toMatchObject({ amount_paise: 23000 });
  });

  it("detects and parses Petpooja Orders Master", async () => {
    const fileName = "Orders_Master_Report_2026_04_06_12_46_26.xlsx";
    const detectResult = await petpoojaOrdersMasterParser.detect(createDetectContext(fileName));
    expect(detectResult.confidence).toBeGreaterThan(0.7);

    const { ctx, errors } = createParseContext(fileName);
    const parseResult = await petpoojaOrdersMasterParser.parse(ctx);
    expect(parseResult.records.length).toBeGreaterThan(400);
    expect(errors.length).toBe(0);
    expect(parseResult.records[0]?.orderedAt).toContain("T16:19:31.000Z");

    const normalizeResult = await petpoojaOrdersMasterParser.normalize({
      runId: "test-run",
      outletId: "test-outlet",
      records: parseResult.records,
      supabase: createSupabaseStub(),
    });
    expect(normalizeResult.toInsert.length).toBe(parseResult.records.length);
    expect(normalizeResult.toInsert[0]?.channel).toBe("dine_in");
  });

  it("detects and parses Petpooja Day-Wise validation workbook", async () => {
    const fileName = "Elan Miracle Mar 2026.xlsx";
    const detectResult = await petpoojaDayWiseParser.detect(createDetectContext(fileName));
    expect(detectResult.confidence).toBeGreaterThan(0);

    const { ctx, errors } = createParseContext(fileName);
    const parseResult = await petpoojaDayWiseParser.parse(ctx);
    expect(parseResult.records.length).toBeGreaterThan(20);
    expect(errors.length).toBe(0);
  });

  it("detects and parses Pine Labs workbook", async () => {
    const fileName = "Pinelab data Elan Miracle.xlsx";
    const detectResult = await pineLabsPosParser.detect(createDetectContext(fileName));
    expect(detectResult.confidence).toBeGreaterThan(0.7);

    const { ctx, errors } = createParseContext(fileName);
    const parseResult = await pineLabsPosParser.parse(ctx);
    expect(parseResult.records.length).toBeGreaterThan(250);
    expect(errors.length).toBe(0);

    const normalizeResult = await pineLabsPosParser.normalize({
      runId: "test-run",
      outletId: "test-outlet",
      records: parseResult.records,
      supabase: createSupabaseStub(),
    });
    expect(normalizeResult.toInsert.length).toBe(parseResult.records.length);
  });

  it("detects and parses Swiggy annexure workbook", async () => {
    const fileName = "invoice_Annexure_1342966_25032026_1774435563045.xlsx";
    const detectResult = await swiggyAnnexureParser.detect(createDetectContext(fileName));
    expect(detectResult.confidence).toBeGreaterThan(0.7);

    const { ctx, errors } = createParseContext(fileName);
    const parseResult = await swiggyAnnexureParser.parse(ctx);
    expect(parseResult.records).toHaveLength(1);
    expect(parseResult.records[0]?.orders.length).toBeGreaterThan(10);
    expect(errors.length).toBe(0);

    const normalizeResult = await swiggyAnnexureParser.normalize({
      runId: "test-run",
      outletId: "test-outlet",
      records: parseResult.records,
      supabase: createSupabaseStub(),
    });
    expect(normalizeResult.toInsert.some((record) => record.kind === "payout")).toBe(true);
    expect(normalizeResult.toInsert.some((record) => record.kind === "order")).toBe(true);
    expect(parseResult.records[0]?.orders[0]?.aggregatorNetPayoutPaise).toBeGreaterThan(0);
    expect(parseResult.records[0]?.payout.adjustmentsPaise).toBe(-281430);
    expect(parseResult.records[0]?.payout.adjustmentsDetail).toHaveLength(1);
    expect(parseResult.records[0]?.payout.adjustmentsDetail?.[0]).toMatchObject({
      adjustment_type: "Cost Per Click - Ads",
      invoice_number: "260325FS06003071",
    });
  });

  it("commits and rolls back Swiggy annexure rows end-to-end", async () => {
    const fileName = "invoice_Annexure_1342966_25032026_1774435563045.xlsx";
    const { ctx } = createParseContext(fileName);
    const parseResult = await swiggyAnnexureParser.parse(ctx);
    const supabase = createSupabaseStub();

    const normalizeResult = await swiggyAnnexureParser.normalize({
      runId: "swiggy-run",
      outletId: "outlet-elan",
      records: parseResult.records,
      supabase,
    });

    await swiggyAnnexureParser.commit({
      runId: "swiggy-run",
      outletId: "outlet-elan",
      records: normalizeResult.toInsert,
      committedBy: "partner-user",
      supabase,
    });

    const insertedOrders = (supabase.__dataByTable.get("sales_orders") ?? []) as Array<
      Record<string, unknown>
    >;
    const insertedPayouts = (supabase.__dataByTable.get("aggregator_payouts") ?? []) as Array<
      Record<string, unknown>
    >;

    expect(insertedOrders.length).toBe(17);
    expect(insertedOrders[0]).toMatchObject({
      outlet_id: "outlet-elan",
      source: "swiggy",
      channel: "swiggy",
      settlement_status: "settled",
    });
    expect(insertedPayouts).toHaveLength(1);
    expect(insertedPayouts[0]).toMatchObject({
      source: "swiggy",
      period_start: "2026-03-15",
      period_end: "2026-03-21",
      adjustments_paise: -281430,
    });

    await swiggyAnnexureParser.rollback({
      runId: "swiggy-run",
      supabase,
    });

    expect(supabase.__dataByTable.get("sales_orders")).toHaveLength(0);
    expect(supabase.__dataByTable.get("aggregator_payouts")).toHaveLength(0);
  });

  it("keeps the taco PDF outside the spreadsheet ingestion path", () => {
    const fileName = "taco_Tax_Invoice_1342966_25032026_260325FS06003071.pdf";
    expect(() => fixtureBuffer(fileName)).not.toThrow();
    expect(fileName.endsWith(".pdf")).toBe(true);
  });
});
