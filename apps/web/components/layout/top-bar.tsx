"use client";

import { Bell, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./theme-toggle";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  customers: "Customers",
  employees: "Employees",
  expenses: "Expenses",
  ingest: "Ingest",
  login: "Login",
  outlets: "Outlets",
  pnl: "P&L",
  sales: "Sales",
  admin: "Admin",
  tasks: "Tasks",
};

function toBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return ["Workspace", "Dashboard"];
  return ["Workspace", ...parts.map((part) => routeLabels[part] ?? part.replace(/-/g, " "))];
}

export function TopBar({
  collapsed,
  onToggleSidebar,
}: {
  collapsed: boolean;
  onToggleSidebar: () => void;
}) {
  const pathname = usePathname();
  const breadcrumbs = toBreadcrumbs(pathname);

  return (
    <header className="border-border sticky top-0 z-20 border-b bg-[hsl(var(--paper)/0.94)] backdrop-blur-xl">
      <div className="flex min-h-16 items-center gap-4 px-10">
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="border-border bg-card text-muted-foreground shadow-card hover:text-foreground grid h-11 w-11 place-items-center rounded-[14px] border transition-colors"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
        <div className="text-muted-foreground hidden items-center gap-2 text-sm md:flex">
          {breadcrumbs.map((crumb, index) => (
            <div key={`${crumb}-${index}`} className="flex items-center gap-2">
              {index > 0 ? <span className="text-line-strong">/</span> : null}
              <span
                className={index === breadcrumbs.length - 1 ? "text-foreground font-semibold" : ""}
              >
                {crumb}
              </span>
            </div>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="border-border bg-card text-muted-foreground shadow-card hidden min-w-[470px] items-center gap-3 rounded-[14px] border px-4 py-3 text-[15px] xl:flex">
            <Search className="h-4 w-4" />
            <span className="flex-1">Search outlets, customers, runs...</span>
            <kbd className="border-border bg-paper-subtle rounded-[8px] border px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em]">
              ⌘K
            </kbd>
          </div>
          <button
            type="button"
            className="border-border bg-card text-muted-foreground shadow-card hover:text-foreground relative grid h-11 w-11 place-items-center rounded-[14px] border transition-colors"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[hsl(var(--blue))]" />
          </button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
