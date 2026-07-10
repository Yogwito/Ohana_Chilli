import { useCallback, useEffect, useRef, useState } from 'react';

const VIDEO_SRC = '/videos/bowl-hero.mp4';
const POSTER_SRC = '/images/bowl-hero-poster.png';

interface ScrollHeroProps {
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
}

/** Maps overall progress (0–1) to a local 0–1 window between `start` and `end`. */
function stage(progress: number, start: number, end: number): number {
  return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

/** Inline style for text emerging from the shadows as its stage completes. */
function revealStyle(t: number): React.CSSProperties {
  return {
    opacity: t,
    filter: `blur(${(1 - t) * 10}px)`,
    transform: `translateY(${(1 - t) * 28}px)`,
  };
}

/**
 * Scroll-driven hero: the wrapper is taller than the viewport and the content
 * is sticky, so scrolling scrubs the bowl-assembly video (currentTime follows
 * scroll progress) while the copy emerges from a dark overlay in stages.
 * Falls back to a static poster when the video is missing or the user
 * prefers reduced motion.
 */
export default function ScrollHero({ onPrimaryClick, onSecondaryClick }: ScrollHeroProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number>();
  const [progress, setProgress] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const update = useCallback(() => {
    rafRef.current = undefined;
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    const scrollable = rect.height - window.innerHeight;
    const p = scrollable > 0 ? Math.min(1, Math.max(0, -rect.top / scrollable)) : 1;
    setProgress(p);

    const video = videoRef.current;
    if (video && video.duration && !video.seeking) {
      video.currentTime = p * (video.duration - 0.05);
    }
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const onScroll = () => {
      if (rafRef.current === undefined) rafRef.current = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (rafRef.current !== undefined) cancelAnimationFrame(rafRef.current);
    };
  }, [reducedMotion, update]);

  // Static variant: reduced motion → no scrubbing, everything visible
  const p = reducedMotion ? 1 : progress;
  const badgeT = reducedMotion ? 1 : stage(p, 0.05, 0.3);
  const titleT = reducedMotion ? 1 : stage(p, 0.2, 0.5);
  const subtitleT = reducedMotion ? 1 : stage(p, 0.4, 0.65);
  const ctaT = reducedMotion ? 1 : stage(p, 0.55, 0.8);
  const overlayOpacity = reducedMotion ? 0.35 : 0.72 - p * 0.37; // shadows lift as you scroll

  return (
    <div ref={wrapperRef} className={reducedMotion ? '' : 'h-[200vh] sm:h-[250vh]'}>
      <div
        className={
          'hero-grain relative w-full overflow-hidden flex items-center justify-center ' +
          (reducedMotion ? 'min-h-[420px]' : 'sticky top-0 h-screen')
        }
        style={{ background: 'linear-gradient(135deg, #2e7d4f 0%, #5a9e45 60%, #8CC878 100%)' }}
      >
        {/* Background media: scrubbed video, poster fallback */}
        {!videoFailed && !reducedMotion ? (
          <video
            ref={videoRef}
            src={VIDEO_SRC}
            poster={POSTER_SRC}
            muted
            playsInline
            preload="auto"
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <img
            src={POSTER_SRC}
            alt="Paisa Bowl con todos sus ingredientes"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Shadow overlay the text emerges from */}
        <div
          className="absolute inset-0 bg-black transition-opacity duration-200"
          style={{ opacity: overlayOpacity }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Copy */}
        <div className="relative z-10 container max-w-4xl px-4 flex flex-col items-center text-center gap-4">
          <span
            style={revealStyle(badgeT)}
            className="inline-flex w-fit items-center rounded-full backdrop-blur-sm bg-white/20 border border-white/30 px-3 py-1 text-xs font-medium text-white"
          >
            🌿 Comida real. Sabor real.
          </span>
          <h1
            style={revealStyle(titleT)}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-normal tracking-tight text-white leading-tight drop-shadow-lg"
          >
            Eat Healthy, Live Happy
          </h1>
          <p style={revealStyle(subtitleT)} className="text-sm sm:text-lg text-white/90 max-w-md drop-shadow">
            Arma tu bowl perfecto o elige uno de nuestros sugeridos. Cable Plaza, Piso 4.
          </p>
          <div
            style={revealStyle(ctaT)}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-2 w-full sm:w-auto"
          >
            <button
              onClick={onPrimaryClick}
              className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-brand-dark shadow-lg hover:bg-white/90 hover:shadow-xl transition-all duration-200 active:scale-95 w-full sm:w-auto"
            >
              Arma tu Bowl
            </button>
            <button
              onClick={onSecondaryClick}
              className="rounded-full border-2 border-white/70 px-6 py-2.5 text-sm font-semibold text-white hover:bg-white/10 transition-colors w-full sm:w-auto"
            >
              Ver menú
            </button>
          </div>
        </div>

        {/* Scroll hint */}
        {!reducedMotion && p < 0.9 && (
          <div className="absolute bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/80 text-xs flex flex-col items-center gap-1 animate-bounce">
            <span>Desliza</span>
            <span aria-hidden="true">↓</span>
          </div>
        )}
      </div>
    </div>
  );
}
