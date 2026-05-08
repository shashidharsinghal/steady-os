import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, PackagePlus, Upload } from "lucide-react";
import { formatINR } from "@stride-os/shared";
import { Button, Card, CardContent } from "@stride-os/ui";
import { cn } from "@stride-os/ui/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { PageHeader } from "@/components/layout/page-header";
import { inventoryMarginPct, listInventoryCategories, listInventoryItems } from "@/lib/inventory";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function boolParam(value: string | string[] | undefined) {
  const raw = param(value);
  return raw === "1" || raw === "true" || raw === "on";
}

function marginTone(margin: number | null) {
  if (margin == null) return "muted";
  if (margin >= 60) return "green";
  if (margin >= 40) return "amber";
  return "red";
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const role = await getRole();
  const params = (await searchParams) ?? {};
  const supabase = await createClient();
  const { data: outlets } = await supabase
    .from("outlets")
    .select("id, name")
    .is("archived_at", null)
    .order("name");

  const selectedOutletId = param(params.outletId) ?? outlets?.[0]?.id ?? null;
  if (!selectedOutletId) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Inventory"
          title="Inventory items"
          subtitle="Create an outlet first so we have somewhere to attach item economics."
        />
      </div>
    );
  }

  const selectedOutlet =
    outlets?.find((outlet) => outlet.id === selectedOutletId) ?? outlets?.[0] ?? null;
  if (!selectedOutlet) redirect("/outlets");

  const filters = {
    q: param(params.q) ?? "",
    category: param(params.category) ?? "",
    includeInactive: boolParam(params.inactive),
  };

  const [items, categories] = await Promise.all([
    listInventoryItems(selectedOutlet.id, filters),
    listInventoryCategories(selectedOutlet.id),
  ]);

  const missingCost = items.filter((item) => item.cost_to_prepare_paise == null).length;
  const activeItems = items.filter((item) => item.is_active).length;
  const inactiveItems = items.filter((item) => !item.is_active).length;
  const averageMargin =
    items.length === 0
      ? null
      : (() => {
          const values = items
            .map((item) => inventoryMarginPct(item))
            .filter((value): value is number => value != null);
          if (values.length === 0) return null;
          return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
        })();

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow={`Inventory · ${selectedOutlet.name}`}
        title="Item economics."
        subtitle="A clean menu-item master with selling price, cost to prepare, and margin coverage for downstream profit views."
        actions={
          <div className="flex flex-wrap gap-3">
            {role === "partner" ? (
              <>
                <Button asChild variant="outline">
                  <Link href={`/inventory/import?outletId=${selectedOutlet.id}`}>
                    <Upload className="h-4 w-4" />
                    Import from sales
                  </Link>
                </Button>
                <Button asChild variant="primary">
                  <Link href={`/inventory/new?outletId=${selectedOutlet.id}`}>
                    <PackagePlus className="h-4 w-4" />
                    Add item
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        }
      />

      <section className="border-border shadow-card rounded-[28px] border bg-[radial-gradient(circle_at_top_left,hsl(var(--blue-soft))_0%,transparent_35%),linear-gradient(180deg,hsl(var(--paper))_0%,hsl(var(--paper-2))_100%)] p-6">
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div className="space-y-3">
            <p className="page-eyebrow">Unit economics</p>
            <h2 className="text-[clamp(2.2rem,4vw,3.6rem)] font-[var(--font-serif)] italic leading-[0.98] tracking-[-0.03em]">
              {items.length === 0
                ? "No menu items configured yet."
                : `${activeItems} active menu items now shape your future profit views.`}
            </h2>
            <p className="text-muted-foreground max-w-3xl text-sm leading-7">
              This phase stays intentionally lightweight: no stock movement ledger yet, just the
              cost keys needed for margin, COGS, and later sales analytics.
            </p>
          </div>

          <form
            action="/inventory"
            className="border-border bg-card/85 shadow-card grid gap-3 rounded-[22px] border p-4 sm:grid-cols-2"
          >
            <input type="hidden" name="outletId" value={selectedOutlet.id} />
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground font-medium">Search</span>
              <input
                name="q"
                defaultValue={filters.q}
                placeholder="Search by item or variation"
                className="border-border bg-background shadow-card h-11 w-full rounded-[14px] border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.24)]"
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-muted-foreground font-medium">Category</span>
              <select
                name="category"
                defaultValue={filters.category}
                className="border-border bg-background shadow-card h-11 w-full rounded-[14px] border px-4 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--accent)/0.24)]"
              >
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-muted-foreground flex items-center gap-3 text-sm">
              <input type="checkbox" name="inactive" defaultChecked={filters.includeInactive} />
              Show inactive items
            </label>
            <div className="flex items-end justify-end">
              <Button type="submit" variant="outline">
                Apply filters
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tracked items"
          value={items.length.toString()}
          note={`${activeItems} active · ${inactiveItems} inactive`}
        />
        <StatCard
          label="Missing costs"
          value={missingCost.toString()}
          note={missingCost === 0 ? "Full margin coverage" : "Fill these next"}
          tone={missingCost === 0 ? "green" : "amber"}
        />
        <StatCard
          label="Average margin"
          value={averageMargin == null ? "—" : `${averageMargin}%`}
          note={averageMargin == null ? "Waiting for costs" : "Across priced items"}
        />
        <StatCard
          label="Categories"
          value={categories.length.toString()}
          note="Filter and browse by menu group"
        />
      </section>

      {items.length === 0 ? (
        <Card className="border-border shadow-card rounded-[28px]">
          <CardContent className="space-y-4 p-8">
            <p className="section-card-title">No items yet</p>
            <p className="text-muted-foreground max-w-2xl text-sm leading-7">
              Either add items manually, or bootstrap from your past committed sales so costs are
              the only missing piece.
            </p>
            {role === "partner" ? (
              <div className="flex flex-wrap gap-3">
                <Button asChild variant="primary">
                  <Link href={`/inventory/new?outletId=${selectedOutlet.id}`}>
                    <PackagePlus className="h-4 w-4" />
                    Add item
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/inventory/import?outletId=${selectedOutlet.id}`}>
                    Import from sales history
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border shadow-card rounded-[28px]">
          <CardContent className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="bg-paper-subtle text-muted-foreground text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-5 py-4">Item</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4 text-right">Selling price</th>
                  <th className="px-5 py-4 text-right">Cost</th>
                  <th className="px-5 py-4 text-right">Margin</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const margin = inventoryMarginPct(item);
                  const tone = marginTone(margin);
                  return (
                    <tr key={item.id} className="border-border bg-card border-t">
                      <td className="px-5 py-4">
                        <div className="text-foreground font-medium">{item.item_name}</div>
                        {item.variation ? (
                          <div className="text-muted-foreground text-xs">{item.variation}</div>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        {item.category ? (
                          <span className="border-border bg-paper-subtle text-muted-foreground inline-flex rounded-full border px-2.5 py-1 text-xs">
                            {item.category}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-mono">
                        {formatINR(item.selling_price_paise / 100)}
                      </td>
                      <td className="px-5 py-4 text-right font-mono">
                        {item.cost_to_prepare_paise == null
                          ? "—"
                          : formatINR(item.cost_to_prepare_paise / 100)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
                            tone === "green" &&
                              "bg-[hsl(var(--green-soft))] text-[hsl(var(--green))]",
                            tone === "amber" &&
                              "bg-[hsl(var(--amber-soft))] text-[hsl(var(--amber))]",
                            tone === "red" && "bg-[hsl(var(--red-soft))] text-[hsl(var(--red))]",
                            tone === "muted" && "bg-paper-subtle text-muted-foreground"
                          )}
                        >
                          {margin == null ? "Pending" : `${margin.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
                            item.is_active
                              ? "bg-[hsl(var(--green-soft))] text-[hsl(var(--green))]"
                              : "bg-paper-subtle text-muted-foreground"
                          )}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {role === "partner" ? (
                          <Button asChild variant="outline" size="sm">
                            <Link href={`/inventory/${item.id}`}>Edit</Link>
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">Read only</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  note,
  tone = "default",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "green" | "amber";
}) {
  return (
    <Card className="border-border shadow-card rounded-[24px]">
      <CardContent className="space-y-3 p-5">
        <p className="section-card-title">{label}</p>
        <div
          className={cn(
            "text-foreground text-4xl font-semibold tracking-[-0.04em]",
            tone === "green" && "text-[hsl(var(--green))]",
            tone === "amber" && "text-[hsl(var(--amber))]"
          )}
        >
          {value}
        </div>
        <p className="text-muted-foreground text-sm">{note}</p>
      </CardContent>
    </Card>
  );
}
