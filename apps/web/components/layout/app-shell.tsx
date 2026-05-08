"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { TopBar } from "./top-bar";

const STORAGE_KEY = "stride-sidebar-collapsed";

type Props = {
  children: React.ReactNode;
  userName: string;
  userEmail: string;
  role: "partner" | "manager";
  outletCount: number;
};

export function AppShell({ children, userName, userEmail, role, outletCount }: Props) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, collapsed ? "true" : "false");
  }, [collapsed]);

  return (
    <div className="flex min-h-screen bg-transparent">
      <Sidebar
        userName={userName}
        userEmail={userEmail}
        role={role}
        outletCount={outletCount}
        collapsed={collapsed}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar collapsed={collapsed} onToggleSidebar={() => setCollapsed((value) => !value)} />
        <main className="flex-1 overflow-auto">
          <div className="page-shell">{children}</div>
        </main>
      </div>
    </div>
  );
}
