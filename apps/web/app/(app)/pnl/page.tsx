import Link from "next/link";
import { Button } from "@stride-os/ui";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { PnlReportsManager } from "./_components/PnlReportsManager";

type ReportRow = {
  id: string;
  outlet_id: string;
  period_start: string;
  period_end: string;
  gross_sales_paise: number;
  rent_total_paise: number;
  net_profit_paise: number;
  purge_scheduled_at: string | null;
  deleted_at: string | null;
};

function formatMonthLabel(start: string, end: string) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} · ${startDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${endDate.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

function formatMoney(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function toSummaryNote(report: ReportRow) {
  const rentShare =
    report.gross_sales_paise > 0 ? report.rent_total_paise / report.gross_sales_paise : 0;
  if (rentShare >= 0.3) return "Rent is the dominant fixed cost this month.";
  return "Expense mix looks more balanced across major categories.";
}

export default async function PnlPage() {
  const [supabase, role] = await Promise.all([createClient(), getRole()]);

  const [{ data: activeRows }, { data: deletedRows }, { data: outlets }] = await Promise.all([
    supabase
      .from("active_pnl_reports")
      .select(
        "id, outlet_id, period_start, period_end, gross_sales_paise, rent_total_paise, net_profit_paise, purge_scheduled_at, deleted_at"
      )
      .order("period_start", { ascending: false }),
    supabase
      .from("pnl_reports")
      .select(
        "id, outlet_id, period_start, period_end, gross_sales_paise, rent_total_paise, net_profit_paise, purge_scheduled_at, deleted_at"
      )
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false }),
    supabase.from("outlets").select("id, name"),
  ]);

  const outletMap = new Map(
    ((outlets ?? []) as Array<{ id: string; name: string }>).map((outlet) => [
      outlet.id,
      outlet.name,
    ])
  );
  const mapReport = (row: ReportRow) => ({
    id: row.id,
    outletName: outletMap.get(row.outlet_id) ?? "Outlet",
    periodLabel: formatMonthLabel(row.period_start, row.period_end),
    salesLabel: formatMoney(row.gross_sales_paise),
    profitLabel: formatMoney(Math.abs(row.net_profit_paise)),
    profitPositive: row.net_profit_paise >= 0,
    summaryNote: toSummaryNote(row),
    purgeScheduledAt: row.purge_scheduled_at,
    deletedAt: row.deleted_at,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">P&amp;L reports</h1>
          <p className="text-muted-foreground text-sm">
            Monthly franchise P&amp;L snapshots extracted from uploaded PDFs.
          </p>
        </div>
        {role === "partner" ? (
          <Button asChild>
            <Link href="/ingest">Upload report</Link>
          </Button>
        ) : null}
      </div>

      <PnlReportsManager
        activeReports={((activeRows ?? []) as ReportRow[]).map(mapReport)}
        deletedReports={((deletedRows ?? []) as ReportRow[]).map(mapReport)}
        canManage={role === "partner"}
      />
    </div>
  );
}
