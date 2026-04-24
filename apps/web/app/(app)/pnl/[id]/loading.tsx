export default function PnlDetailLoading() {
  return (
    <div className="space-y-4">
      <div className="bg-muted h-6 w-32 animate-pulse rounded" />
      <div className="bg-muted h-10 w-72 animate-pulse rounded" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="bg-muted h-64 animate-pulse rounded-[24px]" />
        <div className="bg-muted h-64 animate-pulse rounded-[24px]" />
      </div>
      <div className="bg-muted h-96 animate-pulse rounded-[24px]" />
    </div>
  );
}
