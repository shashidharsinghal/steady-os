import { createClient } from "@/lib/supabase/server";

export async function requirePartner(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data: isPartner } = await supabase.rpc("is_partner", {
    user_id: user.id,
  });

  if (!isPartner) {
    throw new Error("Only partners can perform this action");
  }

  return user.id;
}

export async function getRole(): Promise<"partner" | "manager"> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: isPartner } = await supabase.rpc("is_partner", {
    user_id: user.id,
  });

  return isPartner ? "partner" : "manager";
}
