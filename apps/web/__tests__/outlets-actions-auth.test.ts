import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/cache before importing actions
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Mock the supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import { createOutlet, updateOutlet, archiveOutlet } from "@/app/(app)/outlets/actions";

function makeSupabase({ userId, isPartner }: { userId: string | null; isPartner: boolean }) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isPartner, error: null }),
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "new-id" }, error: null }),
    }),
  };
}

describe("outlet server actions — auth checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createOutlet", () => {
    it("throws if user is not authenticated", async () => {
      vi.mocked(createClient).mockResolvedValue(
        makeSupabase({ userId: null, isPartner: false }) as never
      );
      await expect(createOutlet({ name: "Test", brand: "Other", status: "setup" })).rejects.toThrow(
        "Not authenticated"
      );
    });

    it("throws if user is a manager (not partner)", async () => {
      vi.mocked(createClient).mockResolvedValue(
        makeSupabase({ userId: "uid-1", isPartner: false }) as never
      );
      await expect(createOutlet({ name: "Test", brand: "Other", status: "setup" })).rejects.toThrow(
        "Only partners can perform this action"
      );
    });

    it("does not throw for a partner", async () => {
      vi.mocked(createClient).mockResolvedValue(
        makeSupabase({ userId: "uid-1", isPartner: true }) as never
      );
      await expect(
        createOutlet({ name: "Test", brand: "Other", status: "setup" })
      ).resolves.toBeDefined();
    });
  });

  describe("updateOutlet", () => {
    it("throws if user is not authenticated", async () => {
      vi.mocked(createClient).mockResolvedValue(
        makeSupabase({ userId: null, isPartner: false }) as never
      );
      await expect(
        updateOutlet("some-id", { name: "Test", brand: "Other", status: "setup" })
      ).rejects.toThrow("Not authenticated");
    });

    it("throws if user is a manager", async () => {
      vi.mocked(createClient).mockResolvedValue(
        makeSupabase({ userId: "uid-1", isPartner: false }) as never
      );
      await expect(
        updateOutlet("some-id", { name: "Test", brand: "Other", status: "setup" })
      ).rejects.toThrow("Only partners can perform this action");
    });
  });

  describe("archiveOutlet", () => {
    it("throws if user is not authenticated", async () => {
      vi.mocked(createClient).mockResolvedValue(
        makeSupabase({ userId: null, isPartner: false }) as never
      );
      await expect(archiveOutlet("some-id")).rejects.toThrow("Not authenticated");
    });

    it("throws if user is a manager", async () => {
      vi.mocked(createClient).mockResolvedValue(
        makeSupabase({ userId: "uid-1", isPartner: false }) as never
      );
      await expect(archiveOutlet("some-id")).rejects.toThrow(
        "Only partners can perform this action"
      );
    });
  });
});
