"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { FileText, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
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
import type { Tables } from "@stride-os/db";
import type { IngestionStatus } from "@stride-os/ingestion";
import { toast } from "sonner";
import { deleteRuns } from "../actions";
import { RunStatusBadge } from "./RunStatusBadge";
import {
  TRIGGER_FILTERS,
  TriggerSourceBadge,
  triggerSourceFilter,
  type TriggerFilter,
} from "./TriggerSourceBadge";

type Run = Tables<"ingestion_runs">;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function RunHistoryTable({ runs }: { runs: Run[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");
  const [isPending, startTransition] = useTransition();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const visibleRuns = useMemo(
    () =>
      runs.filter((run) => {
        if (triggerFilter === "all") return true;
        return (
          triggerSourceFilter((run as Run & { trigger_source?: string }).trigger_source) ===
          triggerFilter
        );
      }),
    [runs, triggerFilter]
  );
  const allSelected = visibleRuns.length > 0 && selectedIds.length === visibleRuns.length;

  function toggleRun(runId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked ? Array.from(new Set([...current, runId])) : current.filter((id) => id !== runId)
    );
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? visibleRuns.map((run) => run.id) : []);
  }

  function handleDeleteSelected() {
    startTransition(async () => {
      try {
        await deleteRuns(selectedIds);
        router.refresh();
        toast.success(`${selectedIds.length} run${selectedIds.length === 1 ? "" : "s"} deleted.`);
        setSelectedIds([]);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete runs.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TRIGGER_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => {
              setTriggerFilter(filter.value);
              setSelectedIds([]);
            }}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              triggerFilter === filter.value
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <input
                    type="checkbox"
                    aria-label="Select all failed or rolled-back runs"
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
              {visibleRuns.map((run) => (
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
                  <TableCell className="text-muted-foreground text-sm">{run.source_type}</TableCell>
                  <TableCell className="text-sm">
                    {run.rows_parsed != null ? run.rows_parsed.toLocaleString("en-IN") : "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <TriggerSourceBadge
                        source={(run as Run & { trigger_source?: string }).trigger_source}
                      />
                      <RunStatusBadge status={run.status as IngestionStatus} />
                    </div>
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

      {selectedIds.length > 0 ? (
        <div className="bg-background/95 fixed bottom-6 left-1/2 z-20 flex w-[min(720px,calc(100vw-2rem))] -translate-x-1/2 items-center justify-between gap-4 rounded-[20px] border px-5 py-4 shadow-xl backdrop-blur">
          <div>
            <p className="font-semibold">
              {selectedIds.length} run{selectedIds.length === 1 ? "" : "s"} selected
            </p>
            <p className="text-muted-foreground text-sm">
              Failed and rolled-back runs can be permanently removed together.
            </p>
          </div>

          <BulkDeleteHistoryRunsButton
            count={selectedIds.length}
            onConfirm={handleDeleteSelected}
            isPending={isPending}
          />
        </div>
      ) : null}
    </div>
  );
}

function BulkDeleteHistoryRunsButton({
  count,
  onConfirm,
  isPending,
}: {
  count: number;
  onConfirm: () => void;
  isPending: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete selected
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Delete {count} failed ingest run{count === 1 ? "" : "s"}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This removes the run records and uploaded source files permanently. Use this only for
            failed or rolled-back runs you no longer need to inspect.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Deleting…" : "Delete selected"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
