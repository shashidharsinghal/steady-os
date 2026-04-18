"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@stride-os/ui";

export function SignOutButton({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size={collapsed ? "icon" : "sm"}
      className={collapsed ? "h-9 w-9" : "h-9 justify-start px-3"}
      onClick={handleSignOut}
    >
      <LogOut className="h-4 w-4" />
      {!collapsed && <span>Sign out</span>}
    </Button>
  );
}
