import { describe, expect, it } from "vitest";

import { expenseDisplayDueDate, expenseTotalPaise, paiseNumber } from "@/lib/expenses";

describe("expense display rules", () => {
  it("normalizes paise fields returned as strings", () => {
    expect(paiseNumber("125000")).toBe(125000);
    expect(paiseNumber(null)).toBe(0);
    expect(
      expenseTotalPaise({ total_paise: "0", amount_paise: "100000", tax_paise: "18000" })
    ).toBe(118000);
    expect(expenseTotalPaise({ total_paise: "250000", amount_paise: "100000" })).toBe(250000);
  });

  it("falls back from due date to invoice date and created date", () => {
    expect(
      expenseDisplayDueDate({
        due_date: null,
        invoice_date: "2026-05-14",
        created_at: "2026-05-15T10:00:00.000Z",
      })
    ).toBe("2026-05-14");
    expect(
      expenseDisplayDueDate({
        due_date: null,
        invoice_date: null,
        created_at: "2026-05-15T10:00:00.000Z",
      })
    ).toBe("2026-05-15");
  });
});
