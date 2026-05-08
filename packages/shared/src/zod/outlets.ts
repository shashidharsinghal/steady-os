import { z } from "zod";

export const outletFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  brand: z.string().min(1, "Brand is required"),
  status: z.enum(["active", "setup", "closed"]),
  address: z.string().optional(),
  phone: z.string().optional(),
  petpooja_restaurant_id: z.string().optional(),
  gst_number: z.string().optional(),
  fssai_license: z.string().optional(),
  opened_at: z.string().optional(),
});

export type OutletFormValues = z.infer<typeof outletFormSchema>;

export const createOutletSchema = outletFormSchema;
export const updateOutletSchema = outletFormSchema.partial().extend({
  name: z.string().min(1, "Name is required"),
  brand: z.string().min(1, "Brand is required"),
  status: z.enum(["active", "setup", "closed"]),
});

export type CreateOutletInput = z.infer<typeof createOutletSchema>;
export type UpdateOutletInput = z.infer<typeof updateOutletSchema>;

export const investmentConfigSchema = z.object({
  opened_on: z.string().min(1, "Opening date is required"),
  total_invested_rupees: z.coerce.number().positive("Investment must be greater than zero"),
  projected_breakeven_date: z.string().optional().or(z.literal("")),
});

export type InvestmentConfigInput = z.infer<typeof investmentConfigSchema>;
