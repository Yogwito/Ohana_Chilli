import { LucideIcon } from 'lucide-react';

type BrandVariant = 'ohana' | 'beverages' | 'neutral';

interface PageHeroProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  brand?: BrandVariant;
}

export default function PageHero({ icon: Icon, title, subtitle, description }: PageHeroProps) {
  return (
    <section className="border-b bg-[hsl(var(--mesa))] text-white">
      <div className="container grid gap-6 py-12 sm:grid-cols-[1fr_auto] sm:items-end sm:py-16">
        <div>
          <p className="flex items-center gap-2 font-utility text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
            <Icon className="h-4 w-4 text-[hsl(var(--maiz))]" />
            {subtitle}
          </p>
          <h1 className="mt-3 text-white">{title}</h1>
        </div>
        <p className="max-w-md text-sm leading-relaxed text-white/68 sm:text-right sm:text-base">
          {description}
        </p>
      </div>
    </section>
  );
}
