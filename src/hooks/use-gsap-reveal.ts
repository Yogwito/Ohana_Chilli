import { useEffect } from 'react';

/**
 * Scroll-triggered entrance for every `[data-reveal]` descendant of `scope`.
 * Elements start slightly low and transparent, then stagger in as they enter
 * the viewport. Re-runs when `deps` change (e.g. after products load) to pick
 * up newly rendered nodes. No-ops under prefers-reduced-motion.
 */
export function useGsapReveal(scope: React.RefObject<HTMLElement>, deps: unknown[] = []) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = scope.current;
    if (!root) return;

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])'));
    if (targets.length === 0) return;
    targets.forEach((el) => el.setAttribute('data-revealed', ''));

    const observer = new IntersectionObserver((entries) => {
      const entering = entries.filter((entry) => entry.isIntersecting);
      entering.forEach((entry, index) => {
        const target = entry.target as HTMLElement;
        target.animate(
          [
            { transform: 'translateY(28px)', opacity: 0 },
            { transform: 'translateY(0)', opacity: 1 },
          ],
          {
            duration: 700,
            delay: index * 80,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            fill: 'both',
          },
        );
        observer.unobserve(target);
      });
    }, { rootMargin: '0px 0px -12% 0px' });

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
