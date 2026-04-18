import { Skeleton } from "@stride-os/ui";

export default function RunDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-28" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-[20px]" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-[160px] w-full rounded-[20px]" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-[16px]" />
        ))}
      </div>
    </div>
  );
}
