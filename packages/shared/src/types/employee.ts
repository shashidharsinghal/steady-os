export type EmployeeRole = "manager" | "staff" | "cleaner";

export type EmploymentType = "full_time" | "part_time";

export type SalaryChangeReason = "joining" | "hike" | "demotion" | "correction";

export interface Employee {
  id: string;
  user_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  date_of_birth: string | null;
  joined_on: string;
  left_on: string | null;
  role: EmployeeRole;
  position: string | null;
  employment_type: EmploymentType;
  reports_to: string | null;
  current_outlet_id: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  aadhaar_last_4: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmployeeOutletAssignment {
  employee_id: string;
  outlet_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface EmployeeSalaryHistoryEntry {
  id: string;
  employee_id: string;
  monthly_salary: number;
  effective_from: string;
  effective_to: string | null;
  reason: SalaryChangeReason;
  created_at: string;
  created_by: string | null;
}
