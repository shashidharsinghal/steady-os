import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// `cache` deduplicates these calls within a single React render. The dashboard
// previously hit `auth.getUser()` and the `is_partner` RPC twice (once in the
// app layout, once in the page) — each round-trip to Supabase auth was on the
// critical path before any data fetching could start.
const getCachedUserAndRole = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, isPartner: false };
  }

  const { data: isPartner } = await supabase.rpc("is_partner", {
    user_id: user.id,
  });

  return { user, isPartner: Boolean(isPartner) };
});

export async function requirePartner(): Promise<string> {
  const { user, isPartner } = await getCachedUserAndRole();

  if (!user) {
    throw new Error("Not authenticated");
  }

  if (!isPartner) {
    throw new Error("Only partners can perform this action");
  }

  return user.id;
}

export async function getRole(): Promise<"partner" | "manager"> {
  const { user, isPartner } = await getCachedUserAndRole();

  if (!user) throw new Error("Not authenticated");

  return isPartner ? "partner" : "manager";
}
