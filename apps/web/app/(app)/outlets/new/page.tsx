import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { OutletForm } from "../_components/OutletForm";

export default async function NewOutletPage() {
  const role = await getRole();

  if (role !== "partner") {
    redirect("/outlets?error=unauthorized");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New outlet</h1>
        <p className="text-muted-foreground text-sm">Add a new outlet to the portfolio.</p>
      </div>
      <OutletForm mode="create" />
    </div>
  );
}
