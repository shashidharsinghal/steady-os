import type { EXPENSE_CATEGORY_COLOR_OPTIONS } from "../constants/expense-categories";

export type ExpenseCategoryColorToken = (typeof EXPENSE_CATEGORY_COLOR_OPTIONS)[number];

export type ExpenseCategory = {
  id: string;
  outlet_id: string;
  name: string;
  color_token: ExpenseCategoryColorToken;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};
