"use client";

import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, RefreshCw, Unplug } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@stride-os/ui";
import {
  connectGmail,
  disconnectGmail,
  triggerGmailBackfillDay,
  triggerGmailSync,
  type GmailConnectionStatus,
} from "../actions";

type OutletOption = {
  id: string;
  name: string;
  brand: string;
};

type SyncHistoryRow = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  triggeredBy: "cron_primary" | "cron_retry" | "manual" | "backfill";
  status: "running" | "success" | "partial" | "failed" | "no_emails";
  reports: number;
  ordersLabel: string;
  itemsLabel: string;
  errorMessage: string | null;
};

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTokenExpiry(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000));
  if (days < 0) return "Token expired";
  if (days === 0) return "Token expires today";
  if (days === 1) return "Token expires in 1 day";
  return `Token expires in ${days} days`;
}

function buildBackfillDates(startDate: string, endDate: string): string[] {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const from = start <= end ? start : end;
  const to = start <= end ? end : start;
  const dates: string[] = [];

  for (
    let current = new Date(from);
    current <= to;
    current = new Date(current.getTime() + 86400000)
  ) {
    dates.push(current.toISOString().slice(0, 10));
  }

  return dates;
}

function statusLabel(status: SyncHistoryRow["status"]) {
  switch (status) {
    case "success":
      return "Success";
    case "partial":
      return "Review needed";
    case "failed":
      return "Failed";
    case "no_emails":
      return "No emails";
    default:
      return "Running";
  }
}

