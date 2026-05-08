export type TaskStatus = "open" | "in_progress" | "blocked" | "done" | "cancelled";
export type TaskCriticality = "low" | "medium" | "high" | "critical";
export type TaskArea =
  | "operations"
  | "food"
  | "accounts"
  | "maintenance"
  | "people"
  | "vendors"
  | "marketing"
  | "compliance"
  | "other";
export type TaskAssigneeType = "user" | "role";
export type TaskRoleAssignee = "store_manager";

export interface Task {
  id: string;
  outlet_id: string;
  title: string;
  details: string | null;
  area: TaskArea;
  criticality: TaskCriticality;
  status: TaskStatus;
  assignee_type: TaskAssigneeType;
  assignee_user_id: string | null;
  assignee_role: TaskRoleAssignee | null;
  created_by: string;
  completed_by: string | null;
  due_date: string | null;
  completed_at: string | null;
  related_type: string | null;
  related_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface TaskListRow extends Task {
  outlet_name: string;
  assignee_name: string | null;
  creator_name: string | null;
}
