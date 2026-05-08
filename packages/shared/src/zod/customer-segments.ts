import { z } from "zod";
import {
  CUSTOMER_SEGMENT_COLOR_OPTIONS,
  CUSTOMER_SEGMENT_RULE_TYPES,
} from "../constants/customer-segments";

export const customerSegmentColorTokenSchema = z.enum(CUSTOMER_SEGMENT_COLOR_OPTIONS);
export const customerSegmentRuleTypeSchema = z.enum(CUSTOMER_SEGMENT_RULE_TYPES);

export const customerSegmentDefinitionSchema = z
  .object({
    id: z.string().uuid(),
    outlet_id: z.string().uuid(),
    slot: z.number().int().min(1).max(4),
    name: z.string().min(1, "Name is required"),
    color_token: customerSegmentColorTokenSchema,
    rule_type: customerSegmentRuleTypeSchema,
    rule_params: z.record(z.string(), z.number()),
    display_order: z.number().int().min(1).max(4),
  })
  .superRefine((value, ctx) => {
    if (value.rule_type === "first_seen_within_days") {
      if (!value.rule_params.days || value.rule_params.days < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Days must be at least 1",
          path: ["rule_params", "days"],
        });
      }
      return;
    }

    if (value.rule_type === "order_count_in_window") {
      if (!value.rule_params.min_orders || value.rule_params.min_orders < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Minimum orders must be at least 1",
          path: ["rule_params", "min_orders"],
        });
      }
      if (!value.rule_params.window_days || value.rule_params.window_days < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Window days must be at least 1",
          path: ["rule_params", "window_days"],
        });
      }
      return;
    }

    if (value.rule_type === "lapsed_from_segment") {
      if (!value.rule_params.previously_in_slot || value.rule_params.previously_in_slot < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Previous slot must be between 1 and 4",
          path: ["rule_params", "previously_in_slot"],
        });
      }
      if (!value.rule_params.silent_for_days || value.rule_params.silent_for_days < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Silent days must be at least 1",
          path: ["rule_params", "silent_for_days"],
        });
      }
      return;
    }

    if (!value.rule_params.min_orders || value.rule_params.min_orders < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum orders must be at least 1",
        path: ["rule_params", "min_orders"],
      });
    }
    if (!value.rule_params.last_seen_within_days || value.rule_params.last_seen_within_days < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Last-seen window must be at least 1 day",
        path: ["rule_params", "last_seen_within_days"],
      });
    }
  });

export type CustomerSegmentDefinitionInput = z.infer<typeof customerSegmentDefinitionSchema>;
