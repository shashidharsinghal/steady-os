"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePartner } from "@/lib/auth";
import {
  archiveEmployeeSchema,
  createEmployeeSchema,
  employeeOutletAssignmentSchema,
  recordSalaryChangeSchema,
  updateEmployeeSchema,
  type ArchiveEmployeeInput,
  type CreateEmployeeInput,
  type EmployeeOutletAssignmentInput,
  type RecordSalaryChangeInput,
  type UpdateEmployeeInput,
} from "@stride-os/shared";

function emptyToNull(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function toEmployeeUpdate(input: UpdateEmployeeInput) {
  return {
    full_name: input.full_name.trim(),
    phone: input.phone.trim(),
    email: emptyToNull(input.email),
    address: emptyToNull(input.address),
    date_of_birth: emptyToNull(input.date_of_birth),
    joined_on: input.joined_on,
    left_on: emptyToNull(input.left_on),
    role: input.role,
    position: emptyToNull(input.position),
    employment_type: input.employment_type,
    reports_to: emptyToNull(input.reports_to),
    current_outlet_id: emptyToNull(input.current_outlet_id),
    emergency_contact_name: emptyToNull(input.emergency_contact_name),
    emergency_contact_phone: emptyToNull(input.emergency_contact_phone),
    aadhaar_last_4: emptyToNull(input.aadhaar_last_4),
  };
}

export async function createEmployee(input: CreateEmployeeInput): Promise<{ id: string }> {
  const userId = await requirePartner();

  const parsed = createEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid employee data");
  }

  const supabase = await createClient();
  const employeePayload = toEmployeeUpdate(parsed.data);

  const { data: employee, error: employeeError } = await supabase
    .from("employees")
    .insert(employeePayload)
    .select("id")
    .single();

  if (employeeError || !employee) {
    throw new Error("Failed to create employee. Please try again.");
  }

  const { error: salaryError } = await supabase.from("employee_salary_history").insert({
    employee_id: employee.id,
    monthly_salary: parsed.data.monthly_salary,
    effective_from: parsed.data.joined_on,
    reason: "joining",
    created_by: userId,
  });

  if (salaryError) {
    throw new Error("Employee was created, but the initial salary could not be recorded.");
  }

  if (employeePayload.current_outlet_id) {
    const { error: assignmentError } = await supabase.from("employee_outlet_assignments").insert({
      employee_id: employee.id,
      outlet_id: employeePayload.current_outlet_id,
      assigned_by: userId,
    });

    if (assignmentError) {
      throw new Error("Employee was created, but the outlet assignment could not be saved.");
    }
  }

  revalidatePath("/employees");
  if (employeePayload.current_outlet_id) {
    revalidatePath(`/outlets/${employeePayload.current_outlet_id}`);
  }

  return { id: employee.id };
}

export async function updateEmployee(id: string, input: UpdateEmployeeInput): Promise<void> {
  await requirePartner();

  const parsed = updateEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid employee data");
  }

  const supabase = await createClient();
  const employeePayload = toEmployeeUpdate(parsed.data);

  const { error } = await supabase.from("employees").update(employeePayload).eq("id", id);

  if (error) {
    throw new Error("Failed to update employee. Please try again.");
  }

  if (employeePayload.current_outlet_id) {
    await supabase.from("employee_outlet_assignments").upsert(
      {
        employee_id: id,
        outlet_id: employeePayload.current_outlet_id,
      },
      { onConflict: "employee_id,outlet_id", ignoreDuplicates: true }
    );
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  if (employeePayload.current_outlet_id) {
    revalidatePath(`/outlets/${employeePayload.current_outlet_id}`);
  }
}

export async function archiveEmployee(id: string, input: ArchiveEmployeeInput): Promise<void> {
  await requirePartner();

  const parsed = archiveEmployeeSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid archive data");
  }

  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("current_outlet_id")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("employees")
    .update({
      left_on: parsed.data.left_on,
      archived_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error("Failed to archive employee. Please try again.");
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${id}`);
  if (employee?.current_outlet_id) {
    revalidatePath(`/outlets/${employee.current_outlet_id}`);
  }
}

export async function recordSalaryChange(
  employeeId: string,
  input: RecordSalaryChangeInput
): Promise<void> {
  const userId = await requirePartner();

  const parsed = recordSalaryChangeSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid salary change");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("employee_salary_history").insert({
    employee_id: employeeId,
    monthly_salary: parsed.data.monthly_salary,
    effective_from: parsed.data.effective_from,
    reason: parsed.data.reason,
    created_by: userId,
  });

  if (error) {
    throw new Error("Failed to record salary change. Please try again.");
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${employeeId}`);
}

export async function assignEmployeeToOutlet(input: EmployeeOutletAssignmentInput): Promise<void> {
  const userId = await requirePartner();

  const parsed = employeeOutletAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid outlet assignment");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("employee_outlet_assignments").upsert(
    {
      employee_id: parsed.data.employee_id,
      outlet_id: parsed.data.outlet_id,
      assigned_by: userId,
    },
    { onConflict: "employee_id,outlet_id", ignoreDuplicates: true }
  );

  if (error) {
    throw new Error("Failed to assign employee to outlet. Please try again.");
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${parsed.data.employee_id}`);
  revalidatePath(`/outlets/${parsed.data.outlet_id}`);
}

export async function removeEmployeeFromOutlet(
  input: EmployeeOutletAssignmentInput
): Promise<void> {
  await requirePartner();

  const parsed = employeeOutletAssignmentSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error("Invalid outlet assignment");
  }

  const supabase = await createClient();

  const { data: employee } = await supabase
    .from("employees")
    .select("current_outlet_id")
    .eq("id", parsed.data.employee_id)
    .single();

  if (employee?.current_outlet_id === parsed.data.outlet_id) {
    const { error: updateError } = await supabase
      .from("employees")
      .update({ current_outlet_id: null })
      .eq("id", parsed.data.employee_id);

    if (updateError) {
      throw new Error("Failed to update the primary outlet before removing the assignment.");
    }
  }

  const { error } = await supabase
    .from("employee_outlet_assignments")
    .delete()
    .eq("employee_id", parsed.data.employee_id)
    .eq("outlet_id", parsed.data.outlet_id);

  if (error) {
    throw new Error("Failed to remove outlet assignment. Please try again.");
  }

  revalidatePath("/employees");
  revalidatePath(`/employees/${parsed.data.employee_id}`);
  revalidatePath(`/outlets/${parsed.data.outlet_id}`);
}
