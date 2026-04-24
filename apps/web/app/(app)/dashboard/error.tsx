"use client";

import { useEffect } from "react";
import { Button } from "@stride-os/ui";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="mb-2 text-lg font-semibold">Dashboard v2 failed to load</h2>
      <p className="text-muted-foreground mb-6 max-w-lg text-sm">
        {error.message ?? "An unexpected error occurred while loading the sales dashboard."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
