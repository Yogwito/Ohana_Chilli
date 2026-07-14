import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import MagneticButton from '@/components/ui/MagneticButton';

gsap.registerPlugin(ScrollTrigger);

const VIDEO_SRC = '/videos/bowl-hero-v2.mp4';
const MOBILE_VIDEO_SRC = '/videos/bowl-hero-mobile-v2.mp4';
// Shown before the video buffers and while scrubbing hasn't started yet —
// the empty bowl, so the page loads "unassembled" and scrolling is what
// reveals the commercial, never the other way around.
const POSTER_START_SRC = '/images/bowl-hero-poster-start-v2.jpg';
// Only used for the reduced-motion / video-failed static fallback, where
// there's no scroll to reveal anything — the finished bowl is the payoff.
const POSTER_FINAL_SRC = '/images/bowl-hero-poster-v2.jpg';

const TITLE_WORDS = ['Eat', 'Healthy,', 'Live', 'Happy'];

interface ScrollHeroProps {
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
}

/**
 * Scroll-driven hero, three acts:
 *
 * 1. Preload — the full video downloads through a streaming fetch that feeds
 *    a real progress bar; the page opens on a branded loading veil. Serving
 *    the video from a local blob makes scroll-scrubbing deterministic (no
 *    network seeks mid-scroll, the historical cause of "the animation
 *    doesn't load").
 * 2. Intro — when the video is ready the veil lifts and the copy staggers in
 *    word by word (GSAP timeline).
 * 3. Scrub — a pinned ScrollTrigger maps scroll progress to video.currentTime,
 *    assembling the bowl as the user scrolls, while the shadow overlay lifts.
 *
 * prefers-reduced-motion skips all three acts: static final poster, copy
 * visible, no pin. A failed fetch falls back to the poster and removes the
 * veil immediately — the veil can never trap the page.
 */
