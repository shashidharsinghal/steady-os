import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, AlertCircle, CheckCircle2, Clock, FileText, XCircle } from "lucide-react";
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
import { createClient } from "@/lib/supabase/server";
import { RunStatusBadge } from "../_components/RunStatusBadge";
import {
  ParseButton,
  CommitButton,
  CancelRunButton,
  RollbackButton,
  DeleteRunButton,
} from "../_components/RunActions";
import type { Tables } from "@stride-os/db";
import type { IngestionStatus } from "@stride-os/ingestion";

type Run = Tables<"ingestion_runs">;
type RowError = Tables<"ingestion_row_errors">;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function RunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const supabase = await createClient();

  const [{ data: run }, { data: rowErrors }] = await Promise.all([
    supabase.from("ingestion_runs").select("*").eq("id", runId).single(),
    supabase
      .from("ingestion_row_errors")
      .select("*")
      .eq("run_id", runId)
      .order("row_number", { ascending: true })
      .limit(100),
  ]);

  if (!run) notFound();

  const typedRun = run as Run;
  const status = typedRun.status as IngestionStatus;
  const errors = (rowErrors ?? []) as RowError[];
  const errorDetails = typedRun.error_details as { message?: string } | null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <Link
          href="/ingest"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to ingest
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{typedRun.file_name}</h1>
          <RunStatusBadge status={status} />
        </div>
      </div>

      {/* Status panel */}
      <StatusPanel run={typedRun} status={status} errorMessage={errorDetails?.message} />

      {/* Row errors */}
      {errors.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <AlertCircle className="text-destructive h-4 w-4" />
            {errors.length} row error{errors.length !== 1 ? "s" : ""}
          </h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Row</TableHead>
                    <TableHead>Error</TableHead>
                    <TableHead>Field</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {errors.map((err) => (
                    <TableRow key={err.id}>
                      <TableCell className="text-muted-foreground text-sm">
                        {err.row_number}
                      </TableCell>
                      <TableCell className="text-sm">{err.error_message}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {err.field_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        {err.raw_value ? (
                          <code className="bg-muted rounded px-1 py-0.5 text-xs">
                            {err.raw_value}
                          </code>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}

      {/* File metadata */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">File details</h2>
        <Card>
          <CardContent className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
            <MetaField label="File name" value={typedRun.file_name} />
            <MetaField label="Size" value={formatBytes(typedRun.file_size_bytes)} />
            <MetaField label="Source type" value={typedRun.source_type} />
            <MetaField
              label="Detection"
              value={`${typedRun.detection_method}${typedRun.detection_confidence != null ? ` (${Math.round(typedRun.detection_confidence * 100)}%)` : ""}`}
            />
            <MetaField label="Uploaded" value={formatDate(typedRun.uploaded_at)} />
            {typedRun.parsing_completed_at && (
              <MetaField label="Parsed" value={formatDate(typedRun.parsing_completed_at)} />
            )}
            {typedRun.committed_at && (
              <MetaField label="Committed" value={formatDate(typedRun.committed_at)} />
            )}
            {typedRun.rolled_back_at && (
              <MetaField label="Rolled back" value={formatDate(typedRun.rolled_back_at)} />
            )}
            {typedRun.rollback_reason && (
              <MetaField label="Rollback reason" value={typedRun.rollback_reason} />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Count summary */}
      {typedRun.rows_seen != null && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Row summary</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <CountCard label="Seen" value={typedRun.rows_seen} />
            <CountCard label="Parsed" value={typedRun.rows_parsed} color="green" />
            <CountCard label="Duplicates" value={typedRun.rows_duplicate} color="amber" />
            <CountCard label="Errors" value={typedRun.rows_errored} color="red" />
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Status panel ─────────────────────────────────────────────────────────────

function StatusPanel({
  run,
  status,
  errorMessage,
}: {
  run: Run;
  status: IngestionStatus;
  errorMessage?: string;
}) {
  if (status === "uploaded") {
    return (
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="text-muted-foreground h-4 w-4" />
              <p className="text-sm font-medium">Ready to parse</p>
            </div>
            <p className="text-muted-foreground text-sm">
              Detected as <span className="font-medium">{run.source_type}</span>. Parse to preview
              the data before committing.
            </p>
          </div>
          <ParseButton run={run} />
        </CardContent>
      </Card>
    );
  }

  if (status === "parsing") {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 animate-pulse text-amber-500" />
            <p className="text-sm font-medium">Parsing in progress…</p>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">Refresh to check the latest status.</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "preview_ready") {
    return (
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-violet-500" />
              <p className="text-sm font-medium">Preview ready — review before committing</p>
            </div>
            {run.rows_to_insert != null && (
              <p className="text-muted-foreground text-sm">
                {run.rows_to_insert.toLocaleString()} new rows will be written
                {run.rows_duplicate ? `, ${run.rows_duplicate} duplicates skipped` : ""}
                {run.rows_errored ? `, ${run.rows_errored} row errors` : ""}.
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <CommitButton run={run} />
            <CancelRunButton run={run} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "committing") {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 animate-pulse text-amber-500" />
            <p className="text-sm font-medium">Committing to database…</p>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">Refresh to check the latest status.</p>
        </CardContent>
      </Card>
    );
  }

  if (status === "committed") {
    return (
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <p className="text-sm font-medium">Committed</p>
            </div>
            {run.rows_to_insert != null && (
              <p className="text-muted-foreground text-sm">
                {run.rows_to_insert.toLocaleString()} rows written to the database.
              </p>
            )}
          </div>
          <div className="border-destructive/20 rounded-[14px] border p-4">
            <p className="text-destructive mb-3 text-sm font-medium">Danger zone</p>
            <p className="text-muted-foreground mb-4 text-sm">
              Rolling back will permanently delete all data written by this run.
            </p>
            <RollbackButton run={run} />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status === "rolled_back") {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2">
            <XCircle className="text-muted-foreground h-4 w-4" />
            <p className="text-sm font-medium">Rolled back</p>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            All data from this run has been removed.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (status === "failed") {
    return (
      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <XCircle className="text-destructive h-4 w-4" />
              <p className="text-sm font-medium">Failed</p>
            </div>
            {errorMessage && <p className="text-muted-foreground text-sm">{errorMessage}</p>}
          </div>
          <div className="flex gap-3">
            <ParseButton run={run} />
            <DeleteRunButton run={run} />
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MetaField({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function CountCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | null;
  color?: "green" | "amber" | "red";
}) {
  const colorClass =
    color === "green"
      ? "text-emerald-600 dark:text-emerald-400"
      : color === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : color === "red"
          ? "text-red-600 dark:text-red-400"
          : "";

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className={`mt-1 text-2xl font-semibold ${colorClass}`}>
          {value != null ? value.toLocaleString() : "—"}
        </p>
      </CardContent>
    </Card>
  );
}
