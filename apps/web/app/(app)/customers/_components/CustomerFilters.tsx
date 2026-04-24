import { Button } from "@stride-os/ui";
import type { CustomerListParams } from "../actions";

export function CustomerFilters({ params }: { params: CustomerListParams }) {
  return (
    <form className="bg-card grid gap-3 rounded-[20px] border p-4 md:grid-cols-2 xl:grid-cols-6">
      <input
        type="text"
        name="q"
        defaultValue={params.q ?? ""}
        placeholder="Search name, VPA, or last 4"
        className="bg-background rounded-[12px] border px-3 py-2 text-sm"
      />
      <select
        name="segment"
        defaultValue={params.segment ?? "all"}
        className="bg-background rounded-[12px] border px-3 py-2 text-sm"
      >
        <option value="all">All segments</option>
        <option value="super_regular">Super regular</option>
        <option value="regular">Regular</option>
        <option value="active">Active</option>
        <option value="new">New</option>
        <option value="lapsed">Lapsed</option>
        <option value="churned">Churned</option>
        <option value="one_timer">One-timer</option>
      </select>
      <select
        name="hasAggregator"
        defaultValue={params.hasAggregator ?? "any"}
        className="bg-background rounded-[12px] border px-3 py-2 text-sm"
      >
        <option value="any">Any aggregator mix</option>
        <option value="yes">Has aggregator orders</option>
        <option value="no">No aggregator orders</option>
      </select>
      <select
        name="hasDineIn"
        defaultValue={params.hasDineIn ?? "any"}
        className="bg-background rounded-[12px] border px-3 py-2 text-sm"
      >
        <option value="any">Any dine-in mix</option>
        <option value="yes">Has dine-in</option>
        <option value="no">No dine-in</option>
      </select>
      <select
        name="lastSeen"
        defaultValue={params.lastSeen ?? "all"}
        className="bg-background rounded-[12px] border px-3 py-2 text-sm"
      >
        <option value="all">Last seen anytime</option>
        <option value="7d">Seen in last 7 days</option>
        <option value="30d">Seen in last 30 days</option>
        <option value="90d">Seen in last 90 days</option>
      </select>
      <div className="flex gap-2">
        <input
          type="number"
          min={1}
          name="minOrders"
          defaultValue={params.minOrders ?? 1}
          className="bg-background w-full rounded-[12px] border px-3 py-2 text-sm"
        />
        <Button type="submit">Apply</Button>
      </div>
    </form>
  );
}
