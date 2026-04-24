"use client";

export default function PnlError() {
  return (
    <div className="rounded-[24px] border border-rose-500/30 bg-rose-500/5 p-6">
      <h2 className="text-lg font-semibold">Could not load P&amp;L reports</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        Try refreshing the page. If the issue persists, check the latest ingestion run for this PDF.
      </p>
    </div>
  );
}
