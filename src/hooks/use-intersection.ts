import { useEffect, useRef, useState } from 'react';

interface UseIntersectionOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

export function useIntersection({
  threshold = 0.1,
  rootMargin = '0px',
  once = true,
}: UseIntersectionOptions = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold, rootMargin },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, once]);

  return { ref, isVisible };
}
