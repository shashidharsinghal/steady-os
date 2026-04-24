import Link from "next/link";
import { Users } from "lucide-react";
import { Button } from "@stride-os/ui";
import { CustomerFilters } from "./_components/CustomerFilters";
import { CustomerListTable } from "./_components/CustomerListTable";
import { listCustomers, type CustomerListParams } from "./actions";

function parseParams(
  searchParams: Record<string, string | string[] | undefined>
): CustomerListParams {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  return {
    q: get("q") ?? "",
    segment: (get("segment") as CustomerListParams["segment"]) ?? "all",
    hasAggregator: (get("hasAggregator") as CustomerListParams["hasAggregator"]) ?? "any",
    hasDineIn: (get("hasDineIn") as CustomerListParams["hasDineIn"]) ?? "any",
    lastSeen: (get("lastSeen") as CustomerListParams["lastSeen"]) ?? "all",
    minOrders: Number(get("minOrders") ?? 1),
    sort: (get("sort") as CustomerListParams["sort"]) ?? "last_seen",
  };
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseParams(await searchParams);
  const result = await listCustomers(params);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm">
            Unified customer intelligence across aggregator orders and Pine Labs dine-in payments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/customers/merges">Suggested merges</Link>
          </Button>
          <Button asChild>
            <Link href="/customers/lapsed">Lapsed regulars</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <CustomerFilters params={params} />
        <div className="bg-card rounded-[20px] border p-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex h-11 w-11 items-center justify-center rounded-2xl border">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Visible customers</p>
              <p className="text-muted-foreground text-sm">
                {result.total.toLocaleString("en-IN")} matched after filters
              </p>
            </div>
          </div>
        </div>
      </div>

      {result.rows.length === 0 ? (
        <div className="text-muted-foreground rounded-[20px] border border-dashed py-16 text-center">
          No customers match the current filters.
        </div>
      ) : (
        <CustomerListTable rows={result.rows} />
      )}
    </div>
  );
}
