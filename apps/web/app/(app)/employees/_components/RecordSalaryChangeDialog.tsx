"use client";

import { useState } from "react";
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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@stride-os/ui";
import { recordSalaryChange } from "../actions";

const REASONS = [
  { value: "hike", label: "Hike" },
  { value: "demotion", label: "Demotion" },
  { value: "correction", label: "Correction" },
] as const;

export function RecordSalaryChangeDialog({
  employeeId,
  employeeName,
}: {
  employeeId: string;
  employeeName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [monthlySalary, setMonthlySalary] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [reason, setReason] = useState<(typeof REASONS)[number]["value"]>("hike");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try {
      await recordSalaryChange(employeeId, {
        monthly_salary: Number(monthlySalary),
        effective_from: effectiveFrom,
        reason,
      });
      toast.success(`Salary updated for ${employeeName}.`);
      setOpen(false);
      setMonthlySalary("");
      setEffectiveFrom("");
      setReason("hike");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record salary change.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        Record salary change
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record salary change</DialogTitle>
          <DialogDescription>
            Add a new salary row for {employeeName}. The previous open row will close automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="salary-amount">Monthly salary</Label>
            <Input
              id="salary-amount"
              type="number"
              min="0"
              value={monthlySalary}
              onChange={(event) => setMonthlySalary(event.target.value)}
              placeholder="25000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="effective-from">Effective from</Label>
            <Input
              id="effective-from"
              type="date"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Select value={reason} onValueChange={(value) => setReason(value as typeof reason)}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || !monthlySalary.trim() || !effectiveFrom}
          >
            {saving ? "Saving…" : "Save change"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
