import Link from "next/link";
import { redirect } from "next/navigation";
import { FileText } from "lucide-react";
import { Card, CardContent } from "@stride-os/ui";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { UploadDropzone } from "./_components/UploadDropzone";
import { RunHistoryTable } from "./_components/RunHistoryTable";
import { RunStatusBadge } from "./_components/RunStatusBadge";
import { SoftDeleteRunsManager } from "./_components/SoftDeleteRunsManager";
import type { Tables } from "@stride-os/db";
import type { IngestionStatus } from "@stride-os/ingestion";

type Run = Tables<"ingestion_runs">;
type Outlet = Pick<Tables<"outlets">, "id" | "name" | "brand">;

const ACTIVE_STATUSES: IngestionStatus[] = ["uploaded", "parsing", "preview_ready", "committing"];
const HISTORY_STATUSES: IngestionStatus[] = ["failed", "rolled_back"];
const PURGED_LOOKBACK_DAYS = 90;

export default async function IngestPage() {
  const [supabase, role] = await Promise.all([createClient(), getRole()]);

  if (role !== "partner") redirect("/dashboard");

  const [
    { data: activeRuns },
    { data: committedRuns },
    { data: historyRuns },
    { data: deletedRuns },
    { data: purgedRuns },
    { data: outlets },
  ] = await Promise.all([
    supabase
      .from("ingestion_runs")
      .select("*")
      .in("status", ACTIVE_STATUSES)
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("ingestion_runs")
      .select("*")
      .eq("status", "committed")
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: false }),
    supabase
      .from("ingestion_runs")
      .select("*")
      .in("status", HISTORY_STATUSES)
      .is("deleted_at", null)
      .order("uploaded_at", { ascending: false })
      .limit(50),
    supabase
      .from("ingestion_runs")
      .select("*")
      .not("deleted_at", "is", null)
      .neq("status", "purged")
      .order("deleted_at", { ascending: false }),
    supabase
      .from("ingestion_runs")
      .select("*")
      .eq("status", "purged")
      .gte(
        "updated_at",
        new Date(Date.now() - PURGED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
      )
      .order("updated_at", { ascending: false }),
    supabase.from("outlets").select("id, name, brand").is("archived_at", null).order("name"),
  ]);

  const active = (activeRuns ?? []) as Run[];
  const committed = (committedRuns ?? []) as Run[];
  const history = (historyRuns ?? []) as Run[];
  const deleted = (deletedRuns ?? []) as Run[];
  const purged = (purgedRuns ?? []) as Run[];
  const outletOptions = (outlets ?? []) as Outlet[];

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Ingest</h1>
        <p className="text-muted-foreground text-sm">
          Upload Petpooja, Pine Labs, aggregator reports, and franchise P&L PDFs.
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

      <SoftDeleteRunsManager committedRuns={committed} deletedRuns={deleted} purgedRuns={purged} />

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Failed and rolled back</h2>
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed py-12 text-center">
            <FileText className="text-muted-foreground/40 mb-3 h-10 w-10" />
            <p className="text-muted-foreground text-sm">No failed or rolled-back runs.</p>
          </div>
        ) : (
          <RunHistoryTable runs={history} />
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
