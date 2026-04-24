"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@stride-os/ui";
import { FileText, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@stride-os/db";
import type { IngestionStatus } from "@stride-os/ingestion";
import { getDeleteImpact, softDeleteRun, undoDeleteRun, type DeleteImpact } from "../actions";
import { RunStatusBadge } from "./RunStatusBadge";

type Run = Tables<"ingestion_runs">;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysUntil(iso: string | null) {
  if (!iso) return "—";
  const diff = Math.ceil((new Date(iso).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (diff <= 0) return "purges today";
  if (diff === 1) return "purges in 1 day";
  return `purges in ${diff} days`;
}

export function SoftDeleteRunsManager({
  committedRuns,
  deletedRuns,
  purgedRuns,
}: {
  committedRuns: Run[];
  deletedRuns: Run[];
  purgedRuns: Run[];
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [impact, setImpact] = useState<DeleteImpact | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [undoPendingId, setUndoPendingId] = useState<string | null>(null);
  const [deletedExpanded, setDeletedExpanded] = useState(deletedRuns.length > 0);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    let ignore = false;

    if (selectedIds.length === 0) {
      setImpact(null);
      return;
    }

    void getDeleteImpact(selectedIds)
      .then((result) => {
        if (!ignore) setImpact(result);
      })
      .catch((error) => {
        if (!ignore) {
          toast.error(error instanceof Error ? error.message : "Could not load delete impact.");
        }
      });

    return () => {
      ignore = true;
    };
  }, [selectedIds]);

  function toggleRun(runId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked ? Array.from(new Set([...current, runId])) : current.filter((id) => id !== runId)
    );
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? committedRuns.map((run) => run.id) : []);
  }

  function handleConfirmDelete() {
    startTransition(async () => {
      try {
        await Promise.all(selectedIds.map((runId) => softDeleteRun(runId)));
        toast.success(
          `${selectedIds.length} run${selectedIds.length === 1 ? "" : "s"} marked for deletion.`
        );
        setSelectedIds([]);
        setDialogOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not mark runs for deletion.");
      }
    });
  }

  function handleUndo(runId: string) {
    setUndoPendingId(runId);
    startTransition(async () => {
      try {
        await undoDeleteRun(runId);
        toast.success("Run restored.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not restore run.");
      } finally {
        setUndoPendingId(null);
      }
    });
  }

  const allSelected = committedRuns.length > 0 && selectedIds.length === committedRuns.length;

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Committed runs</h2>
          <p className="text-muted-foreground text-sm">
            Soft-delete is reversible for 30 days. Live analytics exclude deleted runs immediately.
          </p>
        </div>

        {committedRuns.length === 0 ? (
          <div className="text-muted-foreground rounded-[20px] border border-dashed py-12 text-center text-sm">
            No committed ingestion runs yet.
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <input
                        type="checkbox"
                        aria-label="Select all committed runs"
                        checked={allSelected}
                        onChange={(event) => toggleAll(event.target.checked)}
                      />
                    </TableHead>
                    <TableHead>File</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Rows</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {committedRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          aria-label={`Select ${run.file_name}`}
                          checked={selectedSet.has(run.id)}
                          onChange={(event) => toggleRun(run.id, event.target.checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Link href={`/ingest/${run.id}`} className="flex items-center gap-2">
                          <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                          <span className="font-medium">{run.file_name}</span>
                          <span className="text-muted-foreground text-xs">
                            {formatBytes(run.file_size_bytes)}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {run.source_type}
                      </TableCell>
                      <TableCell className="text-sm">
                        {run.rows_parsed != null ? run.rows_parsed.toLocaleString("en-IN") : "—"}
                      </TableCell>
                      <TableCell>
                        <RunStatusBadge status={run.status as IngestionStatus} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(run.uploaded_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="space-y-3">
        <button
          type="button"
          className="bg-card flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left"
          onClick={() => setDeletedExpanded((current) => !current)}
        >
          <div>
            <p className="font-semibold">Deleted runs</p>
            <p className="text-muted-foreground text-sm">
              {deletedRuns.length === 0
                ? "No runs are waiting for purge."
                : `${deletedRuns.length} run${deletedRuns.length === 1 ? "" : "s"} in the 30-day undo window.`}
            </p>
          </div>
          <span className="text-muted-foreground text-sm">{deletedExpanded ? "Hide" : "Show"}</span>
        </button>

        {deletedExpanded ? (
          deletedRuns.length === 0 ? (
            <div className="text-muted-foreground rounded-[20px] border border-dashed py-10 text-center text-sm">
              No deleted runs.
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Deleted</TableHead>
                      <TableHead>Purge date</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deletedRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium">{run.file_name}</p>
                            <p className="text-muted-foreground text-xs">{run.source_type}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(run.deleted_at)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-sm">{formatDate(run.purge_scheduled_at)}</p>
                            <p className="text-muted-foreground text-xs">
                              {daysUntil(run.purge_scheduled_at)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleUndo(run.id)}
                            disabled={isPending && undoPendingId === run.id}
                          >
                            {isPending && undoPendingId === run.id ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <RotateCcw className="mr-2 h-4 w-4" />
                            )}
                            Undo
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        ) : null}
      </section>

      {purgedRuns.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Purged</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>File</TableHead>
                    <TableHead>Deleted</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purgedRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <div className="space-y-0.5">
                          <p className="font-medium">{run.file_name}</p>
                          <p className="text-muted-foreground text-xs">{run.source_type}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatDate(run.deleted_at)}
                      </TableCell>
                      <TableCell>
                        <RunStatusBadge status={run.status as IngestionStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark selected runs for deletion?</AlertDialogTitle>
            <AlertDialogDescription>
              Data stays live for 30 days. Undo anytime before the scheduled purge.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 text-sm">
            <div className="bg-background/60 rounded-[16px] border p-4">
              <p className="font-medium">Exact impact</p>
              <div className="text-muted-foreground mt-2 space-y-1">
                <p>{impact?.totals.salesOrders.toLocaleString("en-IN") ?? 0} orders</p>
                <p>
                  {impact?.totals.paymentTransactions.toLocaleString("en-IN") ?? 0} payment
                  transactions
                </p>
                <p>
                  {impact?.totals.aggregatorPayouts.toLocaleString("en-IN") ?? 0} aggregator payouts
                </p>
              </div>
            </div>

            <div className="bg-background/60 rounded-[16px] border p-4">
              <p className="font-medium">Customer impact</p>
              <div className="text-muted-foreground mt-2 space-y-1">
                <p>
                  {impact?.customerImpact.keptCustomers.toLocaleString("en-IN") ?? 0} customers will
                  be kept because they have data from other runs
                </p>
                <p>
                  {impact?.customerImpact.removedCustomers.toLocaleString("en-IN") ?? 0} customers
                  have no other remaining data and will be removed when purged
                </p>
              </div>
            </div>

            {impact?.runs.length ? (
              <div className="bg-background/60 rounded-[16px] border p-4">
                <p className="font-medium">Per-run breakdown</p>
                <div className="mt-2 space-y-2">
                  {impact.runs.map((run) => (
                    <div
                      key={run.runId}
                      className="text-muted-foreground flex items-center justify-between gap-4"
                    >
                      <span className="min-w-0 truncate">{run.fileName}</span>
                      <span className="shrink-0 text-xs">
                        {run.salesOrders} orders · {run.paymentTransactions} txns ·{" "}
                        {run.aggregatorPayouts} payouts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isPending || selectedIds.length === 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? "Marking…" : "Mark for deletion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedIds.length > 0 ? (
        <div className="bg-card sticky bottom-4 z-20 rounded-[20px] border p-4 shadow-lg">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <p className="font-semibold">
                {selectedIds.length} run{selectedIds.length === 1 ? "" : "s"} selected
              </p>
              <p className="text-muted-foreground text-sm">
                Approx. {impact?.totals.salesOrders.toLocaleString("en-IN") ?? "…"} orders,{" "}
                {impact?.totals.paymentTransactions.toLocaleString("en-IN") ?? "…"} transactions
              </p>
            </div>
            <Button type="button" variant="destructive" onClick={() => setDialogOpen(true)}>
              Delete selected
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
