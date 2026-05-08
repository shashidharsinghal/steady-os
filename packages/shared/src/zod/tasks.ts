import { z } from "zod";

export const taskStatusSchema = z.enum(["open", "in_progress", "blocked", "done", "cancelled"]);
export const taskCriticalitySchema = z.enum(["low", "medium", "high", "critical"]);
export const taskAreaSchema = z.enum([
  "operations",
  "food",
  "accounts",
  "maintenance",
  "people",
  "vendors",
  "marketing",
  "compliance",
  "other",
]);
export const taskAssigneeTypeSchema = z.enum(["user", "role"]);
export const taskRoleAssigneeSchema = z.enum(["store_manager"]);

const optionalTrimmedString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : null));

export const createTaskSchema = z
  .object({
    outlet_id: z.string().uuid(),
    title: z.string().trim().min(1, "Task title is required"),
    details: optionalTrimmedString,
    area: taskAreaSchema,
    criticality: taskCriticalitySchema,
    status: taskStatusSchema.default("open"),
    assignee_type: taskAssigneeTypeSchema,
    assignee_user_id: optionalTrimmedString,
    assignee_role: taskRoleAssigneeSchema.optional().nullable(),
    due_date: optionalTrimmedString,
  })
  .superRefine((value, ctx) => {
    if (value.assignee_type === "user" && !value.assignee_user_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assignee_user_id"],
        message: "Choose a person to assign the task",
      });
    }

    if (value.assignee_type === "role" && !value.assignee_role) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assignee_role"],
        message: "Choose a role to assign the task",
      });
    }
  });

export const updateTaskStatusSchema = z.object({
  id: z.string().uuid(),
  outlet_id: z.string().uuid(),
  status: taskStatusSchema,
});

export const deleteTaskSchema = z.object({
  id: z.string().uuid(),
  outlet_id: z.string().uuid(),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;
