import { describe, expect, it } from "vitest";
import { buildMergeSuggestions } from "@/app/(app)/customers/_lib/merge-suggestions";

describe("customer merge suggestions", () => {
  it("finds a likely Petpooja-to-UPI match from name overlap", () => {
    const suggestions = buildMergeSuggestions(
      [
        {
          id: "petpooja-customer",
          name: "Nikita Garg",
          primaryIdentifier: "Nikita Garg",
          totalOrders: 4,
          totalSpendPaise: 174500,
          lastSeenAt: "2026-04-10T10:00:00.000Z",
          identityCount: 1,
          vpas: [],
        },
        {
          id: "pine-labs-customer",
          name: null,
          primaryIdentifier: "garg.nikki1990@okicici",
          totalOrders: 4,
          totalSpendPaise: 273300,
          lastSeenAt: "2026-03-28T10:00:00.000Z",
          identityCount: 2,
          vpas: ["garg.nikki1990@okicici"],
        },
      ],
      new Set()
    );

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toMatchObject({
      primaryCustomerId: "pine-labs-customer",
      secondaryCustomerId: "petpooja-customer",
    });
    expect(suggestions[0]?.confidence).toBeGreaterThanOrEqual(80);
  });

  it("respects dismissed pairs", () => {
    const suggestions = buildMergeSuggestions(
      [
        {
          id: "a",
          name: "Nikita Garg",
          primaryIdentifier: "Nikita Garg",
          totalOrders: 4,
          totalSpendPaise: 174500,
          lastSeenAt: "2026-04-10T10:00:00.000Z",
          identityCount: 1,
          vpas: [],
        },
        {
          id: "b",
          name: null,
          primaryIdentifier: "garg.nikki1990@okicici",
          totalOrders: 4,
          totalSpendPaise: 273300,
          lastSeenAt: "2026-03-28T10:00:00.000Z",
          identityCount: 2,
          vpas: ["garg.nikki1990@okicici"],
        },
      ],
      new Set(["a:b"])
    );

    expect(suggestions).toHaveLength(0);
  });
});
