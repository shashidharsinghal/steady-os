import Link from "next/link";
import { redirect } from "next/navigation";
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
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { UploadDropzone } from "./_components/UploadDropzone";
import { RunStatusBadge } from "./_components/RunStatusBadge";
import type { Tables } from "@stride-os/db";
import type { IngestionStatus } from "@stride-os/ingestion";

type Run = Tables<"ingestion_runs">;
type Outlet = Pick<Tables<"outlets">, "id" | "name" | "brand">;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const ACTIVE_STATUSES: IngestionStatus[] = ["uploaded", "parsing", "preview_ready", "committing"];
const HISTORY_STATUSES: IngestionStatus[] = ["committed", "failed", "rolled_back"];

export default async function IngestPage() {
  const [supabase, role] = await Promise.all([createClient(), getRole()]);

  if (role !== "partner") redirect("/dashboard");

  const [{ data: activeRuns }, { data: historyRuns }, { data: outlets }] = await Promise.all([
    supabase
      .from("ingestion_runs")
      .select("*")
      .in("status", ACTIVE_STATUSES)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("ingestion_runs")
      .select("*")
      .in("status", HISTORY_STATUSES)
      .order("uploaded_at", { ascending: false })
      .limit(50),
    supabase.from("outlets").select("id, name, brand").is("archived_at", null).order("name"),
  ]);

  const active = (activeRuns ?? []) as Run[];
  const history = (historyRuns ?? []) as Run[];
  const outletOptions = (outlets ?? []) as Outlet[];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ingest</h1>
        <p className="text-muted-foreground text-sm">
          Upload Petpooja, Pine Labs, and aggregator reports to import sales data.
        </p>
      </div>

      <UploadDropzone outlets={outletOptions} />

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Needs attention</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {active.map((run) => (
              <RunCard key={run.id} run={run} />
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">History</h2>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed py-12 text-center">
            <FileText className="text-muted-foreground/40 mb-3 h-10 w-10" />
            <p className="text-muted-foreground text-sm">No ingestion runs yet.</p>
          </div>
        ) : (
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
                  {history.map((run) => (
                    <TableRow key={run.id} className="cursor-pointer">
                      <TableCell>
                        <Link href={`/ingest/${run.id}`} className="flex items-center gap-2">
                          <FileText className="text-muted-foreground h-4 w-4 shrink-0" />
                          <span className="font-medium">{run.file_name}</span>
                          <span className="text-muted-foreground text-xs">
                            {formatBytes(run.file_size_bytes)}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">{run.source_type}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {run.rows_parsed != null ? run.rows_parsed.toLocaleString() : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <RunStatusBadge status={run.status as IngestionStatus} />
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-sm">
                          {formatDate(run.uploaded_at)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function RunCard({ run }: { run: Run }) {
  const status = run.status as IngestionStatus;
  return (
    <Link href={`/ingest/${run.id}`}>
      <Card className="hover:border-primary/35 hover:bg-muted/30 group cursor-pointer border shadow-none transition-all duration-200 hover:-translate-y-0.5">
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 truncate text-sm font-medium">{run.file_name}</p>
            <RunStatusBadge status={status} />
          </div>
          <p className="text-muted-foreground text-xs">{run.source_type}</p>
          {run.rows_parsed != null && (
            <p className="text-muted-foreground text-xs">
              {run.rows_parsed.toLocaleString()} rows parsed
              {run.rows_errored ? ` · ${run.rows_errored} errors` : ""}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
