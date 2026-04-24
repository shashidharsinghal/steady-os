import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { Button, Card, CardContent } from "@stride-os/ui";
import { createClient } from "@/lib/supabase/server";

type Report = {
  id: string;
  outlet_id: string;
  period_start: string;
  period_end: string;
  entity_name: string | null;
  store_name: string | null;
  gross_sales_paise: number;
  trade_discount_paise: number;
  net_sales_paise: number;
  cogs_paise: number;
  gross_profit_paise: number;
  total_expenses_paise: number;
  net_profit_paise: number;
  gst_amount_paise: number;
  invoice_value_paise: number;
  ingestion_run_id: string;
};

type ExpenseLine = {
  id: string;
  category: string;
  subcategory: string | null;
  label: string;
  amount_paise: number;
  paid_by_franchise: boolean;
  notes: string | null;
};

function formatMoney(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paise / 100);
}

function formatSignedAmount(paise: number) {
  const value = formatMoney(Math.abs(paise));
  return paise < 0 ? `-${value}` : value;
}

function formatPeriod(start: string, end: string) {
  return `${new Date(start).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} – ${new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
}

export default async function PnlDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: report } = await supabase
    .from("active_pnl_reports")
    .select("*")
    .eq("id", id)
    .single();

  if (!report) notFound();

  const typedReport = report as Report;
  const [{ data: outlet }, { data: lines }, { data: previousReport }, { data: run }] =
    await Promise.all([
      supabase.from("outlets").select("name").eq("id", typedReport.outlet_id).single(),
      supabase
        .from("pnl_expense_lines")
        .select("id, category, subcategory, label, amount_paise, paid_by_franchise, notes")
        .eq("report_id", typedReport.id)
        .order("amount_paise", { ascending: false }),
      supabase
        .from("active_pnl_reports")
        .select(
          "id, period_start, period_end, gross_sales_paise, total_expenses_paise, net_profit_paise"
        )
        .eq("outlet_id", typedReport.outlet_id)
        .lt("period_start", typedReport.period_start)
        .order("period_start", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("ingestion_runs")
        .select("file_storage_path")
        .eq("id", typedReport.ingestion_run_id)
        .single(),
    ]);

  const signedUrl = run?.file_storage_path
    ? (
        await supabase.storage
          .from("ingestion-uploads")
          .createSignedUrl(run.file_storage_path, 60 * 60)
      ).data?.signedUrl
    : null;

  const expenseLines = (lines ?? []) as ExpenseLine[];
  const expenseTotals = new Map<string, number>();
  expenseLines.forEach((line) => {
    expenseTotals.set(line.category, (expenseTotals.get(line.category) ?? 0) + line.amount_paise);
  });

  const categoryBars = Array.from(expenseTotals.entries())
    .sort((left, right) => right[1] - left[1])
    .slice(0, 8);

  const grossMargin =
    typedReport.net_sales_paise > 0
      ? (typedReport.gross_profit_paise / typedReport.net_sales_paise) * 100
      : 0;

  const previous = previousReport as {
    period_start: string;
    period_end: string;
    gross_sales_paise: number;
    total_expenses_paise: number;
    net_profit_paise: number;
  } | null;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/pnl"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to P&amp;L
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {formatPeriod(typedReport.period_start, typedReport.period_end)}
            </h1>
            <p className="text-muted-foreground text-sm">
              {typedReport.store_name || outlet?.name || "Outlet"} ·{" "}
              {typedReport.entity_name || "Franchise entity"}
            </p>
          </div>
          {signedUrl ? (
            <Button asChild variant="outline">
              <a href={signedUrl} target="_blank" rel="noreferrer">
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Trading account</h2>
              <div className="text-right">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                  Gross margin
                </p>
                <p className="text-lg font-semibold">{grossMargin.toFixed(1)}%</p>
              </div>
            </div>
            <div className="space-y-3 text-sm">
              {[
                ["Gross sales", typedReport.gross_sales_paise],
                ["Trade discount", typedReport.trade_discount_paise],
                ["Net sales", typedReport.net_sales_paise],
                ["COGS", typedReport.cogs_paise],
                ["Gross profit", typedReport.gross_profit_paise],
              ].map(([label, amount]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between rounded-[16px] border px-4 py-3"
                >
                  <span>{label}</span>
                  <span className="font-semibold">{formatSignedAmount(Number(amount))}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="font-semibold">Bottom line</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="bg-muted/30 rounded-[18px] border p-4">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                  Net profit
                </p>
                <p
                  className={`mt-2 text-lg font-semibold ${typedReport.net_profit_paise >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}
                >
                  {formatSignedAmount(typedReport.net_profit_paise)}
                </p>
              </div>
              <div className="bg-muted/30 rounded-[18px] border p-4">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                  GST impact
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {formatSignedAmount(typedReport.gst_amount_paise)}
                </p>
              </div>
              <div className="bg-muted/30 rounded-[18px] border p-4">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                  Invoice value
                </p>
                <p className="mt-2 text-lg font-semibold">
                  {formatSignedAmount(typedReport.invoice_value_paise)}
                </p>
              </div>
            </div>

            {previous ? (
              <div className="bg-card rounded-[18px] border p-4">
                <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                  vs{" "}
                  {new Date(previous.period_start).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-muted-foreground">Revenue delta</p>
                    <p className="font-semibold">
                      {formatSignedAmount(
                        typedReport.gross_sales_paise - previous.gross_sales_paise
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expense delta</p>
                    <p className="font-semibold">
                      {formatSignedAmount(
                        typedReport.total_expenses_paise - previous.total_expenses_paise
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Profit delta</p>
                    <p className="font-semibold">
                      {formatSignedAmount(typedReport.net_profit_paise - previous.net_profit_paise)}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-semibold">Expense breakdown</h2>
          {categoryBars.length > 0 ? (
            <div className="space-y-3">
              {categoryBars.map(([category, amount]) => {
                const shareOfSales =
                  typedReport.gross_sales_paise > 0
                    ? (amount / typedReport.gross_sales_paise) * 100
                    : 0;
                return (
                  <div key={category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{category}</span>
                      <span className="font-medium">
                        {formatMoney(amount)} · {shareOfSales.toFixed(1)}% of sales
                      </span>
                    </div>
                    <div className="bg-muted h-3 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${Math.min(100, shareOfSales)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-muted-foreground rounded-[18px] border border-dashed py-8 text-center text-sm">
              No expense categories are available for this report.
            </div>
          )}

          <div className="overflow-x-auto rounded-[18px] border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Category</th>
                  <th className="px-4 py-3 text-left font-medium">Label</th>
                  <th className="px-4 py-3 text-right font-medium">Amount</th>
                  <th className="px-4 py-3 text-right font-medium">% of sales</th>
                  <th className="px-4 py-3 text-right font-medium">% of expenses</th>
                </tr>
              </thead>
              <tbody>
                {expenseLines.map((line) => {
                  const pctOfSales =
                    typedReport.gross_sales_paise > 0
                      ? (line.amount_paise / typedReport.gross_sales_paise) * 100
                      : 0;
                  const pctOfExpenses =
                    typedReport.total_expenses_paise > 0
                      ? (line.amount_paise / typedReport.total_expenses_paise) * 100
                      : 0;
                  return (
                    <tr
                      key={line.id}
                      className={
                        line.paid_by_franchise ? "text-muted-foreground bg-sky-500/5" : undefined
                      }
                    >
                      <td className="px-4 py-2">{line.category}</td>
                      <td className="px-4 py-2">{line.label}</td>
                      <td className="px-4 py-2 text-right">
                        {formatSignedAmount(line.amount_paise)}
                      </td>
                      <td className="px-4 py-2 text-right">{pctOfSales.toFixed(1)}%</td>
                      <td className="px-4 py-2 text-right">{pctOfExpenses.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
