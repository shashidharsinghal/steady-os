"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
  Input,
  Label,
} from "@stride-os/ui";
import { archiveEmployee } from "../actions";

export function ArchiveEmployeeDialog({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const [leftOn, setLeftOn] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleArchive() {
    setSaving(true);
    try {
      await archiveEmployee(employeeId, { left_on: leftOn });
      toast.success(`${employeeName} has been archived.`);
      router.push("/employees");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to archive employee.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Archive
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive {employeeName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Archived employees are removed from the default roster, but their history remains
            available for reference.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2">
          <Label htmlFor="left-on">Exit date</Label>
          <Input
            id="left-on"
            type="date"
            value={leftOn}
            onChange={(event) => setLeftOn(event.target.value)}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleArchive} disabled={saving || !leftOn}>
            {saving ? "Archiving…" : "Archive employee"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
