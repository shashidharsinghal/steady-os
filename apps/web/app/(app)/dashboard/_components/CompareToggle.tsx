"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@stride-os/ui";

export function CompareToggle({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (enabled) params.delete("compare");
    else params.set("compare", "true");
    router.push(`/dashboard?${params.toString()}`);
  }

  return (
    <Button type="button" variant={enabled ? "default" : "outline"} size="sm" onClick={toggle}>
      {enabled ? "Comparing to previous period" : "Compare to previous period"}
    </Button>
  );
}
