import type {
  AddManualExpenseInput,
  Expense,
  ExpenseBudget,
  ExpenseBudgetSummaryRow,
  ExpenseLedgerRow,
  ExpenseRecurrencePeriod,
  ExpenseTypeFilter,
  PendingBillsSummary,
  UpdateExpenseInput,
  PaginatedExpenses,
  SpendOverview,
} from "@stride-os/shared";
import { createClient } from "@/lib/supabase/server";

const PAGE_SIZE = 25;

function monthBounds(month?: string) {
  const now = new Date();
  const [yearRaw, monthRaw] = (month ?? "").split("-");
  const year = Number(yearRaw) || now.getFullYear();
  const monthIndex = Number(monthRaw) ? Number(monthRaw) - 1 : now.getMonth();
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 1));
  return {
    key: `${year}-${String(monthIndex + 1).padStart(2, "0")}`,
    start,
    end,
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function daysInMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
}

function daysIntoMonth(date: Date) {
  const now = new Date();
  const isCurrentMonth =
    now.getUTCFullYear() === date.getUTCFullYear() && now.getUTCMonth() === date.getUTCMonth();
  if (!isCurrentMonth) return daysInMonth(date);
  return Math.min(now.getUTCDate(), daysInMonth(date));
}

export async function listBudgets(outletId: string): Promise<ExpenseBudget[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expense_budgets")
    .select("*")
    .eq("outlet_id", outletId)
    .is("effective_to", null);

  if (error) throw new Error("Failed to load expense budgets");
  return (data ?? []) as ExpenseBudget[];
}

