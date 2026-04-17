"use client";

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
    <div className="bg-card flex flex-col items-center gap-6 rounded-lg border p-10 shadow-sm">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Stride OS</h1>
        <p className="text-muted-foreground text-sm">Operations platform for Steady Strides</p>
      </div>
      <Button onClick={signInWithGoogle} variant="outline" className="w-full gap-2">
        Continue with Google
      </Button>
    </div>
  );
}
