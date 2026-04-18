import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  archiveEmployee,
  assignEmployeeToOutlet,
  createEmployee,
  recordSalaryChange,
  removeEmployeeFromOutlet,
  updateEmployee,
} from "@/app/(app)/employees/actions";

function makeSupabase({ userId, isPartner }: { userId: string | null; isPartner: boolean }) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isPartner, error: null }),
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValueOnce({ data: { id: "employee-1" }, error: null })
        .mockResolvedValue({ data: { current_outlet_id: "outlet-1" }, error: null }),
    }),
  };
}

describe("employee server actions — auth checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("createEmployee throws if user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ userId: null, isPartner: false }) as never
    );

    await expect(
      createEmployee({
        full_name: "Aman Singh",
        phone: "9876543210",
        email: "",
        address: "",
        date_of_birth: "",
        joined_on: "2026-01-10",
        left_on: "",
        role: "staff",
        position: "Cook",
        employment_type: "full_time",
        reports_to: "",
        current_outlet_id: "550e8400-e29b-41d4-a716-446655440000",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        aadhaar_last_4: "",
        monthly_salary: 25000,
      })
    ).rejects.toThrow("Not authenticated");
  });

  it("createEmployee throws if user is a manager", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ userId: "uid-1", isPartner: false }) as never
    );

    await expect(
      createEmployee({
        full_name: "Aman Singh",
        phone: "9876543210",
        email: "",
        address: "",
        date_of_birth: "",
        joined_on: "2026-01-10",
        left_on: "",
        role: "staff",
        position: "Cook",
        employment_type: "full_time",
        reports_to: "",
        current_outlet_id: "550e8400-e29b-41d4-a716-446655440000",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        aadhaar_last_4: "",
        monthly_salary: 25000,
      })
    ).rejects.toThrow("Only partners can perform this action");
  });

  it("updateEmployee throws if user is a manager", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ userId: "uid-1", isPartner: false }) as never
    );

    await expect(
      updateEmployee("employee-1", {
        full_name: "Aman Singh",
        phone: "9876543210",
        email: "",
        address: "",
        date_of_birth: "",
        joined_on: "2026-01-10",
        left_on: "",
        role: "staff",
        position: "Cook",
        employment_type: "full_time",
        reports_to: "",
        current_outlet_id: "550e8400-e29b-41d4-a716-446655440000",
        emergency_contact_name: "",
        emergency_contact_phone: "",
        aadhaar_last_4: "",
      })
    ).rejects.toThrow("Only partners can perform this action");
  });

  it("archiveEmployee throws if user is a manager", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ userId: "uid-1", isPartner: false }) as never
    );

    await expect(archiveEmployee("employee-1", { left_on: "2026-03-31" })).rejects.toThrow(
      "Only partners can perform this action"
    );
  });

  it("recordSalaryChange throws if user is a manager", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ userId: "uid-1", isPartner: false }) as never
    );

    await expect(
      recordSalaryChange("employee-1", {
        monthly_salary: 28000,
        effective_from: "2026-04-01",
        reason: "hike",
      })
    ).rejects.toThrow("Only partners can perform this action");
  });

  it("assignEmployeeToOutlet throws if user is a manager", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ userId: "uid-1", isPartner: false }) as never
    );

    await expect(
      assignEmployeeToOutlet({
        employee_id: "550e8400-e29b-41d4-a716-446655440001",
        outlet_id: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).rejects.toThrow("Only partners can perform this action");
  });

  it("removeEmployeeFromOutlet throws if user is a manager", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ userId: "uid-1", isPartner: false }) as never
    );

    await expect(
      removeEmployeeFromOutlet({
        employee_id: "550e8400-e29b-41d4-a716-446655440001",
        outlet_id: "550e8400-e29b-41d4-a716-446655440000",
      })
    ).rejects.toThrow("Only partners can perform this action");
  });
});
