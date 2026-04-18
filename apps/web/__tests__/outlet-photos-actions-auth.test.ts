import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

import { createClient } from "@/lib/supabase/server";
import {
  deleteOutletPhoto,
  reorderPhotos,
  setCoverPhoto,
  uploadOutletPhoto,
} from "@/app/(app)/outlets/[id]/actions";

function makeSupabase({ userId, isPartner }: { userId: string | null; isPartner: boolean }) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }),
    },
    rpc: vi.fn().mockResolvedValue({ data: isPartner, error: null }),
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      delete: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: null, error: null }),
        remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    },
  };
}

describe("outlet photo server actions — auth checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uploadOutletPhoto throws if user is not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ userId: null, isPartner: false }) as never
    );

    await expect(
      uploadOutletPhoto(
        "550e8400-e29b-41d4-a716-446655440000",
        new File(["image"], "storefront.jpg", { type: "image/jpeg" })
      )
    ).rejects.toThrow("Not authenticated");
  });

  it("uploadOutletPhoto throws if user is a manager", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ userId: "uid-1", isPartner: false }) as never
    );

    await expect(
      uploadOutletPhoto(
        "550e8400-e29b-41d4-a716-446655440000",
        new File(["image"], "storefront.jpg", { type: "image/jpeg" })
      )
    ).rejects.toThrow("Only partners can perform this action");
  });

  it("deleteOutletPhoto throws if user is a manager", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ userId: "uid-1", isPartner: false }) as never
    );

    await expect(deleteOutletPhoto("550e8400-e29b-41d4-a716-446655440001")).rejects.toThrow(
      "Only partners can perform this action"
    );
  });

  it("setCoverPhoto throws if user is a manager", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ userId: "uid-1", isPartner: false }) as never
    );

    await expect(setCoverPhoto("550e8400-e29b-41d4-a716-446655440001")).rejects.toThrow(
      "Only partners can perform this action"
    );
  });

  it("reorderPhotos throws if user is a manager", async () => {
    vi.mocked(createClient).mockResolvedValue(
      makeSupabase({ userId: "uid-1", isPartner: false }) as never
    );

    await expect(
      reorderPhotos("550e8400-e29b-41d4-a716-446655440000", [
        "550e8400-e29b-41d4-a716-446655440001",
      ])
    ).rejects.toThrow("Only partners can perform this action");
  });
});
