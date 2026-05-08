"use client";

import { useState, useTransition } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { toast } from "sonner";
import { EXPENSE_CATEGORY_COLOR_OPTIONS, type ExpenseCategory } from "@stride-os/shared";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@stride-os/ui";
import { cn } from "@stride-os/ui/lib/utils";
import { createExpenseCategory, reorderExpenseCategories, updateExpenseCategory } from "../actions";

const COLOR_PREVIEW: Record<(typeof EXPENSE_CATEGORY_COLOR_OPTIONS)[number], string> = {
  accent: "bg-[hsl(var(--accent))]",
  blue: "bg-[hsl(var(--blue))]",
  green: "bg-[hsl(var(--green))]",
  red: "bg-[hsl(var(--red))]",
  violet: "bg-[hsl(var(--violet))]",
  amber: "bg-[hsl(var(--amber))]",
};

export function ExpenseCategoryRow({
  outletId,
  category,
  orderedIds,
}: {
  outletId: string;
  category: ExpenseCategory;
  orderedIds: string[];
}) {
  const [name, setName] = useState(category.name);
  const [colorToken, setColorToken] = useState(category.color_token);
  const [isActive, setIsActive] = useState(category.is_active);
  const [isPending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      try {
        await updateExpenseCategory(category.id, {
          outlet_id: outletId,
          name,
          color_token: colorToken,
          is_active: isActive,
          display_order: category.display_order,
        });
        toast.success("Category updated.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update category.");
      }
    });
  }

  function move(delta: -1 | 1) {
    const index = orderedIds.indexOf(category.id);
    const nextIndex = index + delta;
    if (index < 0 || nextIndex < 0 || nextIndex >= orderedIds.length) return;
    const next = [...orderedIds];
    [next[index], next[nextIndex]] = [next[nextIndex]!, next[index]!];

    startTransition(async () => {
      try {
        await reorderExpenseCategories(outletId, next);
        toast.success("Category order updated.");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to reorder categories.");
      }
    });
  }

  return (
    <div className="border-border bg-background/70 grid gap-3 rounded-[18px] border p-4 xl:grid-cols-[1.6fr_1fr_0.8fr_auto] xl:items-center">
      <div className="flex items-center gap-3">
        <span className={cn("h-3 w-3 rounded-full", COLOR_PREVIEW[colorToken])} />
        <Input value={name} onChange={(event) => setName(event.target.value)} />
      </div>

      <Select
        value={colorToken}
        onValueChange={(value) => setColorToken(value as typeof colorToken)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select color" />
        </SelectTrigger>
        <SelectContent>
          {EXPENSE_CATEGORY_COLOR_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={() => setIsActive((current) => !current)}
        className={cn(
          "rounded-[12px] border px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "border-[hsl(var(--green)/0.4)] bg-[hsl(var(--green-soft))] text-[hsl(var(--green))]"
            : "border-border bg-paper-subtle text-muted-foreground"
        )}
      >
        {isActive ? "Active" : "Inactive"}
      </button>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => move(-1)}
          disabled={isPending}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => move(1)}
          disabled={isPending}
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={save} disabled={isPending}>
          Save
        </Button>
      </div>
    </div>
  );
}

export function AddExpenseCategoryForm({ outletId }: { outletId: string }) {
  const [name, setName] = useState("");
  const [colorToken, setColorToken] =
    useState<(typeof EXPENSE_CATEGORY_COLOR_OPTIONS)[number]>("accent");
  const [isPending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      try {
        await createExpenseCategory(outletId, {
          outlet_id: outletId,
          name: name.trim(),
          color_token: colorToken,
          display_order: 1,
        });
        toast.success("Category created.");
        setName("");
        setColorToken("accent");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create category.");
      }
    });
  }

  return (
    <div className="border-border bg-background/50 grid gap-3 rounded-[18px] border border-dashed p-4 xl:grid-cols-[1.6fr_1fr_auto] xl:items-center">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Add a category name"
      />
      <Select
        value={colorToken}
        onValueChange={(value) => setColorToken(value as typeof colorToken)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select color" />
        </SelectTrigger>
        <SelectContent>
          {EXPENSE_CATEGORY_COLOR_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant="primary" onClick={submit} disabled={isPending || !name.trim()}>
        <Plus className="h-4 w-4" />
        Add category
      </Button>
    </div>
  );
}
