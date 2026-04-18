"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@stride-os/ui";
import { cn } from "@stride-os/ui/lib/utils";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="border-border/80 bg-background/80 inline-flex items-center rounded-[10px] border p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 rounded-[8px] px-2.5 text-xs",
            theme === value && "bg-accent text-accent-foreground"
          )}
          onClick={() => setTheme(value)}
          aria-label={`Set theme to ${label}`}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      ))}
    </div>
  );
}
