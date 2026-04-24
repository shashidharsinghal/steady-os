export default function PnlLoading() {
  return (
    <div className="space-y-4">
      <div className="bg-muted h-8 w-48 animate-pulse rounded" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-muted h-48 animate-pulse rounded-[24px]" />
        <div className="bg-muted h-48 animate-pulse rounded-[24px]" />
      </div>
      <div className="bg-muted h-80 animate-pulse rounded-[24px]" />
    </div>
  );
}
