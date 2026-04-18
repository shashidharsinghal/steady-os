"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@stride-os/ui";

export default function OutletDetailError({
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
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/outlets">Back to outlets</Link>
        </Button>
      </div>
    </div>
  );
}
