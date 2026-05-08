"use client";

import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@stride-os/ui";

export function LoginForm() {
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });
  }

  return (
    <div className="border-border bg-card/95 shadow-elevated w-full max-w-md rounded-[18px] border p-8 backdrop-blur">
      <div className="space-y-6">
        <div className="space-y-4">
          <div className="border-accent/20 bg-accent-soft text-accent flex h-14 w-14 items-center justify-center rounded-2xl border text-lg font-semibold">
            SO
          </div>
          <div className="space-y-2">
            <h1 className="text-foreground text-3xl font-semibold tracking-tight">Stride OS</h1>
            <p className="text-muted-foreground text-sm leading-6">
              Modern operations control for Steady Strides. Track outlets, teams, and the day-to-day
              details from one place.
            </p>
          </div>
        </div>

        <div className="border-border bg-paper-subtle grid gap-3 rounded-[16px] border p-4 text-sm">
          <p className="font-medium">Designed for the morning ops ritual</p>
          <p className="text-muted-foreground">
            Portfolio visibility, outlet detail, employee records, and ingestion workflows in a
            single calm workspace.
          </p>
        </div>

        <Button onClick={signInWithGoogle} variant="accent" className="w-full justify-between">
          <span>Sign in with Google</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
