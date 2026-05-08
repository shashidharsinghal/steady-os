import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, ReceiptText, WalletCards } from "lucide-react";
import { formatDate, formatINR } from "@stride-os/shared";
import { Button, Card, CardContent } from "@stride-os/ui";
import { cn } from "@stride-os/ui/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { getRole } from "@/lib/auth";
import { getSpendOverview, listExpenses, listPendingBills } from "@/lib/expenses";
import { createClient } from "@/lib/supabase/server";
import { AddManualExpenseDialog } from "./_components/AddManualExpenseDialog";
import { approveBillAction, rejectBillAction, upsertBudgetAction } from "./actions";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function param(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function money(paise: number) {
  return formatINR(paise / 100);
}

function monthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const safeYear = year ?? new Date().getFullYear();
  const safeMonth = monthNumber ?? 1;
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(
    new Date(Date.UTC(safeYear, safeMonth - 1, 1))
  );
}

function colorStyle(token: string) {
  return { backgroundColor: `hsl(var(--${token}))` };
}

function progressTone(pct: number | null) {
  if (pct == null) return "ink";
  if (pct > 95) return "red";
  if (pct >= 80) return "amber";
  return "ink";
}

export default async function ExpensesPage({ searchParams }: PageProps) {
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
          eyebrow="Expenses"
          title="Spend overview"
          subtitle="Create an outlet first so budgets and expense rows have somewhere to land."
        />
      </div>
    );
  }

  const selectedOutlet =
    outlets?.find((outlet) => outlet.id === selectedOutletId) ?? outlets?.[0] ?? null;
  if (!selectedOutlet) redirect("/outlets");

  const type = param(params.type);
  const tab = param(params.tab) === "pending" ? "pending" : "overview";
  const filterType = type === "recurring" || type === "oneoff" ? type : "all";
  const page = Number(param(params.page) ?? "1") || 1;
  const month = param(params.month);

  const [overview, ledger, pendingBills] = await Promise.all([
    getSpendOverview(selectedOutlet.id, month),
    listExpenses(selectedOutlet.id, { type: filterType }, page),
    listPendingBills(selectedOutlet.id),
  ]);

  const monthName = monthLabel(overview.month);
  const hasNextPage = ledger.page * ledger.pageSize < ledger.total;
  const baseParams = new URLSearchParams({ outletId: selectedOutlet.id, type: filterType });
  if (month) baseParams.set("month", month);

  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        eyebrow={`Expenses · ${selectedOutlet.name}`}
        title="Spend overview."
        subtitle="Budget pacing, category spend, and the operating expense ledger for the selected outlet."
        actions={
          <div className="flex flex-wrap items-end gap-3">
            <form action="/expenses" className="flex flex-wrap items-end gap-3">
              <input type="hidden" name="outletId" value={selectedOutlet.id} />
              <input type="hidden" name="type" value={filterType} />
              <label className="text-muted-foreground space-y-1 text-xs font-medium">
                Month
                <input
                  type="month"
                  name="month"
                  defaultValue={overview.month}
                  className="border-border bg-background text-foreground h-9 rounded-[10px] border px-3 text-sm"
                />
              </label>
              <Button type="submit" variant="outline" size="sm">
                Apply
              </Button>
            </form>
            {role === "partner" ? (
              <AddManualExpenseDialog
                outletId={selectedOutlet.id}
                categories={overview.byCategory.map((category) => ({
                  id: category.category_id,
                  name: category.category_name,
                }))}
              />
            ) : null}
          </div>
        }
      />

      <div className="border-border bg-paper-subtle flex rounded-[14px] border p-1">
        {(
          [
            ["overview", "Spend overview"],
            ["pending", `Pending bills (${pendingBills.bills.length})`],
          ] as const
        ).map(([value, label]) => {
          const next = new URLSearchParams({ outletId: selectedOutlet.id });
          next.set("tab", value);
          return (
            <Link
              key={value}
              href={`/expenses?${next.toString()}`}
              className={cn(
                "rounded-[10px] px-4 py-2 text-sm font-semibold",
                tab === value ? "bg-foreground text-background" : "text-muted-foreground"
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>

      {tab === "pending" ? (
        <PendingBillsSection outletId={selectedOutlet.id} data={pendingBills} />
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-12">
            <Card className="xl:col-span-5">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="page-eyebrow">{monthName}</p>
                    <h2 className="section-card-title">Spend so far</h2>
                  </div>
                  <WalletCards className="text-muted-foreground h-5 w-5" />
                </div>
                <div className="font-mono text-4xl font-semibold tracking-[-0.04em]">
                  {money(overview.totalSpentPaise)}
                </div>
                <p className="text-muted-foreground text-sm">
                  {overview.totalBudgetPaise > 0
                    ? `of ${money(overview.totalBudgetPaise)} monthly budget · ${overview.pctUsed?.toFixed(1)}% used`
                    : "No monthly budget set yet"}
                </p>
                <ProgressBar pct={overview.pctUsed} tone={progressTone(overview.pctUsed)} />
                <div className="grid gap-3 sm:grid-cols-3">
                  <MiniStat
                    label="Days into month"
                    value={`${overview.daysIntoMonth} of ${overview.daysInMonth}`}
                  />
                  <MiniStat
                    label="Pace"
                    value={
                      overview.pacePct == null
                        ? "Pending"
                        : `${overview.pacePct > 0 ? "+" : ""}${overview.pacePct.toFixed(1)}%`
                    }
                    tone={overview.pacePct != null && overview.pacePct > 0 ? "amber" : "default"}
                  />
                  <MiniStat
                    label="Recurring"
                    value={
                      overview.recurringPct == null ? "0%" : `${overview.recurringPct.toFixed(1)}%`
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="xl:col-span-7">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="page-eyebrow">By category</p>
                    <h2 className="section-card-title">Budget versus actual</h2>
                  </div>
                  <ReceiptText className="text-muted-foreground h-5 w-5" />
                </div>
                <div className="space-y-4">
                  {overview.byCategory.map((category) => (
                    <div key={category.category_id} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-3">
                        <span
                          className="h-3 w-3 rounded-[4px]"
                          style={colorStyle(category.color_token)}
                        />
                        <span className="min-w-[7rem] flex-1 text-sm font-semibold">
                          {category.category_name}
                        </span>
                        <span className="font-mono text-sm font-semibold">
                          {money(category.spent_paise)}
                        </span>
                        {category.monthly_budget_paise == null ? (
                          role === "partner" ? (
                            <BudgetForm
                              outletId={selectedOutlet.id}
                              categoryId={category.category_id}
                              defaultValue=""
                              compact
                            />
                          ) : (
                            <span className="text-muted-foreground text-xs">No budget</span>
                          )
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            of {money(category.monthly_budget_paise)} ·{" "}
                            {category.pct_used == null ? "—" : `${category.pct_used.toFixed(1)}%`}
                          </span>
                        )}
                      </div>
                      <ProgressBar pct={category.pct_used} tone={progressTone(category.pct_used)} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>

          <Card>
            <CardContent className="p-0">
              <div className="border-border flex flex-wrap items-center justify-between gap-3 border-b p-5">
                <div>
                  <p className="page-eyebrow">Ledger</p>
                  <h2 className="section-card-title">Expense ledger</h2>
                </div>
                <div className="border-border bg-paper-subtle flex rounded-[12px] border p-1">
                  {(
                    [
                      ["all", "All"],
                      ["recurring", "Recurring"],
                      ["oneoff", "One-off"],
                    ] as const
                  ).map(([value, label]) => {
                    const nextParams = new URLSearchParams(baseParams);
                    nextParams.set("type", value);
                    nextParams.delete("page");
                    return (
                      <Link
                        key={value}
                        href={`/expenses?${nextParams.toString()}`}
                        className={cn(
                          "rounded-[9px] px-3 py-1.5 text-xs font-semibold",
                          filterType === value
                            ? "bg-foreground text-background"
                            : "text-muted-foreground"
                        )}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {ledger.rows.length === 0 ? (
                <div className="space-y-3 p-8">
                  <p className="text-lg font-semibold">No expenses found</p>
                  <p className="text-muted-foreground max-w-2xl text-sm leading-7">
                    Add a manual expense to start the ledger, or let recurring templates generate
                    upcoming rows through the nightly cron.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px] text-sm">
                    <thead className="bg-paper-subtle text-muted-foreground text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                      <tr>
                        <th className="px-5 py-4">Date</th>
                        <th className="px-5 py-4">Category</th>
                        <th className="px-5 py-4">Vendor</th>
                        <th className="px-5 py-4">Outlet</th>
                        <th className="px-5 py-4">Note</th>
                        <th className="px-5 py-4">Type</th>
                        <th className="px-5 py-4">Source</th>
                        <th className="px-5 py-4 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.rows.map((expense) => (
                        <tr key={expense.id} className="border-border border-t">
                          <td className="px-5 py-4 font-mono text-xs">
                            {formatDate(
                              expense.paid_date ??
                                expense.due_date ??
                                expense.invoice_date ??
                                expense.created_at
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-[4px]"
                                style={colorStyle(
                                  expense.expense_categories?.color_token ?? "muted"
                                )}
                              />
                              {expense.expense_categories?.name ?? "Uncategorized"}
                            </span>
                          </td>
                          <td className="px-5 py-4">{expense.vendor_name ?? "—"}</td>
                          <td className="text-muted-foreground px-5 py-4">
                            {expense.outlets?.name ?? selectedOutlet.name}
                          </td>
                          <td className="text-muted-foreground max-w-[240px] truncate px-5 py-4">
                            {expense.description}
                          </td>
                          <td className="px-5 py-4">
                            <span className="inline-flex rounded-full bg-[hsl(var(--blue-soft))] px-2.5 py-1 text-xs font-semibold text-[hsl(var(--blue))]">
                              {expense.is_recurring ? "Recurring" : "One-off"}
                            </span>
                          </td>
                          <td className="text-muted-foreground px-5 py-4 text-xs">
                            {sourceLabel(expense.source)}
                          </td>
                          <td className="px-5 py-4 text-right font-mono font-semibold">
                            {money(expense.total_paise)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-border text-muted-foreground flex items-center justify-between border-t p-5 text-sm">
                <span>
                  {ledger.total === 0
                    ? "No rows"
                    : `Showing ${(ledger.page - 1) * ledger.pageSize + 1}-${Math.min(
                        ledger.page * ledger.pageSize,
                        ledger.total
                      )} of ${ledger.total}`}
                </span>
                <div className="flex gap-2">
                  <PagerLink
                    disabled={ledger.page <= 1}
                    params={baseParams}
                    page={ledger.page - 1}
                    direction="prev"
                  />
                  <PagerLink
                    disabled={!hasNextPage}
                    params={baseParams}
                    page={ledger.page + 1}
                    direction="next"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {role === "partner" &&
          overview.byCategory.some((row) => row.monthly_budget_paise != null) ? (
            <Card>
              <CardContent className="space-y-4 p-6">
                <div>
                  <p className="page-eyebrow">Budgets</p>
                  <h2 className="section-card-title">Adjust category budgets</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {overview.byCategory.map((category) => (
                    <BudgetForm
                      key={category.category_id}
                      outletId={selectedOutlet.id}
                      categoryId={category.category_id}
                      label={category.category_name}
                      defaultValue={
                        category.monthly_budget_paise == null
                          ? ""
                          : String(category.monthly_budget_paise / 100)
                      }
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

function PendingBillsSection({
  outletId,
  data,
}: {
  outletId: string;
  data: Awaited<ReturnType<typeof listPendingBills>>;
}) {
  return (
    <div className="space-y-4">
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          label="Total pending"
          value={money(data.totalPendingPaise)}
          note={`${data.bills.length} bills awaiting approval`}
        />
        <StatCard
          label="Overdue"
          value={String(data.overdueCount)}
          note="Past due date"
          tone="red"
        />
        <StatCard
          label="Auto-scanned this week"
          value={String(data.scannedThisWeekCount)}
          note={
            data.gmailLastSync ? `Last sync ${formatDate(data.gmailLastSync)}` : "No Gmail sync yet"
          }
          tone="green"
        />
      </section>

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="section-card-title">
              {data.gmailConnectedEmail ? "Gmail scan active" : "Gmail not connected"}
            </p>
            <p className="text-muted-foreground text-sm">
              {data.gmailConnectedEmail
                ? `Watching billing/account aliases on ${data.gmailConnectedEmail}`
                : "Connect Gmail from Admin to auto-detect vendor bills."}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin/integrations#gmail">Gmail settings</Link>
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {data.bills.length === 0 ? (
            <div className="text-muted-foreground p-8 text-sm">
              No bills are waiting for review.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-paper-subtle text-muted-foreground text-left text-[11px] font-semibold uppercase tracking-[0.18em]">
                  <tr>
                    <th className="px-5 py-4">Vendor / For</th>
                    <th className="px-5 py-4">Period / Bill date</th>
                    <th className="px-5 py-4">Due</th>
                    <th className="px-5 py-4 text-right">Amount</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Initiated from</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.bills.map((bill) => (
                    <tr key={bill.id} className="border-border border-t">
                      <td className="px-5 py-4">
                        <div className="font-medium">{bill.vendor}</div>
                        <div className="text-muted-foreground text-xs">
                          {bill.forItem ?? "Operating expense"}
                        </div>
                        {bill.description ? (
                          <div className="text-muted-foreground mt-1 text-xs">
                            {bill.description}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <div>{bill.period ?? "—"}</div>
                        <div className="text-muted-foreground text-xs">
                          {bill.invoiceDate
                            ? `Bill ${formatDate(bill.invoiceDate)}`
                            : "Bill date —"}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs">
                        {bill.due ? formatDate(bill.due) : "—"}
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-semibold">
                        {money(bill.amountPaise)}
                      </td>
                      <td className="px-5 py-4">
                        <StatusPill status={bill.status} />
                      </td>
                      <td className="text-muted-foreground px-5 py-4 text-xs">
                        {bill.sourceLabel}
                        {bill.extractionConfidence != null
                          ? ` · ${bill.extractionConfidence.toFixed(0)}%`
                          : ""}
                        {bill.sourceEmail ? ` · ${bill.sourceEmail}` : ""}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <form action={approveBillAction}>
                            <input type="hidden" name="id" value={bill.id} />
                            <input type="hidden" name="outlet_id" value={outletId} />
                            <Button type="submit" variant="primary" size="sm">
                              Approve
                            </Button>
                          </form>
                          <form action={rejectBillAction}>
                            <input type="hidden" name="id" value={bill.id} />
                            <input type="hidden" name="outlet_id" value={outletId} />
                            <Button type="submit" variant="outline" size="sm">
                              Reject
                            </Button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressBar({ pct, tone }: { pct: number | null; tone: "ink" | "amber" | "red" }) {
  const width = Math.min(Math.max(pct ?? 0, 0), 100);
  return (
    <div className="bg-paper-subtle h-2 overflow-hidden rounded-full">
      <div
        className={cn(
          "h-full rounded-full",
          tone === "ink" && "bg-foreground",
          tone === "amber" && "bg-[hsl(var(--amber))]",
          tone === "red" && "bg-[hsl(var(--red))]"
        )}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "amber";
}) {
  return (
    <div className="border-border bg-paper-subtle rounded-[14px] border p-3">
      <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-[0.16em]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-mono text-sm font-semibold",
          tone === "amber" && "text-[hsl(var(--amber))]"
        )}
      >
        {value}
      </p>
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
  tone?: "default" | "green" | "red";
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <p className="page-eyebrow !mb-0">{label}</p>
        <p
          className={cn(
            "font-mono text-3xl font-semibold tracking-[-0.04em]",
            tone === "green" && "text-[hsl(var(--green))]",
            tone === "red" && "text-[hsl(var(--red))]"
          )}
        >
          {value}
        </p>
        <p className="text-muted-foreground text-sm">{note}</p>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "overdue"
      ? "red"
      : status === "needs_review"
        ? "amber"
        : status === "approved"
          ? "green"
          : "blue";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
        tone === "red" && "bg-[hsl(var(--red-soft))] text-[hsl(var(--red))]",
        tone === "amber" && "bg-[hsl(var(--amber-soft))] text-[hsl(var(--amber))]",
        tone === "green" && "bg-[hsl(var(--green-soft))] text-[hsl(var(--green))]",
        tone === "blue" && "bg-[hsl(var(--blue-soft))] text-[hsl(var(--blue))]"
      )}
    >
      {status.replace("_", " ")}
    </span>
  );
}

function BudgetForm({
  outletId,
  categoryId,
  label,
  defaultValue,
  compact = false,
}: {
  outletId: string;
  categoryId: string;
  label?: string;
  defaultValue: string;
  compact?: boolean;
}) {
  return (
    <form
      action={upsertBudgetAction}
      className={cn("flex items-end gap-2", !compact && "border-border rounded-[14px] border p-3")}
    >
      <input type="hidden" name="outlet_id" value={outletId} />
      <input type="hidden" name="category_id" value={categoryId} />
      <label
        className={cn(
          "text-muted-foreground space-y-1 text-xs font-medium",
          compact ? "w-28" : "flex-1"
        )}
      >
        {label ?? "Budget"}
        <input
          name="monthly_budget_rupees"
          type="number"
          min="0"
          step="1"
          placeholder="Monthly ₹"
          defaultValue={defaultValue}
          className="border-border bg-background text-foreground h-9 w-full rounded-[10px] border px-3 text-sm"
        />
      </label>
      <Button type="submit" variant="outline" size="sm">
        Save
      </Button>
    </form>
  );
}

function PagerLink({
  disabled,
  params,
  page,
  direction,
}: {
  disabled: boolean;
  params: URLSearchParams;
  page: number;
  direction: "prev" | "next";
}) {
  const nextParams = new URLSearchParams(params);
  nextParams.set("page", String(page));
  const content =
    direction === "prev" ? (
      <>
        <ArrowLeft className="h-4 w-4" />
        Previous
      </>
    ) : (
      <>
        Next
        <ArrowRight className="h-4 w-4" />
      </>
    );

  if (disabled) {
    return (
      <span className="border-border inline-flex h-8 items-center gap-2 rounded-[10px] border px-3 text-xs opacity-45">
        {content}
      </span>
    );
  }

  return (
    <Button asChild variant="outline" size="sm">
      <Link href={`/expenses?${nextParams.toString()}`}>{content}</Link>
    </Button>
  );
}

function sourceLabel(source: string) {
  if (source === "gmail_scan") return "Gmail scan";
  if (source === "petpooja_pnl") return "Petpooja P&L";
  if (source === "recurring_auto") return "Recurring auto";
  return "Manual";
}
