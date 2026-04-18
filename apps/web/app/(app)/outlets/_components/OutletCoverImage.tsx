import Image from "next/image";

type Props = {
  name: string;
  coverUrl?: string | null;
};

export function OutletCoverImage({ name, coverUrl }: Props) {
  if (!coverUrl) {
    return (
      <div className="from-primary/10 via-muted to-secondary/10 relative flex h-52 items-end bg-gradient-to-br p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsla(var(--primary),0.18),transparent_42%)]" />
        <div className="border-foreground/10 bg-background/80 text-foreground/70 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] backdrop-blur">
          No photo yet
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-52 overflow-hidden">
      <Image
        src={coverUrl}
        alt={`${name} cover`}
        fill
        className="object-cover"
        sizes="(max-width: 1024px) 100vw, 33vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
    </div>
  );
}
