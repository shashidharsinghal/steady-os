import { z } from "zod";

export const expenseTypeFilterSchema = z.enum(["all", "recurring", "oneoff"]);

export const upsertExpenseBudgetSchema = z.object({
  outlet_id: z.string().uuid(),
  category_id: z.string().uuid(),
  monthly_budget_rupees: z.coerce.number().min(0, "Budget cannot be negative"),
});

export const expenseRecurrencePeriodSchema = z.enum(["weekly", "monthly", "quarterly", "yearly"]);

const optionalDateSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

const manualExpenseBaseSchema = z.object({
  outlet_id: z.string().uuid(),
  category_id: z.string().uuid(),
  vendor_name: z.string().trim().optional().nullable(),
  description: z.string().trim().min(1, "Description is required"),
  amount_rupees: z.coerce.number().min(0, "Amount cannot be negative"),
  tax_rupees: z.coerce.number().min(0, "Tax cannot be negative").optional().nullable(),
  invoice_date: optionalDateSchema,
  due_date: optionalDateSchema,
  paid_date: optionalDateSchema,
  is_recurring: z.coerce.boolean().default(false),
  recurrence_period: expenseRecurrencePeriodSchema.optional().nullable(),
  next_due_date: optionalDateSchema,
});

export const addManualExpenseSchema = manualExpenseBaseSchema.refine(
  (value) => !value.is_recurring || Boolean(value.recurrence_period),
  {
    path: ["recurrence_period"],
    message: "Choose a recurrence period",
  }
);

export const updateExpenseSchema = manualExpenseBaseSchema.partial().extend({
  outlet_id: z.string().uuid(),
});

export type UpsertExpenseBudgetInput = z.infer<typeof upsertExpenseBudgetSchema>;
