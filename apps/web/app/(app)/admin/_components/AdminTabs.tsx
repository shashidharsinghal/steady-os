"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@stride-os/ui/lib/utils";

const tabs = [
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/outlets", label: "Outlets" },
  { href: "/admin/customer-segments", label: "Segments" },
  { href: "/admin/expense-categories", label: "Categories" },
  { href: "/admin/data", label: "Data" },
  { href: "/admin/activity", label: "Activity" },
];

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div className="overflow-x-auto">
      <div className="border-border bg-card shadow-card inline-flex min-w-full items-center gap-2 rounded-[16px] border p-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "rounded-[12px] px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-paper-subtle hover:text-foreground"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
