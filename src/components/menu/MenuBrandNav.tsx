import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const links = [
  { href: '/ohana', label: 'Ohana Bowls', accent: 'ohana' },
  { href: '/chilli', label: 'Chilli', accent: 'chilli' },
] as const;

export default function MenuBrandNav() {
  const location = useLocation();

  return (
    <nav className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-center">
      {links.map((link) => {
        const isActive = location.pathname === link.href;
        const activeClasses =
          link.accent === 'ohana'
            ? 'border-ohana bg-ohana/10 text-ohana-dark'
            : 'border-chilli-dark bg-chilli-dark/10 text-chilli-dark';

        return (
          <Link
            key={link.href}
            to={link.href}
            className={cn(
              'rounded-2xl border px-4 py-3 text-sm font-semibold transition-colors',
              isActive ? activeClasses : 'border-border bg-card text-foreground hover:bg-muted/60',
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
