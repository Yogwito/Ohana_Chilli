import { useState } from 'react';
import { X } from 'lucide-react';
import { useBannerSettings } from '@/hooks/use-catalog';
import { cn } from '@/lib/utils';

const COLOR_CLASSES = {
  warning: 'bg-amber-500 text-white',
  danger: 'bg-red-600 text-white',
  info: 'bg-brand text-white',
} as const;

export default function ClosedBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data } = useBannerSettings();

  if (!data?.enabled || dismissed) return null;

  const colorClass = COLOR_CLASSES[data.color as keyof typeof COLOR_CLASSES] ?? COLOR_CLASSES.warning;

  return (
    <div className={cn('h-10 w-full flex items-center justify-center relative z-50', colorClass)}>
      <span className="text-sm font-medium">🔒 {data.message}</span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-3 top-1/2 -translate-y-1/2 opacity-80 hover:opacity-100 transition-opacity"
        aria-label="Cerrar banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
