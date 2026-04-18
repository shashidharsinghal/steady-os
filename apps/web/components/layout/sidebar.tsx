"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ChevronsLeftRight,
  HardHat,
  LayoutDashboard,
  Settings,
  Store,
  Upload,
  Users,
} from "lucide-react";
import { Button } from "@stride-os/ui";
import { cn } from "@stride-os/ui/lib/utils";
import { SignOutButton } from "./sign-out-button";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/outlets", label: "Outlets", icon: Store },
  { href: "/employees", label: "Employees", icon: Users },
  { href: "/ingest", label: "Ingest", icon: Upload },
];

const secondaryItems = [
  { label: "Contractors", icon: HardHat, disabled: true },
  { label: "Settings", icon: Settings, disabled: true },
];

type Props = {
  userName: string;
  userEmail: string;
  role: "partner" | "manager";
  outletCount: number;
};

export function Sidebar({ userName, userEmail, role, outletCount }: Props) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem("stride-sidebar-collapsed");
    setCollapsed(storedValue === "true");
  }, []);

  function toggleCollapsed() {
    const nextValue = !collapsed;
    setCollapsed(nextValue);
    window.localStorage.setItem("stride-sidebar-collapsed", String(nextValue));
  }

  return (
    <aside
      className={cn(
        "flex h-screen shrink-0 flex-col border-r border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] transition-all duration-300",
        collapsed ? "w-[88px]" : "w-[280px]"
      )}
    >
      <div className="border-b border-[hsl(var(--sidebar-border))] p-4">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <div className="bg-primary/15 text-primary border-primary/20 flex h-11 w-11 items-center justify-center rounded-2xl border">
            <Store className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-tight">Stride OS</p>
              <p className="text-foreground/55 text-[11px] uppercase tracking-[0.18em]">
                Steady Strides
              </p>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={toggleCollapsed}
          >
            <ChevronsLeftRight className="h-4 w-4" />
          </Button>
        </div>

        {!collapsed && (
          <div className="mt-4 rounded-[14px] border border-white/5 bg-white/5 p-3">
            <p className="text-foreground/50 text-[11px] uppercase tracking-[0.18em]">
              Visible outlets
            </p>
            <div className="mt-2 flex items-end justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">
                  {role === "partner" ? "Portfolio" : "Assigned"}
                </p>
                <p className="text-foreground/60 text-sm">
                  {outletCount} {outletCount === 1 ? "outlet" : "outlets"}
                </p>
              </div>
              <div className="text-foreground/70 rounded-full border border-white/10 bg-black/10 px-3 py-1 text-xs uppercase tracking-[0.14em]">
                {role}
              </div>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-6 px-3 py-4">
        <div className="space-y-1">
          {!collapsed && (
            <p className="text-foreground/45 px-3 text-[11px] uppercase tracking-[0.18em]">
              Navigate
            </p>
          )}
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  collapsed && "justify-center px-0",
                  active
                    ? "bg-primary text-primary-foreground shadow-[0_12px_30px_-18px_hsl(var(--primary)/0.9)]"
                    : "text-foreground/68 hover:bg-white/6 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </div>

        <div className="space-y-1">
          {!collapsed && (
            <p className="text-foreground/45 px-3 text-[11px] uppercase tracking-[0.18em]">Later</p>
          )}
          {secondaryItems.map(({ label, icon: Icon }) => (
            <div
              key={label}
              className={cn(
                "text-foreground/40 flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm",
                collapsed && "justify-center px-0"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
            </div>
          ))}
        </div>
      </nav>

      <div className="space-y-3 border-t border-[hsl(var(--sidebar-border))] p-3">
        {!collapsed && <ThemeToggle />}
        <div
          className={cn(
            "rounded-[14px] border border-white/5 bg-white/5 p-3",
            collapsed && "border-0 bg-transparent p-0"
          )}
        >
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <div className="bg-primary/15 text-primary border-primary/20 flex h-10 w-10 items-center justify-center rounded-full border text-sm font-semibold">
              {(userName[0] ?? userEmail[0] ?? "S").toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{userName}</p>
                <p className="text-foreground/55 truncate text-xs">{userEmail}</p>
              </div>
            )}
          </div>

          <div className={cn("mt-3", collapsed && "mt-2 flex justify-center")}>
            <SignOutButton collapsed={collapsed} />
          </div>
        </div>
      </div>
    </aside>
  );
}
