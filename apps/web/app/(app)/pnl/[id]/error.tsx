"use client";

export default function PnlDetailError() {
  return (
    <div className="rounded-[24px] border border-rose-500/30 bg-rose-500/5 p-6">
      <h2 className="text-lg font-semibold">Could not load this P&amp;L report</h2>
      <p className="text-muted-foreground mt-2 text-sm">
        The report may have been deleted, or the upload record may no longer be available.
      </p>
    </div>
  );
}
