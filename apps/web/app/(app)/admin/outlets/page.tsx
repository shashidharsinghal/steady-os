import { redirect } from "next/navigation";
import { formatINRCompact } from "@stride-os/shared";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { AdminTabs } from "../_components/AdminTabs";
import { InvestmentForm } from "./_components/InvestmentForm";
import { getInvestmentRecovery } from "@/lib/outlet-investments";

export default async function AdminOutletsPage() {
  const role = await getRole();
  if (role !== "partner") {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: outlets } = await supabase
    .from("outlets")
    .select(
      "id, name, brand, address, phone, status, petpooja_restaurant_id, opened_on, total_invested_paise, projected_breakeven_date"
    )
    .is("archived_at", null)
    .order("name");

  const recoveryByOutlet = await Promise.all(
    (outlets ?? []).map(async (outlet) => ({
      outletId: outlet.id,
      recovery: await getInvestmentRecovery(outlet.id),
    }))
  );
  const recoveryMap = new Map(recoveryByOutlet.map((row) => [row.outletId, row.recovery]));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Outlet configuration"
        subtitle="Investment tracking ships first here so the dashboard can pick up recovery pace as soon as an outlet is configured."
      />

      <AdminTabs />

      <div className="space-y-5">
        {(outlets ?? []).map((outlet) => {
          const recovery = recoveryMap.get(outlet.id);
          if (!recovery) return null;

          return (
            <section
              key={outlet.id}
              className="border-border bg-card shadow-card rounded-[28px] border p-6"
            >
              <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-5">
                  <div>
                    <p className="section-card-title">Outlet</p>
                    <h2 className="mt-2 text-[1.9rem] font-semibold tracking-tight">
                      {outlet.name}
                    </h2>
                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                      {outlet.brand} · {outlet.status}
                      {outlet.address ? ` · ${outlet.address}` : ""}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <ConfigStat label="Phone" value={outlet.phone ?? "—"} />
                    <ConfigStat
                      label="Petpooja mapping"
                      value={outlet.petpooja_restaurant_id ?? "Not set"}
                    />
                    <ConfigStat
                      label="Current recovered"
                      value={formatINRCompact(recovery.recoveredPaise / 100)}
                    />
                    <ConfigStat
                      label="Break-even pace"
                      value={
                        recovery.monthsToBreakEven != null
                          ? `${Math.ceil(recovery.monthsToBreakEven)} months`
                          : recovery.last30dProfitPaise > 0
                            ? "Needs more history"
                            : "No profit history"
                      }
                    />
                  </div>
                </div>

                <div className="border-border bg-background/65 rounded-[22px] border p-5">
                  <div className="mb-5">
                    <p className="section-card-title">Investment tracking</p>
                    <p className="text-muted-foreground mt-2 text-sm leading-6">
                      Save the opening date, total invested amount, and an optional target date. The
                      dashboard will immediately use this for the recovery card.
                    </p>
                  </div>
                  <InvestmentForm
                    outletId={outlet.id}
                    outletName={outlet.name}
                    defaultValues={{
                      opened_on: outlet.opened_on ?? "",
                      total_invested_rupees: outlet.total_invested_paise
                        ? outlet.total_invested_paise / 100
                        : 0,
                      projected_breakeven_date: outlet.projected_breakeven_date ?? "",
                    }}
                    recovery={recovery}
                  />
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ConfigStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border bg-background/75 rounded-[18px] border p-4">
      <p className="stat-label">{label}</p>
      <p className="mt-2 text-sm font-semibold">{value}</p>
    </div>
  );
}
