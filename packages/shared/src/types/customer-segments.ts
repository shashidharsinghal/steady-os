import type {
  CUSTOMER_SEGMENT_COLOR_OPTIONS,
  CUSTOMER_SEGMENT_RULE_TYPES,
} from "../constants/customer-segments";

export type CustomerSegmentColorToken = (typeof CUSTOMER_SEGMENT_COLOR_OPTIONS)[number];
export type CustomerSegmentRuleType = (typeof CUSTOMER_SEGMENT_RULE_TYPES)[number];

export type CustomerSegmentRuleParams =
  | { days: number }
  | { min_orders: number; window_days: number }
  | { previously_in_slot: number; silent_for_days: number }
  | { min_orders: number; last_seen_within_days: number };

export type CustomerSegmentDefinition = {
  id: string;
  outlet_id: string;
  slot: number;
  name: string;
  color_token: CustomerSegmentColorToken;
  rule_type: CustomerSegmentRuleType;
  rule_params: CustomerSegmentRuleParams;
  display_order: number;
  created_at: string;
  updated_at: string;
};
