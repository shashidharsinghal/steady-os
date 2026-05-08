import { redirect } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { getRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminTabs } from "../_components/AdminTabs";

export default async function AdminActivityPage() {
  const role = await getRole();
  if (role !== "partner") redirect("/dashboard");
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Activity"
        subtitle="Last 100 recorded admin and data mutations."
      />
      <AdminTabs />
      <div className="border-border bg-card shadow-card overflow-hidden rounded-[24px] border">
        <table className="w-full text-sm">
          <thead className="bg-paper-subtle text-muted-foreground text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
            <tr>
              <th className="px-5 py-4">Time</th>
              <th className="px-5 py-4">Action</th>
              <th className="px-5 py-4">Target</th>
              <th className="px-5 py-4">Details</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted-foreground px-5 py-8 text-center">
                  No activity recorded yet.
                </td>
              </tr>
            ) : null}
            {(rows ?? []).map((row) => (
              <tr key={row.id} className="border-border border-t">
                <td className="px-5 py-4 font-mono text-xs">
                  {new Date(row.created_at).toLocaleString("en-IN")}
                </td>
                <td className="px-5 py-4 font-medium">{row.action}</td>
                <td className="text-muted-foreground px-5 py-4">{row.target_type ?? "—"}</td>
                <td className="text-muted-foreground px-5 py-4 text-xs">
                  {row.details ? JSON.stringify(row.details) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
