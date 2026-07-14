import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

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

    const ctx = gsap.context(() => {
      ScrollTrigger.batch(targets, {
        start: 'top 88%',
        once: true,
        onEnter: (batch) =>
          gsap.fromTo(
            batch,
            { y: 28, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.7, stagger: 0.08, ease: 'power3.out', overwrite: true },
          ),
      });
    }, root);

    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
