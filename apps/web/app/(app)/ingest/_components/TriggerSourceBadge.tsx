import { cn } from "@stride-os/ui";

export type TriggerSource = "manual_upload" | "gmail_auto" | "gmail_manual" | "gmail_backfill";
export type TriggerFilter = "all" | "manual" | "auto" | "backfill";

export const TRIGGER_FILTERS: Array<{ value: TriggerFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "manual", label: "Manual" },
  { value: "auto", label: "Auto-synced" },
  { value: "backfill", label: "Backfill" },
];

export function triggerSourceFilter(source: string | null | undefined): TriggerFilter {
  if (source === "gmail_auto" || source === "gmail_manual") return "auto";
  if (source === "gmail_backfill") return "backfill";
  return "manual";
}

export function TriggerSourceBadge({ source }: { source: string | null | undefined }) {
  const filter = triggerSourceFilter(source);
  const label = filter === "auto" ? "🤖 AUTO" : filter === "backfill" ? "📥 BACKFILL" : "⬆ MANUAL";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium",
        filter === "manual"
          ? "border-border bg-muted/40 text-muted-foreground"
          : "border-sky-200 bg-sky-50 text-sky-700"
      )}
    >
      {label}
    </span>
  );
}
