"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@stride-os/ui";
import { toast } from "sonner";
import { softDeletePnlReports, undoDeletePnlReport } from "../actions";

type ReportCard = {
  id: string;
  outletName: string;
  periodLabel: string;
  salesLabel: string;
  profitLabel: string;
  profitPositive: boolean;
  summaryNote: string;
  purgeScheduledAt: string | null;
  deletedAt: string | null;
};

function daysUntil(iso: string | null) {
  if (!iso) return "—";
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (diff <= 0) return "purges today";
  if (diff === 1) return "purges in 1 day";
  return `purges in ${diff} days`;
}

export function PnlReportsManager({
  activeReports,
  deletedReports,
  canManage,
}: {
  activeReports: ReportCard[];
  deletedReports: ReportCard[];
  canManage: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const [deletedExpanded, setDeletedExpanded] = useState(deletedReports.length > 0);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  function toggleReport(reportId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? Array.from(new Set([...current, reportId]))
        : current.filter((id) => id !== reportId)
    );
  }

  function handleDeleteSelected() {
    startTransition(async () => {
      try {
        await softDeletePnlReports(selectedIds);
        toast.success(
          `${selectedIds.length} report${selectedIds.length === 1 ? "" : "s"} marked for deletion.`
        );
        setSelectedIds([]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete reports.");
      }
    });
  }

  function handleUndo(reportId: string) {
    startTransition(async () => {
      try {
        await undoDeletePnlReport(reportId);
        toast.success("Report restored.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not restore report.");
      }
    });
  }

  return (
    <div className="space-y-8">
      {activeReports.length === 0 ? (
        <div className="text-muted-foreground rounded-[24px] border border-dashed py-16 text-center text-sm">
          No active P&amp;L reports yet.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {activeReports.map((report) => (
            <Link
              key={report.id}
              href={`/pnl/${report.id}`}
              className="bg-card hover:border-primary/35 hover:bg-muted/20 rounded-[24px] border p-5 transition hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-lg font-semibold">{report.periodLabel}</p>
                  <p className="text-muted-foreground text-sm">{report.outletName}</p>
                </div>
                {canManage ? (
                  <input
                    type="checkbox"
                    aria-label={`Select ${report.periodLabel}`}
                    checked={selectedSet.has(report.id)}
                    onChange={(event) => {
                      event.stopPropagation();
                      toggleReport(report.id, event.target.checked);
                    }}
                    onClick={(event) => event.stopPropagation()}
                    className="mt-1 h-4 w-4"
                  />
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="bg-muted/30 rounded-[18px] border p-4">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">Sales</p>
                  <p className="mt-2 text-base font-semibold">{report.salesLabel}</p>
                </div>
                <div className="bg-muted/30 rounded-[18px] border p-4">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                    Bottom line
                  </p>
                  <p
                    className={`mt-2 text-base font-semibold ${
                      report.profitPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {report.profitPositive ? "Net profit" : "Net loss"}: {report.profitLabel}
                  </p>
                </div>
              </div>

              <p className="text-muted-foreground mt-4 text-sm">{report.summaryNote}</p>
            </Link>
          ))}
        </div>
      )}

      <section className="space-y-3">
        <button
          type="button"
          onClick={() => setDeletedExpanded((current) => !current)}
          className="bg-card flex w-full items-center justify-between rounded-[20px] border px-4 py-3 text-left"
        >
          <div>
            <p className="font-semibold">Deleted reports</p>
            <p className="text-muted-foreground text-sm">
              {deletedReports.length === 0
                ? "No reports are waiting for purge."
                : `${deletedReports.length} report${deletedReports.length === 1 ? "" : "s"} in the 30-day undo window.`}
            </p>
          </div>
          <span className="text-muted-foreground text-sm">{deletedExpanded ? "Hide" : "Show"}</span>
        </button>

        {deletedExpanded ? (
          deletedReports.length === 0 ? (
            <div className="text-muted-foreground rounded-[20px] border border-dashed py-10 text-center text-sm">
              No deleted reports.
            </div>
          ) : (
            <div className="space-y-3">
              {deletedReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-card flex flex-wrap items-center justify-between gap-4 rounded-[20px] border p-4"
                >
                  <div className="space-y-1">
                    <p className="font-semibold">{report.periodLabel}</p>
                    <p className="text-muted-foreground text-sm">{report.outletName}</p>
                    <p className="text-muted-foreground text-xs">
                      Deleted{" "}
                      {report.deletedAt
                        ? new Date(report.deletedAt).toLocaleDateString("en-IN")
                        : "—"}{" "}
                      · {daysUntil(report.purgeScheduledAt)}
                    </p>
                  </div>
                  {canManage ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleUndo(report.id)}
                      disabled={isPending}
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Undo
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          )
        ) : null}
      </section>

      {canManage && selectedIds.length > 0 ? (
        <div className="bg-background/95 fixed bottom-6 left-1/2 z-20 flex w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 items-center justify-between gap-4 rounded-[20px] border px-5 py-4 shadow-xl backdrop-blur">
          <div>
            <p className="font-semibold">
              {selectedIds.length} report{selectedIds.length === 1 ? "" : "s"} selected
            </p>
            <p className="text-muted-foreground text-sm">
              Reports stay reversible for 30 days before purge.
            </p>
          </div>
          <Button
            type="button"
            onClick={handleDeleteSelected}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? null : <Trash2 className="mr-2 h-4 w-4" />}
            Mark for deletion
          </Button>
        </div>
      ) : null}
    </div>
  );
}
