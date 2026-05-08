"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { INVENTORY_UNITS, type InventoryItem } from "@stride-os/shared";
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@stride-os/ui";
import { cn } from "@stride-os/ui/lib/utils";
import {
  createInventoryItemAction,
  deleteInventoryItemAction,
  toggleInventoryItemActiveAction,
  updateInventoryItemAction,
} from "../actions";

type FormState = {
  outlet_id: string;
  item_name: string;
  category: string;
  variation: string;
  selling_price_rupees: string;
  cost_to_prepare_rupees: string;
  current_stock: string;
  reorder_level: string;
  unit: (typeof INVENTORY_UNITS)[number];
  is_active: boolean;
};

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function marginTone(priceRupees: number | null, costRupees: number | null) {
  if (priceRupees == null || priceRupees <= 0 || costRupees == null) return "muted";
  const margin = ((priceRupees - costRupees) / priceRupees) * 100;
  if (margin >= 60) return "green";
  if (margin >= 40) return "amber";
  return "red";
}

function initialState(outletId: string, item?: InventoryItem): FormState {
  return {
    outlet_id: outletId,
    item_name: item?.item_name ?? "",
    category: item?.category ?? "",
    variation: item?.variation ?? "",
    selling_price_rupees:
      item?.selling_price_paise != null ? (item.selling_price_paise / 100).toFixed(2) : "",
    cost_to_prepare_rupees:
      item?.cost_to_prepare_paise != null ? (item.cost_to_prepare_paise / 100).toFixed(2) : "",
    current_stock: item?.current_stock?.toString() ?? "",
    reorder_level: item?.reorder_level?.toString() ?? "",
    unit: (item?.unit as (typeof INVENTORY_UNITS)[number]) ?? "pieces",
    is_active: item?.is_active ?? true,
  };
}

