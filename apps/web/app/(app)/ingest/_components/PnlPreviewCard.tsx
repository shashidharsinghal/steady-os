"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, CalendarDays, Loader2 } from "lucide-react";
import { Button, Card, CardContent } from "@stride-os/ui";
import { toast } from "sonner";
import { updatePnlPreviewPeriod } from "../actions";

type PreviewPayload = {
  report?: {
    periodStart?: string;
    periodEnd?: string;
    entityName?: string | null;
    storeName?: string | null;
    duplicateCount?: number;
    metrics?: {
      grossSalesPaise?: number;
      netSalesPaise?: number;
      cogsPaise?: number;
      grossProfitPaise?: number;
      totalExpensesPaise?: number;
      netProfitPaise?: number;
      invoiceValuePaise?: number;
    };
    expenseLines?: Array<{
      category: string;
      subcategory: string | null;
      label: string;
      amountPaise: number;
      paidByFranchise: boolean;
      notes: string | null;
    }>;
  };
  warnings?: Array<{
    errorCode: string;
    errorMessage: string;
  }>;
};

function formatMoney(paise: number | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format((paise ?? 0) / 100);
}

export function PnlPreviewCard({ runId, payload }: { runId: string; payload: PreviewPayload }) {
  const report = payload.report;
  const [periodStart, setPeriodStart] = useState(report?.periodStart ?? "");
  const [periodEnd, setPeriodEnd] = useState(report?.periodEnd ?? "");
  const [isPending, startTransition] = useTransition();

  if (!report) return null;

  function handleSavePeriod() {
    if (!periodStart || !periodEnd) {
      toast.error("Enter both period dates before saving.");
      return;
    }

    startTransition(async () => {
      try {
        await updatePnlPreviewPeriod(runId, periodStart, periodEnd);
        toast.success("Preview period updated.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not update the preview period."
        );
      }
    });
  }

  const headlineMetrics = [
    { label: "Gross sales", value: formatMoney(report.metrics?.grossSalesPaise) },
    { label: "Net sales", value: formatMoney(report.metrics?.netSalesPaise) },
    { label: "Gross profit", value: formatMoney(report.metrics?.grossProfitPaise) },
    { label: "Net profit", value: formatMoney(report.metrics?.netProfitPaise) },
    { label: "Total expenses", value: formatMoney(report.metrics?.totalExpensesPaise) },
    { label: "Invoice value", value: formatMoney(report.metrics?.invoiceValuePaise) },
  ];

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold">P&L preview</h2>
        <p className="text-muted-foreground text-sm">
          Review the extracted month, summary numbers, and expense hierarchy before commit.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-5 p-5">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Entity</p>
                <p className="text-sm font-medium">{report.entityName || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Store</p>
                <p className="text-sm font-medium">{report.storeName || "—"}</p>
              </div>
              <div className="bg-muted/30 rounded-[18px] border p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                  <CalendarDays className="h-4 w-4" />
                  Reporting period
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground text-xs">Start date</span>
                    <input
                      type="date"
                      value={periodStart}
                      onChange={(event) => setPeriodStart(event.target.value)}
                      className="border-border bg-background w-full rounded-lg border px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="text-muted-foreground text-xs">End date</span>
                    <input
                      type="date"
                      value={periodEnd}
                      onChange={(event) => setPeriodEnd(event.target.value)}
                      className="border-border bg-background w-full rounded-lg border px-3 py-2"
                    />
                  </label>
                </div>
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSavePeriod}
                    disabled={isPending}
                  >
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save period
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {headlineMetrics.map((metric) => (
                <div key={metric.label} className="bg-card rounded-[18px] border p-4">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                    {metric.label}
                  </p>
                  <p className="mt-2 text-lg font-semibold">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>

          {report.duplicateCount ? (
            <div className="rounded-[18px] border border-amber-500/40 bg-amber-500/10 p-4 text-sm">
              This month already exists for the selected outlet. Commit will skip inserts unless you
              purge the older report first.
            </div>
          ) : null}

          {payload.warnings?.length ? (
            <div className="space-y-2 rounded-[18px] border border-amber-500/30 bg-amber-500/5 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Validation warnings
              </div>
              <ul className="space-y-1 text-sm">
                {payload.warnings.map((warning) => (
                  <li key={warning.errorCode}>{warning.errorMessage}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold">Expense lines</h3>
            {report.expenseLines?.length ? (
              <div className="overflow-x-auto rounded-[18px] border">
                <table className="min-w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Category</th>
                      <th className="px-4 py-3 text-left font-medium">Subcategory</th>
                      <th className="px-4 py-3 text-left font-medium">Label</th>
                      <th className="px-4 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.expenseLines.slice(0, 24).map((line, index) => (
                      <tr
                        key={`${line.label}-${index}`}
                        className={line.paidByFranchise ? "bg-sky-500/5" : undefined}
                      >
                        <td className="px-4 py-2">{line.category}</td>
                        <td className="text-muted-foreground px-4 py-2">
                          {line.subcategory || "—"}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span>{line.label}</span>
                            {line.paidByFranchise ? (
                              <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                                Franchise
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right">{formatMoney(line.amountPaise)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-muted-foreground rounded-[18px] border border-dashed py-8 text-center text-sm">
                No expense lines were parsed from this PDF.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
