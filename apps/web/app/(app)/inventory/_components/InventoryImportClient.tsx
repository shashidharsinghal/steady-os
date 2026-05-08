"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@stride-os/shared";
import type { InventoryImportCandidate } from "@stride-os/shared";
import { Button, Card, CardContent } from "@stride-os/ui";
import { importInventoryFromSalesAction } from "../actions";

function candidateKey(candidate: InventoryImportCandidate) {
  return `${candidate.itemName}::${candidate.variation ?? ""}`;
}

export function InventoryImportClient({
  outletId,
  candidates,
}: {
  outletId: string;
  candidates: InventoryImportCandidate[];
}) {
  const router = useRouter();
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(
    () => new Set(candidates.map(candidateKey))
  );
  const [isPending, startTransition] = useTransition();

  const selected = useMemo(
    () => candidates.filter((candidate) => selectedKeys.has(candidateKey(candidate))),
    [candidates, selectedKeys]
  );

  function toggle(key: string) {
    setSelectedKeys((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function submit() {
    startTransition(async () => {
      try {
        const result = await importInventoryFromSalesAction(outletId, selected);
        toast.success(`Imported ${result.created} items. ${result.skipped} skipped.`);
        router.push(`/inventory?outletId=${outletId}`);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to import sales history.");
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
        <p className="text-muted-foreground text-sm">
          Bootstrap the item master from committed Petpooja line items. Costs stay blank until you
          fill them in.
        </p>
      </div>

      <Card className="border-border shadow-card rounded-[28px]">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="section-card-title">Import preview</p>
              <p className="text-muted-foreground mt-2 text-sm leading-6">
                We dedup by item name + variation and keep the most recent selling price from sales
                history.
              </p>
            </div>
            <div className="border-border bg-background/70 text-muted-foreground rounded-[16px] border px-4 py-3 text-sm">
              {selected.length} of {candidates.length} selected
            </div>
          </div>

          <div className="border-border overflow-hidden rounded-[20px] border">
            <table className="w-full text-sm">
              <thead className="bg-paper-subtle text-muted-foreground text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-4 py-3">Import</th>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Selling price</th>
                  <th className="px-4 py-3 text-right">Seen in orders</th>
                  <th className="px-4 py-3 text-right">Last seen</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => {
                  const key = candidateKey(candidate);
                  const checked = selectedKeys.has(key);
                  return (
                    <tr key={key} className="border-border bg-card border-t">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(key)}
                          className="border-border h-4 w-4 rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-foreground font-medium">{candidate.itemName}</div>
                        {candidate.variation ? (
                          <div className="text-muted-foreground text-xs">{candidate.variation}</div>
                        ) : null}
                      </td>
                      <td className="text-muted-foreground px-4 py-3">
                        {candidate.category ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {formatINR(candidate.sellingPricePaise / 100)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {candidate.sourceOrderCount}
                      </td>
                      <td className="text-muted-foreground px-4 py-3 text-right">
                        {new Date(candidate.lastOrderedAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              onClick={submit}
              disabled={isPending || selected.length === 0}
            >
              <Upload className="h-4 w-4" />
              Import {selected.length} items
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedKeys(new Set(candidates.map(candidateKey)))}
              disabled={isPending}
            >
              Select all
            </Button>
            <Button
              variant="outline"
              onClick={() => setSelectedKeys(new Set())}
              disabled={isPending}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
