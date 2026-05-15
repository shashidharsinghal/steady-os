import { describe, expect, it } from "vitest";

import { normalizeSalesOrderFilters } from "@/app/(app)/sales/_lib/sales";

describe("sales order filters", () => {
  it("keeps valid filters and sort controls", () => {
    expect(
      normalizeSalesOrderFilters({
        channel: "swiggy",
        settlementStatus: "pending",
        sortBy: "total_amount_paise",
        sortDir: "asc",
      })
    ).toEqual({
      channel: "swiggy",
      settlementStatus: "pending",
      sortBy: "total_amount_paise",
      sortDir: "asc",
    });
  });

  it("falls back safely for invalid query params", () => {
    expect(
      normalizeSalesOrderFilters({
        channel: "bad-channel",
        settlementStatus: "paid",
        sortBy: "drop table",
        sortDir: "sideways",
      })
    ).toEqual({
      channel: "",
      settlementStatus: "",
      sortBy: "ordered_at",
      sortDir: "desc",
    });
  });
});
