import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CustomerTile({
  href,
  title,
  value,
  subtitle,
}: {
  href: string;
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <Link
      href={href}
      className="bg-card group rounded-[24px] border p-5 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">{title}</p>
        <ArrowRight className="text-muted-foreground h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
      <p className="mt-4 font-mono text-4xl font-semibold tracking-tight">{value}</p>
      <p className="text-muted-foreground mt-3 text-sm leading-6">{subtitle}</p>
    </Link>
  );
}
