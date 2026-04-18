import { z } from "zod";

const indianMobileRegex = /^[6-9]\d{9}$/;
const aadhaarLast4Regex = /^\d{4}$/;

const optionalTrimmedString = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? undefined : value))
  .optional();

const baseEmployeeSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  phone: z.string().trim().regex(indianMobileRegex, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().trim().email("Enter a valid email address").optional().or(z.literal("")),
  address: optionalTrimmedString,
  date_of_birth: optionalTrimmedString,
  joined_on: z.string().min(1, "Joining date is required"),
  left_on: optionalTrimmedString,
  role: z.enum(["manager", "staff", "cleaner"]),
  position: optionalTrimmedString,
  employment_type: z.enum(["full_time", "part_time"]),
  reports_to: optionalTrimmedString,
  current_outlet_id: optionalTrimmedString,
  emergency_contact_name: optionalTrimmedString,
  emergency_contact_phone: z
    .string()
    .trim()
    .regex(indianMobileRegex, "Enter a valid 10-digit Indian mobile number")
    .optional()
    .or(z.literal("")),
  aadhaar_last_4: z
    .string()
    .trim()
    .regex(aadhaarLast4Regex, "Enter the last 4 digits only")
    .optional()
    .or(z.literal("")),
  monthly_salary: z.coerce.number().nonnegative("Salary must be 0 or greater"),
});

function validateEmployeeDates(
  value: { joined_on?: string; left_on?: string },
  ctx: z.RefinementCtx
): void {
  if (!value.joined_on) {
    return;
  }

  if (value.left_on && value.left_on < value.joined_on) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["left_on"],
      message: "Left date cannot be before joining date",
    });
  }

  if (value.joined_on > new Date().toISOString().slice(0, 10)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["joined_on"],
      message: "Joining date cannot be in the future",
    });
  }
}

export const employeeFormSchema = baseEmployeeSchema.superRefine(validateEmployeeDates);

export const createEmployeeSchema = employeeFormSchema;

export const updateEmployeeSchema = baseEmployeeSchema
  .partial()
  .extend({
    full_name: z.string().trim().min(1, "Full name is required"),
    phone: z
      .string()
      .trim()
      .regex(indianMobileRegex, "Enter a valid 10-digit Indian mobile number"),
    joined_on: z.string().min(1, "Joining date is required"),
    role: z.enum(["manager", "staff", "cleaner"]),
    employment_type: z.enum(["full_time", "part_time"]),
  })
  .superRefine(validateEmployeeDates);

export const archiveEmployeeSchema = z.object({
  left_on: z.string().min(1, "Exit date is required"),
});

export const recordSalaryChangeSchema = z.object({
  monthly_salary: z.coerce.number().nonnegative("Salary must be 0 or greater"),
  effective_from: z.string().min(1, "Effective date is required"),
  reason: z.enum(["joining", "hike", "demotion", "correction"]),
});

export const employeeOutletAssignmentSchema = z.object({
  employee_id: z.string().uuid(),
  outlet_id: z.string().uuid(),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
export type ArchiveEmployeeInput = z.infer<typeof archiveEmployeeSchema>;
export type RecordSalaryChangeInput = z.infer<typeof recordSalaryChangeSchema>;
export type EmployeeOutletAssignmentInput = z.infer<typeof employeeOutletAssignmentSchema>;
