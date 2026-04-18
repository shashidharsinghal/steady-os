import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@stride-os/ui";
import { createClient } from "@/lib/supabase/server";
import { getRole } from "@/lib/auth";
import { OutletListItem } from "./_components/OutletListItem";
import type { Outlet } from "@stride-os/shared";

export default async function OutletsPage() {
  const [supabase, role] = await Promise.all([createClient(), getRole()]);

  const { data: outlets } = await supabase
    .from("outlets")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const isEmpty = !outlets || outlets.length === 0;
  const isPartner = role === "partner";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Outlets</h1>
        {isPartner && (
          <Button asChild size="sm">
            <Link href="/outlets/new">
              <Plus className="mr-1 h-4 w-4" />
              New outlet
            </Link>
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          {isPartner ? (
            <>
              <p className="text-muted-foreground mb-4">No outlets yet.</p>
              <Button asChild>
                <Link href="/outlets/new">Create your first outlet</Link>
              </Button>
            </>
          ) : (
            <p className="text-muted-foreground">
              You haven&apos;t been assigned to any outlets yet. Ask a partner to add you.
            </p>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(outlets as Outlet[]).map((outlet) => (
            <OutletListItem key={outlet.id} outlet={outlet} />
          ))}
        </div>
      )}
    </div>
  );
}
