import { Skeleton } from "@stride-os/ui";

export default function EmployeeDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-16" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>
      <Skeleton className="h-10 w-56" />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
