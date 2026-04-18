import { Skeleton } from "@stride-os/ui";

export default function IngestLoading() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-48 w-full rounded-[20px]" />
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-[300px] w-full rounded-[20px]" />
      </div>
    </div>
  );
}
