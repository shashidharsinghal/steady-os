import { Search } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="border-border/70 bg-background/80 sticky top-0 z-20 border-b backdrop-blur">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div className="space-y-1">
          <p className="text-xl font-semibold tracking-tight">{title}</p>
          {subtitle ? <p className="text-muted-foreground text-sm">{subtitle}</p> : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-muted-foreground border-border/80 bg-background/90 hidden min-w-[260px] items-center gap-2 rounded-[10px] border px-3 py-2 text-sm lg:flex">
            <Search className="h-4 w-4" />
            <span className="flex-1">Search</span>
            <span className="border-border/80 bg-muted/60 rounded-md border px-1.5 py-0.5 text-[11px] uppercase tracking-[0.16em]">
              Cmd K
            </span>
          </div>
          <div className="hidden xl:block">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
