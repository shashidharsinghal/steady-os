import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { EmployeeForm } from "../_components/EmployeeForm";

export default async function NewEmployeePage() {
  const role = await getRole();

  if (role !== "partner") {
    redirect("/employees?error=unauthorized");
  }

  const supabase = await createClient();
  const [{ data: outlets }, { data: managers }] = await Promise.all([
    supabase.from("outlets").select("id, name").is("archived_at", null).order("name"),
    supabase
      .from("employees")
      .select("id, full_name")
      .eq("role", "manager")
      .is("archived_at", null)
      .order("full_name"),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New employee</h1>
        <p className="text-muted-foreground text-sm">
          Add a new team member and record their joining salary.
        </p>
      </div>
      <EmployeeForm outlets={outlets ?? []} managers={managers ?? []} mode="create" />
    </div>
  );
}
