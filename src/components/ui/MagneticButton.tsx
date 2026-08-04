import { useCallback, useRef, type ReactNode, type ComponentPropsWithoutRef, type ElementType } from 'react';
import { cn } from '@/lib/utils';

type MagneticButtonProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  /** How far the element leans toward the cursor, in px. */
  strength?: number;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

/**
 * Magnetic hover: the element leans toward the cursor and springs back on
 * leave. Pointer-fine devices only — touch gets a plain element, and
 * prefers-reduced-motion disables the effect entirely.
 */
export default function MagneticButton<T extends ElementType = 'button'>({
  as,
  children,
  strength = 18,
  className,
  ...rest
}: MagneticButtonProps<T>) {
  const Tag = (as ?? 'button') as ElementType;
  const ref = useRef<HTMLElement>(null);

  const isMagnetic = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleMove = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el || !isMagnetic()) return;
      const rect = el.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      el.style.transition = 'transform 350ms cubic-bezier(0.22, 1, 0.36, 1)';
      el.style.transform = `translate3d(${relX * strength * 2}px, ${relY * strength * 2}px, 0)`;
    },
    [strength],
  );

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = 'transform 600ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    el.style.transform = 'translate3d(0, 0, 0)';
  }, []);

  return (
    <Tag
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={cn('will-change-transform', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
