import { Skeleton } from "@stride-os/ui";

export default function OutletDetailLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-[300px] w-full rounded-[24px]" />
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-64" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-[340px] w-full rounded-[20px]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-[18px]" />
        ))}
      </div>
    </div>
  );
}