export async function upsertBudget(
  outletId: string,
  categoryId: string,
  monthlyBudgetPaise: number
): Promise<void> {
  const supabase = await createClient();
  const effectiveFrom = monthBounds().startDate;

  const { data: existing, error: existingError } = await supabase
    .from("expense_budgets")
    .select("id")
    .eq("outlet_id", outletId)
    .eq("category_id", categoryId)
    .is("effective_to", null)
    .maybeSingle();

  if (existingError) throw new Error("Failed to load expense budget");

  if (existing?.id) {
    const { error } = await supabase
      .from("expense_budgets")
      .update({ monthly_budget_paise: monthlyBudgetPaise, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw new Error("Failed to update expense budget");
    return;
  }

  const { error } = await supabase.from("expense_budgets").insert({
    outlet_id: outletId,
    category_id: categoryId,
    monthly_budget_paise: monthlyBudgetPaise,
    effective_from: effectiveFrom,
  });

  if (error) throw new Error("Failed to create expense budget");
}

export async function getSpendOverview(outletId: string, month?: string): Promise<SpendOverview> {
  const supabase = await createClient();
  const bounds = monthBounds(month);

  const [
    { data: categories, error: categoriesError },
    { data: budgets, error: budgetsError },
    { data: expenses, error: expensesError },
  ] = await Promise.all([
    supabase
      .from("expense_categories")
      .select("id, outlet_id, name, color_token, display_order")
      .eq("outlet_id", outletId)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("expense_budgets")
      .select("id, category_id, monthly_budget_paise, effective_to")
      .eq("outlet_id", outletId)
      .is("effective_to", null),
    supabase
      .from("expenses")
      .select(
        "category_id, total_paise, is_recurring, paid_date, due_date, invoice_date, created_at"
      )
      .eq("outlet_id", outletId)
      .in("status", ["paid", "approved"])
      .is("deleted_at", null)
      .gte("created_at", bounds.start.toISOString())
      .lt("created_at", bounds.end.toISOString()),
  ]);

  if (categoriesError) throw new Error("Failed to load expense categories");
  if (budgetsError) throw new Error("Failed to load expense budgets");
  if (expensesError) throw new Error("Failed to load expenses");

  const expenseRows = (expenses ?? []) as Array<{
    category_id: string;
    total_paise: number;
    is_recurring: boolean;
  }>;

  const spentByCategory = new Map<string, number>();
  let recurringPaise = 0;
  for (const expense of expenseRows) {
    const amount = Number(expense.total_paise) || 0;
    spentByCategory.set(
      expense.category_id,
      (spentByCategory.get(expense.category_id) ?? 0) + amount
    );
    if (expense.is_recurring) recurringPaise += amount;
  }

  const activeBudgets = new Map(
    (
      (budgets ?? []) as Array<{
        id: string;
        category_id: string;
        monthly_budget_paise: number;
        effective_to: string | null;
      }>
    ).map((budget) => [budget.category_id, budget])
  );

  const byCategory = (
    (categories ?? []) as Array<{
      id: string;
      outlet_id: string;
      name: string;
      color_token: string;
      display_order: number;
    }>
  ).map((category) => {
    const activeBudget = activeBudgets.get(category.id);
    const spentPaise = spentByCategory.get(category.id) ?? 0;
    const monthlyBudgetPaise = activeBudget?.monthly_budget_paise ?? null;
    return {
      outlet_id: category.outlet_id,
      category_id: category.id,
      category_name: category.name,
      color_token: category.color_token,
      display_order: category.display_order,
      budget_id: activeBudget?.id ?? null,
      monthly_budget_paise: monthlyBudgetPaise,
      spent_paise: spentPaise,
      pct_used:
        monthlyBudgetPaise && monthlyBudgetPaise > 0
          ? Number(((spentPaise / monthlyBudgetPaise) * 100).toFixed(2))
          : null,
    } satisfies ExpenseBudgetSummaryRow;
  });

  const totalSpentPaise = byCategory.reduce((sum, row) => sum + row.spent_paise, 0);
  const totalBudgetPaise = byCategory.reduce(
    (sum, row) => sum + (row.monthly_budget_paise ?? 0),
    0
  );
  const pctUsed =
    totalBudgetPaise > 0 ? Number(((totalSpentPaise / totalBudgetPaise) * 100).toFixed(2)) : null;
  const elapsed = daysIntoMonth(bounds.start);
  const totalDays = daysInMonth(bounds.start);
  const expectedPct = (elapsed / totalDays) * 100;

  return {
    month: bounds.key,
    totalSpentPaise,
    totalBudgetPaise,
    pctUsed,
    daysIntoMonth: elapsed,
    daysInMonth: totalDays,
    pacePct: pctUsed == null ? null : Number((pctUsed - expectedPct).toFixed(1)),
    recurringPct:
      totalSpentPaise > 0 ? Number(((recurringPaise / totalSpentPaise) * 100).toFixed(1)) : null,
    byCategory,
  };
}

export async function listExpenses(
  outletId: string,
  filters: { type?: ExpenseTypeFilter } = {},
  page = 1
): Promise<PaginatedExpenses> {
  const supabase = await createClient();
  const currentPage = Math.max(1, page);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("expenses")
    .select("*, expense_categories(name, color_token), outlets(name)", { count: "exact" })
    .eq("outlet_id", outletId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.type === "recurring") query = query.eq("is_recurring", true);
  if (filters.type === "oneoff") query = query.eq("is_recurring", false);

  const { data, error, count } = await query;
  if (error) throw new Error("Failed to load expense ledger");

  return {
    rows: (data ?? []) as ExpenseLedgerRow[],
    page: currentPage,
    pageSize: PAGE_SIZE,
    total: count ?? 0,
  };
}

function paise(value: number | null | undefined) {
  return Math.round((value ?? 0) * 100);
}

function addPeriod(date: Date, period: ExpenseRecurrencePeriod) {
  const next = new Date(date);
  if (period === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  if (period === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  if (period === "quarterly") next.setUTCMonth(next.getUTCMonth() + 3);
  if (period === "yearly") next.setUTCFullYear(next.getUTCFullYear() + 1);
  return next.toISOString().slice(0, 10);
}

export async function addManualExpense(
  input: AddManualExpenseInput,
  userId: string
): Promise<Expense> {
  const supabase = await createClient();
  const amountPaise = paise(input.amount_rupees);
  const taxPaise = paise(input.tax_rupees);
  const totalPaise = amountPaise + taxPaise;
  const paidDate = input.paid_date || null;

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      outlet_id: input.outlet_id,
      category_id: input.category_id,
      vendor_name: input.vendor_name || null,
      description: input.description,
      amount_paise: amountPaise,
      tax_paise: taxPaise,
      total_paise: totalPaise,
      status: paidDate ? "paid" : "approved",
      invoice_date: input.invoice_date || null,
      due_date: input.due_date || null,
      paid_date: paidDate,
      source: "manual",
      is_recurring: input.is_recurring ?? false,
      recurrence_period: input.is_recurring ? (input.recurrence_period ?? null) : null,
      next_due_date: input.is_recurring
        ? input.next_due_date ||
          input.due_date ||
          input.invoice_date ||
          new Date().toISOString().slice(0, 10)
        : null,
      approved_at: new Date().toISOString(),
      approved_by: userId,
      created_by: userId,
    })
    .select("*")
    .single();

  if (error) throw new Error("Failed to add expense");
  return data as Expense;
}

export async function updateExpense(
  id: string,
  input: UpdateExpenseInput,
  _userId: string
): Promise<Expense> {
  const supabase = await createClient();
  const amountPaise = input.amount_rupees == null ? undefined : paise(input.amount_rupees);
  const taxPaise = input.tax_rupees == null ? undefined : paise(input.tax_rupees);
  const totalPaise =
    amountPaise == null && taxPaise == null ? undefined : (amountPaise ?? 0) + (taxPaise ?? 0);

  const { data, error } = await supabase
    .from("expenses")
    .update({
      category_id: input.category_id,
      vendor_name: input.vendor_name,
      description: input.description,
      amount_paise: amountPaise,
      tax_paise: taxPaise,
      total_paise: totalPaise,
      status: input.status,
      invoice_date: input.invoice_date,
      due_date: input.due_date,
      paid_date: input.paid_date,
      is_recurring: input.is_recurring,
      recurrence_period: input.recurrence_period,
      next_due_date: input.next_due_date,
    })
    .eq("id", id)
    .eq("outlet_id", input.outlet_id)
    .select("*")
    .single();

  if (error) throw new Error("Failed to update expense");
  return data as Expense;
}

export async function markExpensePaid(
  id: string,
  input: { outletId: string; paidVia?: string | null; paidDate: string; reference?: string | null }
): Promise<Expense> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("expenses")
    .update({
      status: "paid",
      paid_via: input.paidVia || null,
      paid_date: input.paidDate,
      paid_reference: input.reference || null,
    })
    .eq("id", id)
    .eq("outlet_id", input.outletId)
    .select("*")
    .single();

  if (error) throw new Error("Failed to mark expense paid");
  return data as Expense;
}

export async function deleteExpense(id: string, outletId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .eq("outlet_id", outletId);

  if (error) throw new Error("Failed to delete expense");
}

export async function generateRecurringExpenses(): Promise<{ created: number; advanced: number }> {
  const supabase = await createClient();
  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + 7);

  const { data: templates, error } = await supabase
    .from("expenses")
    .select("*")
    .eq("is_recurring", true)
    .is("recurring_parent_id", null)
    .is("deleted_at", null)
    .not("next_due_date", "is", null)
    .lte("next_due_date", horizon.toISOString().slice(0, 10));

  if (error) throw new Error("Failed to load recurring expenses");

  let created = 0;
  let advanced = 0;
  for (const template of (templates ?? []) as Expense[]) {
    if (!template.next_due_date || !template.recurrence_period) continue;
    const { data: existing } = await supabase
      .from("expenses")
      .select("id")
      .eq("recurring_parent_id", template.id)
      .eq("due_date", template.next_due_date)
      .maybeSingle();

    if (!existing) {
      const { error: insertError } = await supabase.from("expenses").insert({
        outlet_id: template.outlet_id,
        category_id: template.category_id,
        vendor_name: template.vendor_name,
        description: template.description,
        amount_paise: template.amount_paise,
        tax_paise: template.tax_paise,
        total_paise: template.total_paise,
        status: "approved",
        invoice_date: template.next_due_date,
        due_date: template.next_due_date,
        source: "recurring_auto",
        is_recurring: false,
        recurring_parent_id: template.id,
        created_by: template.created_by,
        approved_at: new Date().toISOString(),
        approved_by: template.approved_by,
      });
      if (insertError) throw new Error("Failed to create recurring expense");
      created += 1;
    }

    const nextDueDate = addPeriod(
      new Date(`${template.next_due_date}T00:00:00.000Z`),
      template.recurrence_period as ExpenseRecurrencePeriod
    );
    const { error: updateError } = await supabase
      .from("expenses")
      .update({ next_due_date: nextDueDate })
      .eq("id", template.id);
    if (updateError) throw new Error("Failed to advance recurring expense");
    advanced += 1;
  }

  return { created, advanced };
}

