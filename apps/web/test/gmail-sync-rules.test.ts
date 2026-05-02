import { describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  buildGmailBackfillDates,
  evaluateAutoCommitReadiness,
  isAllowedPetpoojaSender,
  subjectMatchesOutlet,
} from "@/lib/gmail/sync";

describe("gmail sync rules", () => {
  it("accepts only petpooja.com senders", () => {
    expect(isAllowedPetpoojaSender("Petpooja Reports <reports@petpooja.com>")).toBe(true);
    expect(isAllowedPetpoojaSender("noreply@petpooja.com")).toBe(true);
    expect(isAllowedPetpoojaSender("Fake Reports <reports@example.com>")).toBe(false);
  });

  it("matches outlet names from the subject line with punctuation tolerance", () => {
    expect(
      subjectMatchesOutlet(
        "Report Notification: Payment Wise Summary : GABRU DI CHAAP (Miracle Mall, Gurugram)",
        {
          id: "outlet-1",
          name: "Gabru Di Chaap",
          brand: "Gabru Di Chaap",
          petpooja_restaurant_id: null,
        } as never
      )
    ).toBe(true);

    expect(
      subjectMatchesOutlet("Report Notification: Payment Wise Summary : Some Other Restaurant", {
        id: "outlet-1",
        name: "Gabru Di Chaap",
        brand: "Gabru Di Chaap",
        petpooja_restaurant_id: null,
      } as never)
    ).toBe(false);
  });

  it("builds inclusive backfill dates oldest-first", () => {
    expect(buildGmailBackfillDates("2026-04-01", "2026-04-03")).toEqual([
      "2026-04-01",
      "2026-04-02",
      "2026-04-03",
    ]);

    expect(buildGmailBackfillDates("2026-04-03", "2026-04-01")).toEqual([
      "2026-04-01",
      "2026-04-02",
      "2026-04-03",
    ]);
  });

  it("blocks auto-commit when any review rule fails", () => {
    expect(
      evaluateAutoCommitReadiness({
        detectionConfidence: 0.96,
        rowsErrored: 0,
        rowCountEligible: true,
      })
    ).toEqual([]);

    expect(
      evaluateAutoCommitReadiness({
        detectionConfidence: 0.8,
        rowsErrored: 2,
        rowCountEligible: false,
        rowCountReason: "Row count is outside the expected range.",
      })
    ).toEqual([
      "Parser confidence 0.80 is below 0.95.",
      "2 row-level parse errors found.",
      "Row count is outside the expected range.",
    ]);
  });
});
