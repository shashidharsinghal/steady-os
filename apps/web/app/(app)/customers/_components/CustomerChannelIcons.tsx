import { Store, Smartphone, WalletCards } from "lucide-react";

export function CustomerChannelIcons({
  hasAggregatorOrders,
  hasDineIn,
}: {
  hasAggregatorOrders: boolean;
  hasDineIn: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {hasDineIn ? (
        <span className="bg-secondary/10 text-secondary inline-flex h-8 w-8 items-center justify-center rounded-full border">
          <Store className="h-4 w-4" />
        </span>
      ) : null}
      {hasAggregatorOrders ? (
        <span className="bg-primary/10 text-primary inline-flex h-8 w-8 items-center justify-center rounded-full border">
          <Smartphone className="h-4 w-4" />
        </span>
      ) : null}
      {!hasDineIn && !hasAggregatorOrders ? (
        <span className="bg-muted/40 text-muted-foreground inline-flex h-8 w-8 items-center justify-center rounded-full border">
          <WalletCards className="h-4 w-4" />
        </span>
      ) : null}
    </div>
  );
}
