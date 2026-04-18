"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@stride-os/ui";
import { assignEmployeeToOutlet, removeEmployeeFromOutlet } from "../actions";

type OutletOption = {
  id: string;
  name: string;
};

export function AssignToOutletDialog({
  employeeId,
  employeeName,
  assignedOutlets,
  allOutlets,
}: {
  employeeId: string;
  employeeName: string;
  assignedOutlets: OutletOption[];
  allOutlets: OutletOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [saving, setSaving] = useState(false);

  const availableOutlets = useMemo(
    () =>
      allOutlets.filter((outlet) => !assignedOutlets.some((assigned) => assigned.id === outlet.id)),
    [allOutlets, assignedOutlets]
  );

  async function handleAssign() {
    if (!selectedOutletId) return;

    setSaving(true);
    try {
      await assignEmployeeToOutlet({ employee_id: employeeId, outlet_id: selectedOutletId });
      toast.success(`${employeeName} was assigned to the outlet.`);
      setSelectedOutletId("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to assign employee.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(outletId: string) {
    setSaving(true);
    try {
      await removeEmployeeFromOutlet({ employee_id: employeeId, outlet_id: outletId });
      toast.success(`${employeeName} was removed from the outlet.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove assignment.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Manage outlets
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage outlet assignments</DialogTitle>
          <DialogDescription>
            Add or remove outlet assignments for {employeeName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3">
            <p className="text-sm font-medium">Assigned outlets</p>
            {assignedOutlets.length > 0 ? (
              <div className="space-y-2">
                {assignedOutlets.map((outlet) => (
                  <div
                    key={outlet.id}
                    className="flex items-center justify-between gap-3 rounded-md border p-3"
                  >
                    <span className="text-sm">{outlet.name}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={saving}
                      onClick={() => handleRemove(outlet.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No outlet assignments yet.</p>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Assign to another outlet</p>
            {availableOutlets.length > 0 ? (
              <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outlet" />
                </SelectTrigger>
                <SelectContent>
                  {availableOutlets.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <p className="text-muted-foreground text-sm">All outlets are already assigned.</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button onClick={handleAssign} disabled={saving || !selectedOutletId}>
            {saving ? "Saving…" : "Assign outlet"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
