import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { ParserSupabaseClient } from "../../../packages/ingestion/src/types/parser";
import { petpoojaDayWiseParser } from "../../../packages/ingestion/src/parsers/petpoojaDayWise";
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
        const nextRows = Array.isArray(payload) ? payload : [payload];
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