export default function ScrollHero({ onPrimaryClick, onSecondaryClick }: ScrollHeroProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const veilRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const gsapCtxRef = useRef<gsap.Context | null>(null);

  const [isMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [videoFailed, setVideoFailed] = useState(false);
  const [loadPct, setLoadPct] = useState(0);

  const staticHero = reducedMotion || videoFailed;

  // ── Act 1: streaming download with real progress ──────────────────────────
  useEffect(() => {
    if (reducedMotion) return;

    const controller = new AbortController();
    const src = isMobile ? MOBILE_VIDEO_SRC : VIDEO_SRC;

    (async () => {
      try {
        const res = await fetch(src, { signal: controller.signal });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const total = Number(res.headers.get('content-length')) || 0;
        const reader = res.body.getReader();
        const chunks: BlobPart[] = [];
        let received = 0;

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          received += value.byteLength;
          if (total > 0) setLoadPct(Math.min(99, Math.round((received / total) * 100)));
        }

        const blobUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
        blobUrlRef.current = blobUrl;
        setLoadPct(100);

        const video = videoRef.current;
        if (video) {
          video.src = blobUrl;
          video.load();
        }
      } catch {
        if (!controller.signal.aborted) setVideoFailed(true); // drops the veil with the static fallback
      }
    })();

    return () => {
      controller.abort();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror load % into the bar without re-rendering GSAP-managed nodes
  useEffect(() => {
    if (progressBarRef.current) {
      gsap.to(progressBarRef.current, { scaleX: loadPct / 100, duration: 0.3, ease: 'power2.out' });
    }
  }, [loadPct]);

  const handleSeeked = useCallback(() => {
    const video = videoRef.current;
    if (video && pendingSeekRef.current !== null) {
      video.currentTime = pendingSeekRef.current;
      pendingSeekRef.current = null;
    }
  }, []);

  // ── Act 2 + 3: intro timeline, then pinned scrub ──────────────────────────
  const handleVideoReady = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const video = videoRef.current;
    if (video) video.currentTime = 0;

    const hero = heroRef.current;
    if (!hero) return;

    gsapCtxRef.current = gsap.context(() => {
      const intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
      intro
        .to(veilRef.current, { yPercent: -100, duration: 0.9, ease: 'power4.inOut' })
        .from('[data-hero-badge]', { y: 24, autoAlpha: 0, duration: 0.5 }, '-=0.35')
        .from('[data-hero-word]', { yPercent: 120, duration: 0.7, stagger: 0.09, ease: 'power4.out' }, '-=0.3')
        .from('[data-hero-sub]', { y: 18, autoAlpha: 0, duration: 0.5 }, '-=0.4')
        .from('[data-hero-cta]', { y: 18, autoAlpha: 0, duration: 0.5, stagger: 0.08 }, '-=0.35')
        .from('[data-hero-hint]', { autoAlpha: 0, duration: 0.4 }, '-=0.2')
        .set(veilRef.current, { display: 'none' });

      ScrollTrigger.create({
        trigger: wrapperRef.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          const v = videoRef.current;
          if (v && v.duration) {
            const target = self.progress * (v.duration - 0.05);
            if (v.seeking) {
              pendingSeekRef.current = target; // applied on 'seeked' so fast scrolling never wedges
            } else {
              v.currentTime = target;
            }
          }
          if (overlayRef.current) {
            overlayRef.current.style.opacity = String(0.72 - self.progress * 0.37);
          }
          if (v) {
            v.style.transform = `scale(${1.06 - self.progress * 0.06})`;
          }
        },
      });
    }, hero);
  }, []);

  useEffect(() => () => gsapCtxRef.current?.revert(), []);

  return (
    <div ref={wrapperRef} className={staticHero ? '' : 'h-[200vh] sm:h-[250vh]'}>
      <div
        ref={heroRef}
        className={
          'hero-grain relative w-full overflow-hidden flex items-center justify-center ' +
          (staticHero ? 'min-h-[480px]' : 'sticky top-0 h-screen')
        }
        style={{ background: 'hsl(var(--mesa))' }}
      >
        {/* Background media: scrubbed video (blob-fed), poster fallback */}
        {!staticHero ? (
          <video
            ref={videoRef}
            poster={POSTER_START_SRC}
            muted
            playsInline
            preload="none"
            onLoadedData={handleVideoReady}
            onSeeked={handleSeeked}
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 w-full h-full object-cover will-change-transform"
            style={{ transform: 'scale(1.06)' }}
          />
        ) : (
          <img
            src={POSTER_FINAL_SRC}
            alt="Paisa Bowl con todos sus ingredientes"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Shadow overlay the scene emerges from as you scroll */}
        <div
          ref={overlayRef}
          className="absolute inset-0 bg-black"
          style={{ opacity: staticHero ? 0.35 : 0.72 }}
        />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent" />

        {/* Copy */}
        <div className="relative z-10 container max-w-5xl px-4 flex flex-col items-center text-center gap-4">
          <span
            data-hero-badge
            className="inline-flex w-fit items-center gap-1.5 rounded-full backdrop-blur-sm bg-white/15 border border-white/25 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-white uppercase"
          >
            <span aria-hidden="true">🌿</span> Comida real. Sabor real.
          </span>
          <h1 className="hero-title text-[13vw] sm:text-6xl md:text-7xl lg:text-8xl text-white leading-[0.95] drop-shadow-lg">
            {TITLE_WORDS.map((word, i) => (
              <span key={i} className="inline-block overflow-hidden align-bottom pb-[0.08em]">
                <span data-hero-word className="inline-block">
                  {word}
                </span>
                {i < TITLE_WORDS.length - 1 ? <span aria-hidden="true">&nbsp;</span> : null}
              </span>
            ))}
          </h1>
          <p data-hero-sub className="text-sm sm:text-lg text-white/90 max-w-md drop-shadow">
            Arma tu bowl perfecto o elige uno de nuestros sugeridos. Cable Plaza, Piso 4.
          </p>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 mt-2 w-full sm:w-auto">
            <MagneticButton
              data-hero-cta
              onClick={onPrimaryClick}
              className="rounded-full bg-white px-7 py-3 text-sm font-bold text-brand-dark shadow-lg hover:shadow-xl transition-shadow duration-200 w-full sm:w-auto"
            >
              Arma tu Bowl
            </MagneticButton>
            <MagneticButton
              data-hero-cta
              onClick={onSecondaryClick}
              className="rounded-full border-2 border-white/70 px-7 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors w-full sm:w-auto"
            >
              Ver menú
            </MagneticButton>
          </div>
        </div>

        {/* Scroll hint */}
        {!staticHero && (
          <div
            data-hero-hint
            className="absolute bottom-24 md:bottom-6 left-1/2 -translate-x-1/2 z-10 text-white/80 text-xs flex flex-col items-center gap-1 animate-bounce"
          >
            <span>Desliza para armar tu bowl</span>
            <span aria-hidden="true">↓</span>
          </div>
        )}

        {/* Loading veil — branded, with real download progress. GSAP owns its
            exit; React keeps it mounted so the lift animation can't be cut. */}
        {!staticHero && (
          <div
            ref={veilRef}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-6"
            style={{ background: 'hsl(var(--mesa))' }}
          >
            <p className="hero-title text-3xl sm:text-4xl text-white">
              <span className="font-extrabold">Ohana</span>{' '}
              <span className="font-semibold text-white/80">Bowls</span>
            </p>
            <div className="w-56 sm:w-72 h-[3px] rounded-full bg-white/15 overflow-hidden">
              <div
                ref={progressBarRef}
                className="h-full w-full origin-left rounded-full"
                style={{ background: 'hsl(var(--maiz))', transform: 'scaleX(0)' }}
              />
            </div>
            <p className="text-white/60 text-xs tabular-nums tracking-widest">{loadPct}%</p>
          </div>
        )}
      </div>
    </div>
  );
}