export function GmailAutoSyncSection({
  outlets,
  selectedOutletId,
  connectionStatus,
  syncHistory,
  banner,
}: {
  outlets: OutletOption[];
  selectedOutletId: string | null;
  connectionStatus: GmailConnectionStatus | null;
  syncHistory: SyncHistoryRow[];
  banner?: {
    tone: "success" | "error" | "info";
    message: string;
  } | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [backfillStart, setBackfillStart] = useState("");
  const [backfillEnd, setBackfillEnd] = useState("");
  const [backfillProgress, setBackfillProgress] = useState<{
    total: number;
    completed: number;
    currentDate: string | null;
    results: Array<{ date: string; status: string }>;
  } | null>(null);

  const selectedOutlet = useMemo(
    () => outlets.find((outlet) => outlet.id === selectedOutletId) ?? outlets[0] ?? null,
    [outlets, selectedOutletId]
  );

  function updateOutlet(outletId: string) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("outletId", outletId);
    router.replace(`${pathname}?${next.toString()}`);
  }

  function handleConnect() {
    if (!selectedOutlet?.id) {
      toast.error("Choose an outlet before connecting Gmail.");
      return;
    }

    startTransition(async () => {
      try {
        const { authUrl } = await connectGmail(selectedOutlet.id);
        window.location.assign(authUrl);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not start Gmail authorization."
        );
      }
    });
  }

  function handleDisconnect() {
    if (!selectedOutlet?.id) return;
    startTransition(async () => {
      try {
        await disconnectGmail(selectedOutlet.id);
        toast.success("Gmail disconnected.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not disconnect Gmail.");
      }
    });
  }

  function handleSyncNow() {
    if (!selectedOutlet?.id) {
      toast.error("Choose an outlet before syncing.");
      return;
    }

    startTransition(async () => {
      try {
        const result = await triggerGmailSync(selectedOutlet.id);
        toast.success(
          result.status === "success"
            ? `Synced ${result.ingestionRunIds.length} report${result.ingestionRunIds.length === 1 ? "" : "s"}.`
            : `Sync finished with status: ${result.status}.`
        );
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gmail sync failed.");
        router.refresh();
      }
    });
  }

  function handleBackfill() {
    if (!selectedOutlet?.id) {
      toast.error("Choose an outlet before starting a backfill.");
      return;
    }

    const dates = buildBackfillDates(backfillStart, backfillEnd);
    if (dates.length === 0) {
      toast.error("Choose a valid backfill date range.");
      return;
    }

    startTransition(async () => {
      setBackfillProgress({
        total: dates.length,
        completed: 0,
        currentDate: dates[0] ?? null,
        results: [],
      });

      const results: Array<{ date: string; status: string }> = [];

      for (const date of dates) {
        setBackfillProgress((current) =>
          current
            ? {
                ...current,
                currentDate: date,
              }
            : current
        );

        try {
          const result = await triggerGmailBackfillDay(selectedOutlet.id, date);
          results.push({ date, status: result.status });
        } catch (error) {
          results.push({
            date,
            status: error instanceof Error ? error.message : "failed",
          });
        }

        setBackfillProgress((current) =>
          current
            ? {
                ...current,
                completed: current.completed + 1,
                results: [...results],
              }
            : current
        );
      }

      toast.success(`Backfill finished for ${dates.length} day${dates.length === 1 ? "" : "s"}.`);
      router.refresh();
    });
  }

  const tokenLabel = formatTokenExpiry(connectionStatus?.tokenExpiresAt ?? null);
  const isConnected = connectionStatus?.state === "connected";
  const isExpired = connectionStatus?.state === "expired";

  return (
    <div className="space-y-4">
      <Card className="border shadow-none">
        <CardContent className="space-y-5 p-5">
          {banner ? (
            <div
              className={
                banner.tone === "success"
                  ? "rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-900"
                  : banner.tone === "error"
                    ? "rounded-2xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900"
                    : "rounded-2xl border border-sky-300 bg-sky-50 p-4 text-sm text-sky-900"
              }
            >
              {banner.message}
            </div>
          ) : null}

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-xl border">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Gmail Auto-Sync</p>
                  <p className="text-muted-foreground text-xs">
                    Connect one Gmail inbox per outlet to ingest Petpooja reports automatically.
                  </p>
                </div>
              </div>

              <div className="max-w-sm space-y-2">
                <p className="text-sm font-medium">Outlet</p>
                <Select value={selectedOutlet?.id ?? ""} onValueChange={updateOutlet}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name} · {outlet.brand}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleConnect}
                disabled={isPending || !selectedOutlet}
              >
                {isExpired
                  ? "Re-authorize Gmail"
                  : isConnected
                    ? "Reconnect Gmail"
                    : "Connect Gmail"}
              </Button>
              <Button
                type="button"
                onClick={handleSyncNow}
                disabled={
                  isPending ||
                  !selectedOutlet ||
                  !connectionStatus ||
                  connectionStatus.state === "disconnected" ||
                  connectionStatus.state === "revoked" ||
                  connectionStatus.state === "error"
                }
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync now
              </Button>
              {connectionStatus && connectionStatus.state !== "disconnected" ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDisconnect}
                  disabled={isPending}
                >
                  <Unplug className="h-4 w-4" />
                  Disconnect
                </Button>
              ) : null}
            </div>
          </div>

          {!selectedOutlet ? (
            <p className="text-muted-foreground text-sm">
              Create an outlet first to enable Gmail auto-sync.
            </p>
          ) : connectionStatus?.state === "disconnected" ? (
            <div className="rounded-2xl border border-dashed p-4">
              <p className="text-sm font-semibold">Not connected yet</p>
              <p className="text-muted-foreground mt-1 text-sm">
                Manual uploads still work. Connect Gmail to let Stride pull Petpooja reports
                nightly.
              </p>
            </div>
          ) : isExpired ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-900">Authorization expired</p>
              <p className="mt-1 text-sm text-amber-800">
                Auto-sync is paused until Gmail is re-authorized. Missed days stay queued and can be
                recovered with Sync now after re-auth.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border p-4">
                <p className="text-muted-foreground text-xs">Connection</p>
                <p className="mt-1 text-sm font-semibold">
                  {connectionStatus?.gmailAddress ?? "Connected inbox"}
                </p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-muted-foreground text-xs">Last sync</p>
                <p className="mt-1 text-sm font-semibold">
                  {formatDateTime(connectionStatus?.lastSyncAt ?? null)}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {connectionStatus?.lastSyncStatus
                    ? `Result: ${connectionStatus.lastSyncStatus}`
                    : "No sync has run yet."}
                </p>
              </div>
              <div className="rounded-2xl border p-4">
                <p className="text-muted-foreground text-xs">Next cron windows</p>
                <p className="mt-1 text-sm font-semibold">23:00 IST and 01:00 IST</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {tokenLabel ?? "Token status unavailable."}
                </p>
              </div>
            </div>
          )}

          {connectionStatus?.lastSyncError ? (
            <p className="text-sm text-amber-700">{connectionStatus.lastSyncError}</p>
          ) : null}

          <div className="rounded-2xl border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Backfill historical reports</p>
                <p className="text-muted-foreground text-xs">
                  Processes oldest-first, one day at a time, using the same auto-commit rules as
                  nightly sync.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleBackfill}
                disabled={isPending || !isConnected || !backfillStart || !backfillEnd}
              >
                Start backfill
              </Button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="space-y-2 text-sm">
                <span className="font-medium">From</span>
                <input
                  type="date"
                  value={backfillStart}
                  onChange={(event) => setBackfillStart(event.target.value)}
                  className="border-input bg-background w-full rounded-xl border px-3 py-2"
                />
              </label>
              <label className="space-y-2 text-sm">
                <span className="font-medium">To</span>
                <input
                  type="date"
                  value={backfillEnd}
                  onChange={(event) => setBackfillEnd(event.target.value)}
                  className="border-input bg-background w-full rounded-xl border px-3 py-2"
                />
              </label>
            </div>

            {backfillProgress ? (
              <div className="bg-muted/40 mt-4 rounded-xl p-3 text-sm">
                <p className="font-medium">
                  {backfillProgress.completed}/{backfillProgress.total} days complete
                </p>
                <p className="text-muted-foreground mt-1">
                  {backfillProgress.currentDate
                    ? `Working on ${backfillProgress.currentDate}`
                    : "Preparing backfill"}
                </p>
                {backfillProgress.results.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    {backfillProgress.results.map((result) => (
                      <span key={result.date} className="rounded-full border px-2 py-1">
                        {result.date}: {result.status}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Sync history</h3>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reports</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncHistory.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-muted-foreground py-10 text-center text-sm"
                    >
                      No Gmail sync runs recorded for this outlet yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  syncHistory.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{formatDateTime(run.startedAt)}</TableCell>
                      <TableCell>{statusLabel(run.status)}</TableCell>
                      <TableCell>{run.reports}</TableCell>
                      <TableCell>{run.ordersLabel}</TableCell>
                      <TableCell>{run.itemsLabel}</TableCell>
                      <TableCell>{formatDateTime(run.completedAt ?? run.startedAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
