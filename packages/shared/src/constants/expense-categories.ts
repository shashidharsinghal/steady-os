export const EXPENSE_CATEGORY_COLOR_OPTIONS = [
  "accent",
  "blue",
  "green",
  "red",
  "violet",
  "amber",
] as const;

export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Rent", color_token: "accent", display_order: 1 },
  { name: "Salaries", color_token: "blue", display_order: 2 },
  { name: "Utilities", color_token: "violet", display_order: 3 },
  { name: "Supplies", color_token: "green", display_order: 4 },
  { name: "Marketing", color_token: "amber", display_order: 5 },
  { name: "Repairs", color_token: "red", display_order: 6 },
] as const;
