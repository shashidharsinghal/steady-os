import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select<"full_name", { full_name: string | null }>("full_name")
    .eq("user_id", user?.id ?? "")
    .single();

  const displayName = profile?.full_name ?? user?.email ?? "there";

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">Hello, {displayName}</h1>
      <p className="text-muted-foreground">Welcome to Stride OS. More coming soon.</p>
    </div>
  );
}
