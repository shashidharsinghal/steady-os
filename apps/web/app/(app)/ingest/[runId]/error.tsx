"use client";

import { useEffect } from "react";
import { Button } from "@stride-os/ui";

export default function RunDetailError({
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
      <h2 className="mb-2 text-lg font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground mb-6 text-sm">
        {error.message ?? "An unexpected error occurred. Please try again."}
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
