import { formatINRCompact } from "@stride-os/shared";
import { Button, Card, CardContent } from "@stride-os/ui";
import type { MergeSuggestionRow } from "../actions";
import { dismissMergeSuggestion, mergeCustomers } from "../actions";
import { SegmentBadge } from "./SegmentBadge";

export function MergeSuggestionCard({ suggestion }: { suggestion: MergeSuggestionRow }) {
  const mergeAction = mergeCustomers.bind(
    null,
    suggestion.primaryCustomer.id,
    suggestion.secondaryCustomer.id,
    suggestion.reason
  );
  const dismissAction = dismissMergeSuggestion.bind(
    null,
    suggestion.primaryCustomer.id,
    suggestion.secondaryCustomer.id,
    suggestion.reason
  );

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm font-semibold">Potential same person</p>
            <p className="text-muted-foreground text-sm">{suggestion.reason}</p>
          </div>
          <div className="text-right">
            <p className="text-primary text-lg font-semibold">{suggestion.confidence}%</p>
            <p className="text-muted-foreground text-xs">confidence</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {[suggestion.primaryCustomer, suggestion.secondaryCustomer].map((customer, index) => (
            <div key={customer.id} className="bg-background/60 rounded-[18px] border p-4">
              <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                {index === 0 ? "Primary" : "Secondary"}
              </p>
              <p className="mt-2 font-medium">{customer.primary_identifier}</p>
              <div className="mt-3 flex items-center gap-2">
                <SegmentBadge segment={customer.highest_segment} />
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                {customer.total_orders} orders ·{" "}
                {formatINRCompact(customer.total_spend_paise / 100)}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <form action={mergeAction}>
            <Button type="submit">Merge into one customer</Button>
          </form>
          <form action={dismissAction}>
            <Button type="submit" variant="outline">
              Not the same person
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
