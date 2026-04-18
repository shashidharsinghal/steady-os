import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import type { Employee } from "@stride-os/shared";
import { EmployeeForm } from "../../_components/EmployeeForm";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getRole();

  if (role !== "partner") {
    redirect("/employees?error=unauthorized");
  }

  const supabase = await createClient();
  const [{ data: employeeData }, { data: outlets }, { data: managers }] = await Promise.all([
    supabase.from("employees").select("*").eq("id", id).single(),
    supabase.from("outlets").select("id, name").is("archived_at", null).order("name"),
    supabase
      .from("employees")
      .select("id, full_name")
      .eq("role", "manager")
      .is("archived_at", null)
      .neq("id", id)
      .order("full_name"),
  ]);

  if (!employeeData) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit employee</h1>
        <p className="text-muted-foreground text-sm">{employeeData.full_name}</p>
      </div>
      <EmployeeForm
        employee={employeeData as Employee}
        outlets={outlets ?? []}
        managers={managers ?? []}
        mode="edit"
      />
    </div>
  );
}
