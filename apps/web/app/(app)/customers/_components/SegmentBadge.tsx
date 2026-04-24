import { cn } from "@stride-os/ui";

const LABELS: Record<string, string> = {
  super_regular: "Super Regular",
  regular: "Regular",
  active: "Active",
  new: "New",
  lapsed: "Lapsed",
  churned: "Churned",
  one_timer: "One-timer",
};

const TONES: Record<string, string> = {
  super_regular:
    "border-[hsl(var(--success)/0.35)] bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]",
  regular: "border-primary/30 bg-primary/10 text-primary",
  active: "border-secondary/30 bg-secondary/10 text-secondary",
  new: "border-border bg-muted/40 text-foreground",
  lapsed: "border-warning/35 bg-warning/10 text-[hsl(var(--warning))]",
  churned: "border-destructive/35 bg-destructive/10 text-[hsl(var(--destructive))]",
  one_timer: "border-border bg-background/70 text-muted-foreground",
};

export function SegmentBadge({ segment }: { segment: string }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-xs font-medium",
        TONES[segment] ?? TONES.new
      )}
    >
      {LABELS[segment] ?? segment}
    </span>
  );
}
