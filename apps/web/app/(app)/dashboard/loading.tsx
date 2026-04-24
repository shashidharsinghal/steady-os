import { Skeleton } from "@stride-os/ui";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-[132px] w-full rounded-[28px]" />
      <Skeleton className="h-16 w-full rounded-[20px]" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-[300px] rounded-[24px]" />
        <Skeleton className="h-[300px] rounded-[24px]" />
      </div>
      <Skeleton className="h-[480px] w-full rounded-[24px]" />
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Skeleton className="h-[360px] rounded-[24px]" />
        <Skeleton className="h-[260px] rounded-[24px]" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-[170px] rounded-[24px]" />
        <Skeleton className="h-[170px] rounded-[24px]" />
        <Skeleton className="h-[170px] rounded-[24px]" />
        <Skeleton className="h-[170px] rounded-[24px]" />
      </div>
    </div>
  );
}
