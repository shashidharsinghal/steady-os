import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsla(var(--primary),0.18),transparent_30%),radial-gradient(circle_at_bottom_right,hsla(var(--secondary),0.18),transparent_24%)]" />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="hidden lg:block">
          <div className="max-w-2xl space-y-6">
            <p className="text-primary text-sm font-medium uppercase tracking-[0.22em]">
              Design System v1
            </p>
            <h1 className="text-5xl font-semibold tracking-tight">
              A brighter, calmer operating system for fast-moving hospitality teams.
            </h1>
            <p className="text-muted-foreground text-lg leading-8">
              Built for outlet ops, payroll context, and everyday decisions without the clutter of a
              generic admin panel.
            </p>
          </div>
        </div>
        <div className="flex justify-center lg:justify-end">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
