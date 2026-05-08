"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@stride-os/ui";
import { addManualExpenseAction } from "../actions";

type CategoryOption = {
  id: string;
  name: string;
};

export function AddManualExpenseDialog({
  outletId,
  categories,
}: {
  outletId: string;
  categories: CategoryOption[];
}) {
  const [recurring, setRecurring] = useState(false);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">
          <Plus className="h-4 w-4" />
          Add expense
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add manual expense</DialogTitle>
          <DialogDescription>
            Record a one-off spend or create a recurring template for future bills.
          </DialogDescription>
        </DialogHeader>

        <form action={addManualExpenseAction} className="grid gap-4">
          <input type="hidden" name="outlet_id" value={outletId} />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              Category
              <select
                name="category_id"
                required
                className="border-border bg-background h-10 w-full rounded-[10px] border px-3 text-sm"
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm font-medium">
              Vendor
              <input
                name="vendor_name"
                placeholder="Landlord, supplier, utility..."
                className="border-border bg-background h-10 w-full rounded-[10px] border px-3 text-sm"
              />
            </label>
          </div>

          <label className="space-y-1 text-sm font-medium">
            Note
            <input
              name="description"
              required
              placeholder="What was this expense for?"
              className="border-border bg-background h-10 w-full rounded-[10px] border px-3 text-sm"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              Amount
              <input
                name="amount_rupees"
                type="number"
                min="0"
                step="0.01"
                required
                className="border-border bg-background h-10 w-full rounded-[10px] border px-3 text-sm"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Tax
              <input
                name="tax_rupees"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                className="border-border bg-background h-10 w-full rounded-[10px] border px-3 text-sm"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="space-y-1 text-sm font-medium">
              Invoice date
              <input
                name="invoice_date"
                type="date"
                className="border-border bg-background h-10 w-full rounded-[10px] border px-3 text-sm"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Due date
              <input
                name="due_date"
                type="date"
                className="border-border bg-background h-10 w-full rounded-[10px] border px-3 text-sm"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Paid date
              <input
                name="paid_date"
                type="date"
                className="border-border bg-background h-10 w-full rounded-[10px] border px-3 text-sm"
              />
            </label>
          </div>

          <label className="border-border bg-paper-subtle flex items-center gap-3 rounded-[14px] border p-3 text-sm font-medium">
            <input
              name="is_recurring"
              type="checkbox"
              checked={recurring}
              onChange={(event) => setRecurring(event.target.checked)}
            />
            Recurring expense
          </label>

          {recurring ? (
            <div className="border-border grid gap-4 rounded-[14px] border p-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium">
                Period
                <select
                  name="recurrence_period"
                  required={recurring}
                  className="border-border bg-background h-10 w-full rounded-[10px] border px-3 text-sm"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </label>
              <label className="space-y-1 text-sm font-medium">
                Next due
                <input
                  name="next_due_date"
                  type="date"
                  className="border-border bg-background h-10 w-full rounded-[10px] border px-3 text-sm"
                />
              </label>
            </div>
          ) : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="submit" variant="primary">
              Save expense
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
