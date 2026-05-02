import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/top-bar";
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
    <div className="flex min-h-screen bg-transparent">
      <Sidebar
        userName={userName}
        userEmail={userEmail}
        role={role}
        outletCount={outletCount ?? 0}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title="Stride OS" subtitle="Operations dashboard for your live portfolio" />
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-[1400px] px-6 py-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
