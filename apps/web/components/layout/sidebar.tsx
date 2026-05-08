"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  ListTodo,
  Package,
  Receipt,
  Settings,
  Store,
  TrendingUp,
  Upload,
  UserCog,
  Users,
} from "lucide-react";
import { cn } from "@stride-os/ui/lib/utils";
import { SignOutButton } from "./sign-out-button";

type Props = {
  userName: string;
  userEmail: string;
  role: "partner" | "manager";
  outletCount: number;
  collapsed?: boolean;
};

type NavItem = {
  href?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

const sections: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/sales", label: "Sales", icon: BarChart3 },
      { href: "/ingest", label: "Ingest", icon: Upload },
      { href: "/inventory", label: "Inventory", icon: Package },
      { href: "/expenses", label: "Expenses", icon: Receipt },
      { href: "/tasks", label: "Tasks", icon: ListTodo },
      { href: "/customers", label: "Customers", icon: Users },
      { href: "/outlets", label: "Outlets", icon: Store },
      { href: "/employees", label: "Employees", icon: UserCog },
      { href: "/pnl", label: "P&L", icon: TrendingUp },
      { href: "/admin", label: "Admin", icon: Settings },
    ],
  },
  {
    label: "Design review",
    items: [{ label: "All modules", icon: Boxes }],
  },
];

export function Sidebar({ userName, userEmail, role, outletCount, collapsed = false }: Props) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "border-sidebar-border text-sidebar-foreground sticky top-0 flex h-screen shrink-0 flex-col border-r bg-[linear-gradient(180deg,hsl(var(--paper-2))_0%,hsl(var(--paper))_100%)] transition-[width] duration-200",
        collapsed ? "w-[84px]" : "w-[248px]"
      )}
    >
      <div className={cn("border-sidebar-border border-b py-4", collapsed ? "px-3" : "px-5")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "gap-4")}>
          <div className="bg-foreground text-background shadow-card grid h-11 w-11 place-items-center rounded-[14px]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className={cn("min-w-0", collapsed && "hidden")}>
            <p className="truncate text-[1.02rem] font-semibold tracking-[-0.02em]">
              SteadyStrideOS
            </p>
            <p className="text-muted-foreground text-[11px] font-medium uppercase tracking-[0.22em]">
              Restaurant Ops
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-6">
        {sections.map((section) => (
          <div key={section.label} className="mb-7">
            {!collapsed ? (
              <p className="text-muted-foreground px-3 pb-3 text-[11px] font-medium uppercase tracking-[0.22em]">
                {section.label}
              </p>
            ) : null}
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = item.href
                  ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                  : false;
                const content = (
                  <>
                    <item.icon className="h-4.5 w-4.5 shrink-0" />
                    {!collapsed ? <span className="flex-1 truncate">{item.label}</span> : null}
                    {!collapsed && item.badge ? (
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]",
                          active ? "bg-white/12 text-background" : "text-muted-foreground"
                        )}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </>
                );

                if (!item.href) {
                  return (
                    <div
                      key={item.label}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "text-muted-foreground/72 flex cursor-not-allowed items-center rounded-[14px] py-3 text-[14px] font-medium",
                        collapsed ? "justify-center px-3" : "gap-3 px-4"
                      )}
                    >
                      {content}
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "flex items-center rounded-[14px] py-3 text-[14px] font-medium transition-colors",
                      collapsed ? "justify-center px-3" : "gap-3 px-4",
                      active
                        ? "bg-foreground text-background shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]"
                        : "hover:bg-paper-subtle hover:text-foreground text-[hsl(var(--ink-2))]"
                    )}
                  >
                    {content}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-sidebar-border border-t p-3">
        <div
          className={cn(
            "border-border bg-card shadow-card rounded-[18px] border",
            collapsed ? "p-2" : "p-3"
          )}
        >
          <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-3")}>
            <div className="grid h-12 w-12 place-items-center rounded-[14px] bg-[hsl(var(--blue))] text-sm font-semibold text-white">
              {(userName[0] ?? userEmail[0] ?? "S").toUpperCase()}
            </div>
            <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
              <p className="truncate text-sm font-semibold">{userName}</p>
              <p className="text-muted-foreground truncate text-xs">{userEmail}</p>
              <p className="text-muted-foreground mt-1 text-[11px] uppercase tracking-[0.14em]">
                {role} · {outletCount} {outletCount === 1 ? "outlet" : "outlets"}
              </p>
            </div>
            <SignOutButton collapsed={collapsed} />
          </div>
        </div>
      </div>
    </aside>
  );
}
