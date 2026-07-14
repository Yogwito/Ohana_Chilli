import { useCallback, useRef, type ReactNode, type ComponentPropsWithoutRef, type ElementType } from 'react';
import { gsap } from 'gsap';
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
  const quickX = useRef<gsap.QuickToFunc | null>(null);
  const quickY = useRef<gsap.QuickToFunc | null>(null);

  const isMagnetic = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(pointer: fine)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleMove = useCallback(
    (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el || !isMagnetic()) return;
      if (!quickX.current) {
        quickX.current = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3.out' });
        quickY.current = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3.out' });
      }
      const rect = el.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      quickX.current(relX * strength * 2);
      quickY.current?.(relY * strength * 2);
    },
    [strength],
  );

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    gsap.to(el, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
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
