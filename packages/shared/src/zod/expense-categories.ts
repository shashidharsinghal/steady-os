import { z } from "zod";
import { EXPENSE_CATEGORY_COLOR_OPTIONS } from "../constants/expense-categories";

export const expenseCategoryColorSchema = z.enum(EXPENSE_CATEGORY_COLOR_OPTIONS);

export const expenseCategorySchema = z.object({
  id: z.string().uuid().optional(),
  outlet_id: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  color_token: expenseCategoryColorSchema,
  is_active: z.boolean(),
  display_order: z.number().int().min(1),
});

export const createExpenseCategorySchema = expenseCategorySchema.omit({
  id: true,
  is_active: true,
});

export const updateExpenseCategorySchema = expenseCategorySchema.partial().extend({
  outlet_id: z.string().uuid(),
});

export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
export type CreateExpenseCategoryInput = z.infer<typeof createExpenseCategorySchema>;
export type UpdateExpenseCategoryInput = z.infer<typeof updateExpenseCategorySchema>;
