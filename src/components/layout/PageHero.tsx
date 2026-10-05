import { LucideIcon } from "lucide-react";
interface PageHeroProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  description: string;
  brand?: "ohana" | "beverages" | "neutral";
}
export default function PageHero({
  icon: Icon,
  title,
  subtitle,
  description,
}: PageHeroProps) {
  return (
    <section className="experience-page-hero">
      <div className="container">
        <p className="experience-eyebrow">
          <Icon size={18} />
          {subtitle}
        </p>
        <h1>
          {title}
          <span>✳</span>
        </h1>
        <p className="page-hero-description">{description}</p>
      </div>
    </section>
  );
}
