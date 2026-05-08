import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminTabs } from "../_components/AdminTabs";

export default async function AdminTeamPage() {
  const role = await getRole();
  if (role !== "partner") redirect("/dashboard");
  const supabase = await createClient();
  const [{ data: profiles }, { data: members }] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, full_name, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("outlet_members").select("user_id, outlet_id, role, outlets(name)"),
  ]);

  const memberMap = new Map<string, Array<{ role: string; outletName: string }>>();
  for (const member of (members ?? []) as Array<{
    user_id: string;
    role: string;
    outlets: { name: string } | null;
  }>) {
    const current = memberMap.get(member.user_id) ?? [];
    current.push({ role: member.role, outletName: member.outlets?.name ?? "Outlet" });
    memberMap.set(member.user_id, current);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Team"
        subtitle="Review current access by outlet. Invite and role mutation hooks can attach here next."
      />
      <AdminTabs />
      <div className="border-border bg-card shadow-card overflow-hidden rounded-[24px] border">
        <table className="w-full text-sm">
          <thead className="bg-paper-subtle text-muted-foreground text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
            <tr>
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Role</th>
              <th className="px-5 py-4">Outlets</th>
              <th className="px-5 py-4">Created</th>
            </tr>
          </thead>
          <tbody>
            {(profiles ?? []).map((profile) => {
              const assignments = memberMap.get(profile.user_id) ?? [];
              return (
                <tr key={profile.user_id} className="border-border border-t">
                  <td className="px-5 py-4 font-medium">{profile.full_name ?? profile.user_id}</td>
                  <td className="px-5 py-4">{assignments[0]?.role ?? "partner"}</td>
                  <td className="text-muted-foreground px-5 py-4">
                    {assignments.map((item) => item.outletName).join(", ") || "All outlets"}
                  </td>
                  <td className="px-5 py-4 font-mono text-xs">
                    {new Date(profile.created_at).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
