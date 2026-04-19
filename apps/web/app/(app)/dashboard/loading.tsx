import { Skeleton } from "@stride-os/ui";

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="bg-card space-y-4 rounded-[24px] border p-6">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-16 w-full rounded-[18px]" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-5 w-36" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-[210px] w-full rounded-[20px]" />
          <Skeleton className="h-[210px] w-full rounded-[20px]" />
          <Skeleton className="h-[210px] w-full rounded-[20px]" />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[360px] w-full rounded-[20px]" />
        <Skeleton className="h-[360px] w-full rounded-[20px]" />
      </div>
    </div>
  );
}
