"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
  Textarea,
} from "@stride-os/ui";
import { toast } from "sonner";
import { parseRun, commitRun, cancelRun, rollbackRun, deleteRun } from "../actions";
import type { Tables } from "@stride-os/db";
import { getAllParsers } from "@stride-os/ingestion";

type Run = Tables<"ingestion_runs">;

// ─── Parse ────────────────────────────────────────────────────────────────────

export function ParseButton({ run, sourceOverride }: { run: Run; sourceOverride?: string | null }) {
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      try {
        await parseRun(run.id, sourceOverride ?? undefined);
        toast.success("Parsing complete.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Parsing failed.");
      }
    });
  }

  return (
    <Button onClick={handle} disabled={isPending}>
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isPending ? "Parsing…" : "Parse file"}
    </Button>
  );
}

// ─── Commit ───────────────────────────────────────────────────────────────────

export function CommitButton({ run }: { run: Run }) {
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      try {
        await commitRun(run.id);
        toast.success("Run committed successfully.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Commit failed.");
      }
    });
  }

  return (
    <Button onClick={handle} disabled={isPending}>
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isPending ? "Committing…" : "Commit to database"}
    </Button>
  );
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export function CancelRunButton({ run }: { run: Run }) {
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      try {
        await cancelRun(run.id);
        toast.success("Run cancelled.");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Cancel failed.");
      }
    });
  }

  return (
    <Button variant="outline" onClick={handle} disabled={isPending}>
      {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Cancel
    </Button>
  );
}

// ─── Rollback ─────────────────────────────────────────────────────────────────

export function RollbackButton({ run }: { run: Run }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleRollback() {
    startTransition(async () => {
      try {
        await rollbackRun(run.id, reason);
        toast.success("Run rolled back. Canonical data removed.");
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Rollback failed.");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          className="border-destructive/40 text-destructive hover:bg-destructive/5"
        >
          Rollback this run
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Roll back this run?</AlertDialogTitle>
          <AlertDialogDescription>
            All data written by this run will be permanently deleted. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          placeholder="Reason for rollback (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-2"
          rows={2}
        />
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRollback}
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? "Rolling back…" : "Yes, roll back"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export function DeleteRunButton({ run }: { run: Run }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handle() {
    startTransition(async () => {
      try {
        await deleteRun(run.id);
        toast.success("Run deleted.");
        router.push("/ingest");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Delete failed.");
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Delete run</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this run?</AlertDialogTitle>
          <AlertDialogDescription>
            The run record and its uploaded file will be removed. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handle} disabled={isPending}>
            {isPending ? "Deleting…" : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Source picker (used in "uploaded" state) ─────────────────────────────────

export function SourcePicker({
  currentSource,
  onChange,
}: {
  currentSource: string;
  onChange: (value: string) => void;
}) {
  const parsers = getAllParsers();

  if (parsers.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        Auto-detected: <span className="font-medium">{currentSource}</span>
        {currentSource === "unknown" && " — no parsers are registered yet."}
      </p>
    );
  }

  return (
    <select
      value={currentSource}
      onChange={(e) => onChange(e.target.value)}
      className="border-border rounded-lg border px-3 py-2 text-sm"
    >
      <option value="unknown">Auto-detected (unknown)</option>
      {parsers.map((p) => (
        <option key={p.sourceType} value={p.sourceType}>
          {p.displayName}
        </option>
      ))}
    </select>
  );
}
