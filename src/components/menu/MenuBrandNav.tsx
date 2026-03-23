import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const links = [
  { href: '/ohana', label: 'Ohana Bowls' },
  { href: '/bebidas', label: 'Bebidas' },
] as const;

export default function MenuBrandNav() {
  const location = useLocation();

  return (
    <nav className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
      {links.map((link) => {
        const isActive = location.pathname === link.href;

        return (
          <Link
            key={link.href}
            to={link.href}
            className={cn(
              'rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors',
              isActive
                ? 'border-ohana bg-ohana/10 text-ohana-dark'
                : 'border-border bg-card text-foreground hover:bg-muted/60',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
