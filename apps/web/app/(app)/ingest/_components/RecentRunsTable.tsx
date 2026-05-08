"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Archive, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
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
import { RunStatusBadge } from "./RunStatusBadge";
import {
  TRIGGER_FILTERS,
  TriggerSourceBadge,
  triggerSourceFilter,
  type TriggerFilter,
} from "./TriggerSourceBadge";
import { archiveRuns, deleteRuns, unarchiveRuns } from "../actions";

type Run = Tables<"ingestion_runs">;

function formatRows(value: number | null) {
  return value == null ? "—" : value.toLocaleString("en-IN");
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

export function RecentRunsTable({ runs, archived = false }: { runs: Run[]; archived?: boolean }) {
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
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
  const selected = Array.from(selectedIds);

  function toggle(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function runBulk(kind: "archive" | "unarchive" | "delete") {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      try {
        if (kind === "archive") await archiveRuns(ids);
        if (kind === "unarchive") await unarchiveRuns(ids);
        if (kind === "delete") await deleteRuns(ids);
        toast.success(
          `${kind === "delete" ? "Deleted" : kind === "archive" ? "Archived" : "Restored"} ${ids.length} run${ids.length === 1 ? "" : "s"}.`
        );
        setSelectedIds(new Set());
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Bulk action failed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {TRIGGER_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setTriggerFilter(filter.value)}
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
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => runBulk(archived ? "unarchive" : "archive")}
              disabled={isPending}
            >
              <Archive className="h-4 w-4" />
              {archived ? "Restore" : "Archive"} ({selected.length})
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => runBulk("delete")}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" />
              Delete ({selected.length})
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </Button>
          </div>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    checked={
                      visibleRuns.length > 0 && visibleRuns.every((run) => selectedIds.has(run.id))
                    }
                    onChange={(event) =>
                      setSelectedIds(
                        event.target.checked ? new Set(visibleRuns.map((run) => run.id)) : new Set()
                      )
                    }
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
              {visibleRuns.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-10 text-center text-sm"
                  >
                    No runs match this filter yet.
                  </TableCell>
                </TableRow>
              ) : (
                visibleRuns.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(run.id)}
                        onChange={() => toggle(run.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Link href={`/ingest/${run.id}`} className="flex items-center gap-2">
                        <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                        <span className="font-medium">{run.file_name}</span>
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {run.source_type}
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatRows(run.rows_to_insert ?? run.rows_parsed ?? null)}
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
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
