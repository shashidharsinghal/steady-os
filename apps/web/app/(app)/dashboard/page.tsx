import Link from "next/link";
import { ArrowRight, Store, Upload, Users } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@stride-os/ui";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select<"full_name", { full_name: string | null }>("full_name")
    .eq("user_id", user?.id ?? "")
    .single();

  const [{ count: outletCount }, { count: employeeCount }] = await Promise.all([
    supabase.from("outlets").select("id", { count: "exact", head: true }).is("archived_at", null),
    supabase.from("employees").select("id", { count: "exact", head: true }).is("archived_at", null),
  ]);

  const displayName = profile?.full_name ?? user?.email ?? "there";

  return (
    <div className="space-y-6">
      <section className="bg-card rounded-[22px] border p-6 shadow-none">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
          <div className="space-y-4">
            <p className="text-primary text-sm font-medium uppercase tracking-[0.2em]">
              Morning brief
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight">Hello, {displayName}</h1>
              <p className="text-muted-foreground max-w-2xl text-sm leading-6">
                Portfolio visibility is live. Review outlets, team records, and uploads from a
                cleaner operations surface.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button asChild>
              <Link href="/outlets">
                Review outlets
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/employees">Open roster</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard icon={Store} label="Active outlets" value={String(outletCount ?? 0)} />
        <SummaryCard icon={Users} label="Employees" value={String(employeeCount ?? 0)} />
        <SummaryCard icon={Upload} label="Ingestion" value="Ready" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <CardTitle>Focus for today</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <ActionRow
              title="Outlets"
              description="Check cover photos, metadata, and overall outlet readiness."
              href="/outlets"
            />
            <ActionRow
              title="Employees"
              description="Review roster, assignments, and salary history."
              href="/employees"
            />
            <ActionRow
              title="Ingestion"
              description="Confirm file-upload and import workflows are ready for ops data."
              href="/ingest"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Design System Refresh</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6">
            <p className="text-muted-foreground">
              The app now uses warmer brand tokens, stronger hierarchy, cleaner cards, and improved
              dark mode so new features inherit a more deliberate visual language.
            </p>
            <div className="bg-muted/35 rounded-[14px] border p-4">
              <p className="font-medium">What changed</p>
              <p className="text-muted-foreground mt-2">
                Sidebar, top bar, tabs, buttons, forms, tables, outlet surfaces, login, and the
                employee roster all now follow a shared design direction.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1">
          <p className="text-muted-foreground text-sm">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="bg-primary/12 text-primary border-primary/20 flex h-11 w-11 items-center justify-center rounded-2xl border">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function ActionRow({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="hover:border-primary/25 flex items-center justify-between rounded-[14px] border p-4 transition-colors"
    >
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
      <ArrowRight className="text-muted-foreground h-4 w-4" />
    </Link>
  );
}
