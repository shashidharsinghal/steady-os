"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { formatINRCompact } from "@stride-os/shared";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@stride-os/ui";
import { investmentConfigSchema, type InvestmentConfigInput } from "@stride-os/shared";
import { clearInvestment, configureInvestment } from "../actions";

type RecoveryPreview = {
  configured: boolean;
  recoveredPct: number | null;
  monthsToBreakEven: number | null;
  investedPaise: number | null;
  recoveredPaise: number;
  last30dProfitPaise: number;
  projectedBreakevenDate: string | null;
};

export function InvestmentForm({
  outletId,
  outletName,
  defaultValues,
  recovery,
}: {
  outletId: string;
  outletName: string;
  defaultValues: InvestmentConfigInput;
  recovery: RecoveryPreview;
}) {
  const router = useRouter();
  const [isSubmitting, startSubmit] = useTransition();
  const [isClearing, setIsClearing] = useState(false);
  const form = useForm<InvestmentConfigInput>({
    resolver: zodResolver(investmentConfigSchema),
    defaultValues,
  });

  const values = form.watch();
  const livePreview = useMemo(() => {
    const totalPaise = Math.round((values.total_invested_rupees || 0) * 100);
    const recoveredPct = totalPaise > 0 ? (recovery.recoveredPaise / totalPaise) * 100 : null;
    const remaining = totalPaise > 0 ? Math.max(totalPaise - recovery.recoveredPaise, 0) : null;
    const monthsToBreakEven =
      remaining != null && recovery.last30dProfitPaise > 0
        ? remaining / recovery.last30dProfitPaise
        : null;

    return {
      recoveredPct,
      monthsToBreakEven,
      totalPaise,
    };
  }, [recovery.last30dProfitPaise, recovery.recoveredPaise, values.total_invested_rupees]);

  function onSubmit(input: InvestmentConfigInput) {
    startSubmit(async () => {
      try {
        await configureInvestment(outletId, input);
        toast.success("Investment tracking updated.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save investment details.");
      }
    });
  }

  async function onClear() {
    setIsClearing(true);
    try {
      await clearInvestment(outletId);
      toast.success("Investment tracking cleared.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to clear investment details.");
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="opened_on"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Opened on</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projected_breakeven_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Projected break-even date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="total_invested_rupees"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Total invested (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" min="1" step="0.01" placeholder="4200000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save investment"}
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="ghost" disabled={isClearing}>
                  Clear
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear investment tracking for {outletName}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes the configured opening date, total invested amount, and target
                    date. Historical recovery math will still be available once you configure it
                    again.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onClear} disabled={isClearing}>
                    {isClearing ? "Clearing..." : "Clear details"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </Form>

      <div className="border-border shadow-card rounded-[22px] border bg-[linear-gradient(180deg,hsl(var(--paper-2))_0%,hsl(var(--card))_100%)] p-5">
        <p className="section-card-title">Live preview</p>
        <h3 className="mt-3 text-2xl font-semibold tracking-tight">
          {livePreview.recoveredPct != null
            ? `${livePreview.recoveredPct.toFixed(1)}% recovered`
            : "Set the investment amount"}
        </h3>
        <p className="text-muted-foreground mt-2 text-sm leading-6">
          {livePreview.monthsToBreakEven != null
            ? `${Math.ceil(livePreview.monthsToBreakEven)} months to break even at the current pace.`
            : recovery.last30dProfitPaise > 0
              ? "Add the investment amount to preview the break-even timeline."
              : "Building profit history. Commit more sales data to unlock a timeline."}
        </p>

        <div className="mt-5 space-y-4">
          <PreviewRow
            label="Recovered so far"
            value={formatINRCompact(recovery.recoveredPaise / 100)}
          />
          <PreviewRow
            label="Configured invested"
            value={
              livePreview.totalPaise > 0 ? formatINRCompact(livePreview.totalPaise / 100) : "—"
            }
          />
          <PreviewRow
            label="Last 30d profit pace"
            value={formatINRCompact(recovery.last30dProfitPaise / 100)}
          />
          <PreviewRow label="Target date" value={values.projected_breakeven_date || "Not set"} />
        </div>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border/80 flex items-center justify-between gap-4 border-b pb-3 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-mono text-sm font-semibold">{value}</span>
    </div>
  );
}
