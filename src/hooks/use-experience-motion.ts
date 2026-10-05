import { useEffect, type RefObject } from "react";
import { gsap } from "gsap";

/** One-time section entrances, without hiding content before motion is ready. */
export function useExperienceMotion(root: RefObject<HTMLElement>) {
  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference)",
      (context) => {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              context.add(() => {
                gsap.fromTo(
                  entry.target,
                  { y: 24, opacity: 0.4 },
                  {
                    y: 0,
                    opacity: 1,
                    duration: 0.7,
                    ease: "power3.out",
                    clearProps: "transform,opacity",
                  },
                );
              });
              observer.unobserve(entry.target);
            });
          },
          { threshold: 0.15 },
        );
        root.current
          ?.querySelectorAll(".experience-section-heading, .experience-story")
          .forEach((el) => observer.observe(el));
        return () => observer.disconnect();
      },
      root,
    );
    return () => mm.revert();
  }, [root]);
}
