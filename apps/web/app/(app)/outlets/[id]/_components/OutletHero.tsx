import Image from "next/image";
import { Building2, MapPin, Phone } from "lucide-react";
import { OutletStatusBadge } from "../../_components/OutletStatusBadge";

type Props = {
  name: string;
  brand: string;
  status: "active" | "setup" | "closed";
  address?: string | null;
  phone?: string | null;
  coverUrl?: string | null;
};

export function OutletHero({ name, brand, status, address, phone, coverUrl }: Props) {
  return (
    <section className="bg-card relative overflow-hidden rounded-[22px] border">
      <div className="relative min-h-[280px]">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={`${name} cover photo`}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        ) : (
          <div className="from-primary/10 via-background to-secondary/10 absolute inset-0 bg-gradient-to-br" />
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/10" />

        <div className="relative flex min-h-[280px] flex-col justify-end p-6 sm:p-8">
          <div className="max-w-3xl space-y-4 text-white">
            <div className="flex flex-wrap items-center gap-3">
              <OutletStatusBadge status={status} />
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.18em] text-white/80 backdrop-blur">
                {brand}
              </span>
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{name}</h1>
              <div className="flex flex-wrap gap-3 text-sm text-white/80">
                <HeroMeta icon={Building2} value={brand} />
                {address ? <HeroMeta icon={MapPin} value={address} /> : null}
                {phone ? <HeroMeta icon={Phone} value={phone} /> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function HeroMeta({ icon: Icon, value }: { icon: typeof Building2; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 backdrop-blur">
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{value}</span>
    </span>
  );
}