export function InventoryItemForm({ outletId, item }: { outletId: string; item?: InventoryItem }) {
  const router = useRouter();
  const [state, setState] = useState<FormState>(initialState(outletId, item));
  const [isPending, startTransition] = useTransition();

  const sellingPrice = parseOptionalNumber(state.selling_price_rupees);
  const cost = parseOptionalNumber(state.cost_to_prepare_rupees);
  const margin = useMemo(() => {
    if (sellingPrice == null || sellingPrice <= 0 || cost == null) return null;
    return (((sellingPrice - cost) / sellingPrice) * 100).toFixed(1);
  }, [cost, sellingPrice]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function save() {
    startTransition(async () => {
      try {
        const payload = {
          outlet_id: state.outlet_id,
          item_name: state.item_name.trim(),
          category: state.category.trim() || null,
          variation: state.variation.trim() || null,
          selling_price_rupees: Number(state.selling_price_rupees),
          cost_to_prepare_rupees: parseOptionalNumber(state.cost_to_prepare_rupees),
          current_stock: parseOptionalNumber(state.current_stock),
          reorder_level: parseOptionalNumber(state.reorder_level),
          unit: state.unit,
          is_active: state.is_active,
        };

        if (item) {
          await updateInventoryItemAction(item.id, payload);
          toast.success("Inventory item updated.");
        } else {
          await createInventoryItemAction(payload);
          toast.success("Inventory item created.");
        }

        router.push(`/inventory?outletId=${state.outlet_id}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save inventory item.");
      }
    });
  }

  function archive() {
    if (!item) return;
    startTransition(async () => {
      try {
        await deleteInventoryItemAction(item.id);
        toast.success("Inventory item archived.");
        router.push(`/inventory?outletId=${state.outlet_id}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to archive inventory item.");
      }
    });
  }

  function toggleActive() {
    if (!item) {
      update("is_active", !state.is_active);
      return;
    }
    startTransition(async () => {
      try {
        await toggleInventoryItemActiveAction(item.id, !state.is_active);
        update("is_active", !state.is_active);
        toast.success(`Item marked ${state.is_active ? "inactive" : "active"}.`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update item status.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline">
          <Link href={`/inventory?outletId=${outletId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to inventory
          </Link>
        </Button>
        <div className="text-muted-foreground text-sm">
          Live margin updates as you change selling price and cost.
        </div>
      </div>

      <Card className="border-border shadow-card rounded-[28px]">
        <CardContent className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="item_name">Item name</Label>
              <Input
                id="item_name"
                value={state.item_name}
                onChange={(event) => update("item_name", event.target.value)}
                placeholder="Butter Chicken"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                value={state.category}
                onChange={(event) => update("category", event.target.value)}
                placeholder="Main course"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="variation">Variation</Label>
              <Input
                id="variation"
                value={state.variation}
                onChange={(event) => update("variation", event.target.value)}
                placeholder="Full"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="selling_price_rupees">Selling price (Rs)</Label>
              <Input
                id="selling_price_rupees"
                inputMode="decimal"
                value={state.selling_price_rupees}
                onChange={(event) => update("selling_price_rupees", event.target.value)}
                placeholder="349.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost_to_prepare_rupees">Cost to prepare (Rs)</Label>
              <Input
                id="cost_to_prepare_rupees"
                inputMode="decimal"
                value={state.cost_to_prepare_rupees}
                onChange={(event) => update("cost_to_prepare_rupees", event.target.value)}
                placeholder="128.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_stock">Current stock</Label>
              <Input
                id="current_stock"
                inputMode="numeric"
                value={state.current_stock}
                onChange={(event) => update("current_stock", event.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorder_level">Reorder level</Label>
              <Input
                id="reorder_level"
                inputMode="numeric"
                value={state.reorder_level}
                onChange={(event) => update("reorder_level", event.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label>Unit</Label>
              <Select
                value={state.unit}
                onValueChange={(value) => update("unit", value as FormState["unit"])}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_UNITS.map((unit) => (
                    <SelectItem key={unit} value={unit}>
                      {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={toggleActive}
                className={cn(
                  "rounded-[14px] border px-4 py-2.5 text-sm font-medium transition-colors",
                  state.is_active
                    ? "border-[hsl(var(--green)/0.35)] bg-[hsl(var(--green-soft))] text-[hsl(var(--green))]"
                    : "border-border bg-paper-subtle text-muted-foreground"
                )}
              >
                {state.is_active ? "Active" : "Inactive"}
              </button>
            </div>
          </div>

          <div className="border-border bg-background/70 space-y-4 rounded-[22px] border p-5">
            <p className="section-card-title">Live margin</p>
            <div
              className={cn(
                "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em]",
                marginTone(sellingPrice, cost) === "green" &&
                  "bg-[hsl(var(--green-soft))] text-[hsl(var(--green))]",
                marginTone(sellingPrice, cost) === "amber" &&
                  "bg-[hsl(var(--amber-soft))] text-[hsl(var(--amber))]",
                marginTone(sellingPrice, cost) === "red" &&
                  "bg-[hsl(var(--red-soft))] text-[hsl(var(--red))]",
                marginTone(sellingPrice, cost) === "muted" &&
                  "bg-paper-subtle text-muted-foreground"
              )}
            >
              {margin == null ? "Waiting for cost" : `${margin}% gross margin`}
            </div>
            <p className="text-muted-foreground text-sm leading-6">
              Dashboard profit and the later sales-margin views will use this cost to prepare. We
              intentionally keep it as a current master cost in v3, not historical cost history.
            </p>

            <div className="border-border text-muted-foreground rounded-[18px] border border-dashed p-4 text-sm">
              Variation creates a separate cost key. For example, Half and Full should be stored as
              separate item rows when their economics differ.
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                variant="primary"
                onClick={save}
                disabled={isPending || !state.item_name.trim()}
              >
                <Save className="h-4 w-4" />
                {item ? "Save changes" : "Create item"}
              </Button>
              {item ? (
                <Button variant="destructive" onClick={archive} disabled={isPending}>
                  <Archive className="h-4 w-4" />
                  Archive item
                </Button>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
