import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { getRole } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const [
    {
      data: { user },
    },
    role,
  ] = await Promise.all([supabase.auth.getUser(), getRole()]);

  if (!user) {
    redirect("/login");
  }

  // `count: 'exact'` forces a full table scan; `'estimated'` is plenty
  // accurate for a sidebar badge and avoids paying that cost on every nav.
  const [{ data: profile }, { count: outletCount }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("user_id", user.id).single(),
    role === "partner"
      ? supabase
          .from("outlets")
          .select("id", { count: "estimated", head: true })
          .is("archived_at", null)
      : supabase
          .from("outlet_members")
          .select("outlet_id", { count: "estimated", head: true })
          .eq("user_id", user.id),
  ]);

  const userName = profile?.full_name ?? user.email?.split("@")[0] ?? "Stride teammate";
  const userEmail = user.email ?? "Signed in";

  return (
    <AppShell userName={userName} userEmail={userEmail} role={role} outletCount={outletCount ?? 0}>
      {children}
    </AppShell>
  );
}
