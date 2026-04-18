import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] transition-colors focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary/12 text-primary",
        secondary: "bg-secondary/14 text-secondary-foreground",
        destructive: "bg-destructive/12 text-destructive",
        outline: "border-border bg-background text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      <span>{props.children}</span>
    </div>
  );
}

export { Badge, badgeVariants };
