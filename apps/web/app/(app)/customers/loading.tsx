import { Skeleton } from "@stride-os/ui";

export default function CustomersLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-28 w-full rounded-[20px]" />
      <Skeleton className="h-[420px] w-full rounded-[20px]" />
    </div>
  );
}
