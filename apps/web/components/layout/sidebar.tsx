"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Upload, Users } from "lucide-react";
import { cn } from "@stride-os/ui/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/outlets", label: "Outlets", icon: Store },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/ingest", label: "Ingest", icon: Upload },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="bg-card flex w-60 flex-col border-r">
      <div className="border-b p-6">
        <span className="text-lg font-bold">Stride OS</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              pathname === href
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
