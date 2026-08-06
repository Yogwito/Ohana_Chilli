import type { ReactNode } from 'react';
import { useIntersection } from '@/hooks/use-intersection';

interface DeferredSectionProps {
  children: ReactNode;
  fallback: ReactNode;
  rootMargin?: string;
  className?: string;
}

export default function DeferredSection({
  children,
  fallback,
  rootMargin = '300px 0px',
  className,
}: DeferredSectionProps) {
  const { ref, isVisible } = useIntersection({ threshold: 0, rootMargin, once: true });

  return (
    <div ref={ref} className={className}>
      {isVisible ? children : fallback}
    </div>
  );
}
