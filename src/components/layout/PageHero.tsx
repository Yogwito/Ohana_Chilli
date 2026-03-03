import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

type BrandVariant = 'ohana' | 'chilli' | 'beverages' | 'neutral';

interface PageHeroProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  brand?: BrandVariant;
}

const brandStyles: Record<BrandVariant, { section: string; iconWrap: string; title: string }> = {
  ohana: {
    section: 'bg-ohana-gradient border-b border-ohana/15',
    iconWrap: 'rounded-full bg-gradient-to-br from-ohana to-ohana-dark shadow-lg shadow-ohana/30',
    title: 'text-ohana-dark',
  },
  chilli: {
    section: 'bg-chilli-gradient border-b border-chilli-dark/15',
    iconWrap: 'rounded-lg bg-gradient-to-r from-chilli to-chilli-dark shadow-lg shadow-chilli-dark/40',
    title: 'text-chilli-dark',
  },
  beverages: {
    section: 'bg-gradient-to-br from-ohana-light/40 via-background to-chilli-muted/40 border-b border-border',
    iconWrap: 'rounded-2xl bg-primary/10',
    title: 'text-foreground',
  },
  neutral: {
    section: 'bg-gradient-to-br from-ohana-light via-background to-chilli-muted border-b border-border',
    iconWrap: 'rounded-2xl bg-primary/10',
    title: 'text-foreground',
  },
};

export default function PageHero({ icon: Icon, title, subtitle, description, brand = 'neutral' }: PageHeroProps) {
  const s = brandStyles[brand];

  return (
    <section className={cn('py-12 sm:py-16', s.section)}>
      <div className="container">
        <div className="flex items-center gap-4 mb-4">
          <div className={cn('w-14 h-14 flex items-center justify-center', s.iconWrap)}>
            <Icon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className={cn('text-3xl sm:text-4xl font-bold tracking-tight', s.title)}>{title}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">{subtitle}</p>
          </div>
        </div>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>
    </section>
  );
}
