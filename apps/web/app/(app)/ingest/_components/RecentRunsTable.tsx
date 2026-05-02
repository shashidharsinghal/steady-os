"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import {
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

export function RecentRunsTable({ runs }: { runs: Run[] }) {
  const [triggerFilter, setTriggerFilter] = useState<TriggerFilter>("all");
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

  return (
    <div className="space-y-4">
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

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
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
                    colSpan={5}
                    className="text-muted-foreground py-10 text-center text-sm"
                  >
                    No runs match this filter yet.
                  </TableCell>
                </TableRow>
              ) : (
                visibleRuns.map((run) => (
                  <TableRow key={run.id}>
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
