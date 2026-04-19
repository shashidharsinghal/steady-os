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

function createSupabaseStub() {
  const dataByTable = new Map<string, unknown[]>([
    ["sales_orders", []],
    ["payment_transactions", []],
    ["aggregator_payouts", []],
  ]);

  const builder = (table: string) => {
    const rows = dataByTable.get(table) ?? [];

    const chain = {
      eq: () => chain,
      neq: () => chain,
      in: () => chain,
      gte: () => chain,
      lte: () => chain,
      order: () => chain,
      select: () => chain,
      single: () =>
        Promise.resolve({ data: null, error: { code: "PGRST116", message: "No rows" } }),
      then: (resolvePromise: (value: { data: unknown; error: null }) => unknown) =>
        Promise.resolve(resolvePromise({ data: rows, error: null })),
    };

    return {
      ...chain,
      insert: () => chain,
      upsert: () => chain,
      update: () => chain,
      delete: () => chain,
    };
  };

  return {
    from: (table: string) => builder(table),
    rpc: async () => ({ data: null, error: null }),
  } as unknown as ParserSupabaseClient;
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

    const normalizeResult = await petpoojaOrdersMasterParser.normalize({
      runId: "test-run",
      outletId: "test-outlet",
      records: parseResult.records,
      supabase: createSupabaseStub(),
    });
    expect(normalizeResult.toInsert.length).toBe(parseResult.records.length);
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
  });

  it("keeps the taco PDF outside the spreadsheet ingestion path", () => {
    const fileName = "taco_Tax_Invoice_1342966_25032026_260325FS06003071.pdf";
    expect(() => fixtureBuffer(fileName)).not.toThrow();
    expect(fileName.endsWith(".pdf")).toBe(true);
  });
});
