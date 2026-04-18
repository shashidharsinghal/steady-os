import { Skeleton } from "@stride-os/ui";

export default function EmployeesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <Skeleton className="h-10 w-52" />
        <Skeleton className="h-10 w-72" />
      </div>
      <Skeleton className="h-[420px] w-full rounded-[20px]" />
    </div>
  );
}
