export const EMPLOYEE_POSITIONS = [
  "Cook",
  "Kitchen Helper",
  "Server",
  "Cashier",
  "Rider",
  "Cleaner",
  "Other",
] as const;

export type EmployeePositionOption = (typeof EMPLOYEE_POSITIONS)[number];