export async function listPendingBills(outletId: string): Promise<PendingBillsSummary> {
  const supabase = await createClient();
  const weekStart = new Date();
  weekStart.setUTCDate(weekStart.getUTCDate() - 7);

  const [{ data: bills, error }, { data: connection }] = await Promise.all([
    supabase
      .from("expenses")
      .select("*")
      .eq("outlet_id", outletId)
      .in("status", ["auto_scanned", "needs_review", "overdue"])
      .is("deleted_at", null)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("gmail_connections")
      .select("gmail_address, last_sync_at")
      .eq("outlet_id", outletId)
      .maybeSingle(),
  ]);

  if (error) throw new Error("Failed to load pending bills");
  const rows = (bills ?? []) as Expense[];
  const today = new Date().toISOString().slice(0, 10);

  return {
    bills: rows.map((bill) => ({
      id: bill.id,
      vendor: bill.vendor_name ?? "Unknown vendor",
      forItem: bill.for_item,
      description: bill.description,
      period: bill.period_label,
      invoiceDate: bill.invoice_date,
      amountPaise: bill.total_paise,
      due: bill.due_date,
      status: bill.due_date && bill.due_date < today ? "overdue" : bill.status,
      sourceLabel:
        bill.source === "gmail_scan"
          ? "Gmail"
          : bill.source === "recurring_auto"
            ? "Recurring"
            : "Manual",
      sourceEmail: bill.source_email_addr,
      extractionConfidence: bill.extraction_confidence,
    })),
    totalPendingPaise: rows.reduce((sum, row) => sum + row.total_paise, 0),
    overdueCount: rows.filter((row) => row.due_date && row.due_date < today).length,
    scannedThisWeekCount: rows.filter(
      (row) => row.source === "gmail_scan" && new Date(row.created_at) >= weekStart
    ).length,
    gmailLastSync: connection?.last_sync_at ?? null,
    gmailWatchedAliases: ["billing@", "accounts@", "invoice@"],
    gmailConnectedEmail: connection?.gmail_address ?? null,
  };
}

export async function approveBill(id: string, outletId: string, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: userId })
    .eq("id", id)
    .eq("outlet_id", outletId);
  if (error) throw new Error("Failed to approve bill");
}

export async function rejectBill(id: string, outletId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("expenses")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("outlet_id", outletId);
  if (error) throw new Error("Failed to reject bill");
}
