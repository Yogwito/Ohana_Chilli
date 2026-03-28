import React from 'react';
import { useIntersection } from '@/hooks/use-intersection';
import { cn } from '@/lib/utils';

interface AnimatedElementProps {
  children: React.ReactNode;
  className?: string;
  animation?: 'fade-up' | 'fade-in' | 'scale-up';
  delay?: 0 | 75 | 150 | 225 | 300;
  threshold?: number;
  as?: React.ElementType;
}

export function AnimatedElement({
  children,
  className,
  animation = 'fade-up',
  delay = 0,
  threshold = 0.1,
  as: Tag = 'div',
}: AnimatedElementProps) {
  const { ref, isVisible } = useIntersection({ threshold });
  const animClass = {
    'fade-up': 'scroll-fade-up',
    'fade-in': 'scroll-fade-in',
    'scale-up': 'scroll-scale-up',
  }[animation];
  const delayClass = delay > 0 ? `delay-${delay}` : '';

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <Tag ref={ref as any} className={cn(animClass, isVisible && 'in-view', delayClass, className)}>
      {children}
    </Tag>
  );
}
