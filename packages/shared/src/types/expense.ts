export type ExpenseStatus =
  | "auto_scanned"
  | "needs_review"
  | "approved"
  | "paid"
  | "overdue"
  | "rejected"
  | "cancelled";

export type ExpenseSource = "manual" | "gmail_scan" | "petpooja_pnl" | "recurring_auto";

export type ExpenseTypeFilter = "all" | "recurring" | "oneoff";

export interface ExpenseBudget {
  id: string;
  outlet_id: string;
  category_id: string;
  monthly_budget_paise: number;
  effective_from: string;
  effective_to: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseBudgetSummaryRow {
  outlet_id: string;
  category_id: string;
  category_name: string;
  color_token: string;
  display_order: number;
  budget_id: string | null;
  monthly_budget_paise: number | null;
  spent_paise: number;
  pct_used: number | null;
}

export interface Expense {
  id: string;
  outlet_id: string;
  category_id: string;
  subcategory: string | null;
  vendor_name: string | null;
  description: string;
  for_item: string | null;
  period_label: string | null;
  amount_paise: number;
  tax_paise: number;
  total_paise: number;
  status: ExpenseStatus;
  invoice_date: string | null;
  due_date: string | null;
  paid_date: string | null;
  paid_via: string | null;
  paid_reference: string | null;
  source: ExpenseSource;
  source_email_id: string | null;
  source_email_addr: string | null;
  attachment_url: string | null;
  extraction_confidence: number | null;
  is_recurring: boolean;
  recurrence_period: string | null;
  recurring_parent_id: string | null;
  next_due_date: string | null;
  approved_at: string | null;
  approved_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ExpenseLedgerRow extends Expense {
  expense_categories: {
    name: string;
    color_token: string;
  } | null;
  outlets: {
    name: string;
  } | null;
  profiles?: {
    full_name: string | null;
  } | null;
}

export interface SpendOverview {
  month: string;
  totalSpentPaise: number;
  totalBudgetPaise: number;
  pctUsed: number | null;
  daysIntoMonth: number;
  daysInMonth: number;
  pacePct: number | null;
  recurringPct: number | null;
  byCategory: ExpenseBudgetSummaryRow[];
}

export interface PaginatedExpenses {
  rows: ExpenseLedgerRow[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PendingBillRow {
  id: string;
  vendor: string;
  forItem: string | null;
  description: string | null;
  period: string | null;
  invoiceDate: string | null;
  amountPaise: number;
  due: string | null;
  status: ExpenseStatus;
  sourceLabel: string;
  sourceEmail: string | null;
  extractionConfidence: number | null;
}

export interface PendingBillsSummary {
  bills: PendingBillRow[];
  totalPendingPaise: number;
  overdueCount: number;
  scannedThisWeekCount: number;
  gmailLastSync: string | null;
  gmailWatchedAliases: string[];
  gmailConnectedEmail: string | null;
}

export type ExpenseRecurrencePeriod = "weekly" | "monthly" | "quarterly" | "yearly";

export interface AddManualExpenseInput {
  outlet_id: string;
  category_id: string;
  vendor_name?: string | null;
  description: string;
  amount_rupees: number;
  tax_rupees?: number | null;
  invoice_date?: string | null;
  due_date?: string | null;
  paid_date?: string | null;
  is_recurring?: boolean;
  recurrence_period?: ExpenseRecurrencePeriod | null;
  next_due_date?: string | null;
}

export interface UpdateExpenseInput extends Partial<Omit<AddManualExpenseInput, "outlet_id">> {
  outlet_id: string;
  status?: ExpenseStatus;
}
