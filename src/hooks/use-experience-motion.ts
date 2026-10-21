import { useEffect, type RefObject } from 'react';

/**
 * One-time section entrances without GSAP: an IntersectionObserver toggles a
 * CSS class (see experience.css). Content is never hidden when motion is reduced.
 */
export function useExperienceMotion(root: RefObject<HTMLElement>, deps: unknown[] = []) {
  useEffect(() => {
    const el = root.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const targets = el.querySelectorAll<HTMLElement>('.experience-section-heading:not(.is-visible), .experience-story:not(.is-visible)');
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.15 },
    );
    targets.forEach((target) => {
      target.classList.add('experience-reveal');
      observer.observe(target);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root, ...deps]);
}
