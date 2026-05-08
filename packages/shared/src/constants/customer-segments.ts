export const CUSTOMER_SEGMENT_COLOR_OPTIONS = [
  "accent",
  "blue",
  "green",
  "red",
  "violet",
  "amber",
] as const;

export const CUSTOMER_SEGMENT_RULE_TYPES = [
  "first_seen_within_days",
  "order_count_in_window",
  "lapsed_from_segment",
  "returning_at_least_n",
] as const;

export const DEFAULT_CUSTOMER_SEGMENT_DEFINITIONS = [
  {
    slot: 1,
    name: "New customers",
    color_token: "blue",
    rule_type: "first_seen_within_days",
    rule_params: { days: 30 },
    display_order: 1,
  },
  {
    slot: 2,
    name: "Returning",
    color_token: "green",
    rule_type: "returning_at_least_n",
    rule_params: { min_orders: 2, last_seen_within_days: 30 },
    display_order: 2,
  },
  {
    slot: 3,
    name: "Lapsed regulars",
    color_token: "red",
    rule_type: "lapsed_from_segment",
    rule_params: { previously_in_slot: 4, silent_for_days: 30 },
    display_order: 3,
  },
  {
    slot: 4,
    name: "Champions",
    color_token: "accent",
    rule_type: "order_count_in_window",
    rule_params: { min_orders: 5, window_days: 90 },
    display_order: 4,
  },
] as const;
