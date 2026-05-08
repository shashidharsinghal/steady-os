import { redirect } from "next/navigation";
import { Download } from "lucide-react";
import { Button, Card, CardContent } from "@stride-os/ui";
import { PageHeader } from "@/components/layout/page-header";
import { getRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AdminTabs } from "../_components/AdminTabs";

export default async function AdminDataPage() {
  const role = await getRole();
  if (role !== "partner") redirect("/dashboard");
  const supabase = await createClient();
  const { data: outlets } = await supabase
    .from("outlets")
    .select("id, name")
    .is("archived_at", null)
    .order("name");
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Data"
        subtitle="Export data by outlet. Reset flows stay intentionally gated for a later hard-confirmation pass."
      />
      <AdminTabs />
      <div className="grid gap-4 md:grid-cols-2">
        {(outlets ?? []).map((outlet) => (
          <Card key={outlet.id}>
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="section-card-title">{outlet.name}</p>
                <p className="text-muted-foreground text-sm">CSV export entry points</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {["sales", "expenses", "customers", "inventory"].map((dataset) => (
                  <Button key={dataset} asChild variant="outline" size="sm">
                    <a href={`/api/export?outletId=${outlet.id}&dataset=${dataset}`}>
                      <Download className="h-4 w-4" />
                      {dataset}
                    </a>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
