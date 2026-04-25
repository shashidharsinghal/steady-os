import { describe, expect, it } from "vitest";
import {
  buildFreshnessMessage,
  buildRevenueDipAlert,
  chooseDashboardOutlet,
  resolveDashboardPeriod,
} from "@/app/(app)/dashboard/_lib/dashboard";

describe("sales dashboard helpers", () => {
  it("resolves a custom period and swaps inverted dates", () => {
    const period = resolveDashboardPeriod(
      {
        period: "custom",
        start: "2026-04-10",
        end: "2026-04-05",
      },
      new Date("2026-04-19T08:00:00.000Z")
    );

    expect(period.key).toBe("custom");
    expect(period.start).toBe("2026-04-04T18:30:00.000Z");
    expect(period.end).toBe("2026-04-10T18:30:00.000Z");
    expect(period.compareStart).toBe("2026-03-29T18:30:00.000Z");
    expect(period.compareEnd).toBe("2026-04-04T18:30:00.000Z");
  });

  it("builds a revenue dip alert only for a meaningful drop", () => {
    expect(
      buildRevenueDipAlert({
        subjectDayIso: "2026-04-18",
        subjectRevenuePaise: 50000,
        trailingAveragePaise: 100000,
      })
    ).toEqual({
      id: "revenue-dip-2026-04-18",
      severity: "warn",
      message: "Yesterday's revenue was 50% below the 14-day average.",
    });

    expect(
      buildRevenueDipAlert({
        subjectDayIso: "2026-04-18",
        subjectRevenuePaise: 70000,
        trailingAveragePaise: 100000,
      })
    ).toBeNull();
  });

  it("chooses the preferred outlet when it exists", () => {
    const outlets = [
      { id: "outlet-1", name: "Elan Miracle" },
      { id: "outlet-2", name: "Sector 84" },
    ];

    expect(chooseDashboardOutlet(outlets, "outlet-2")).toEqual(outlets[1]);
    expect(chooseDashboardOutlet(outlets, "missing")).toEqual(outlets[0]);
  });

  it("builds a clear freshness message for critical staleness", () => {
    const message = buildFreshnessMessage({
      lastUpload: "2026-04-10T06:00:00.000Z",
      latestOrder: "2026-04-09T15:30:00.000Z",
      state: "critical",
      hoursSinceUpload: 220,
      staleDays: 9,
    });

    expect(message.href).toBe("/ingest");
    expect(message.headline).toContain("9 days stale");
    expect(message.headline).toContain("09 Apr 2026");
    expect(message.detail).toContain("Most recent order:");
  });
});
