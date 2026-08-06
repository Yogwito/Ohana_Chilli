import { useCallback, useEffect, useRef, useState } from 'react';
import MagneticButton from '@/components/ui/MagneticButton';

const VIDEO_SRC = '/videos/bowl-hero-v2.mp4';
const MOBILE_VIDEO_SRC = '/videos/bowl-hero-mobile-v2.mp4';
const AV1_VIDEO_SRC = '/videos/bowl-hero-v2-av1.mp4';
const AV1_MOBILE_VIDEO_SRC = '/videos/bowl-hero-mobile-v2-av1.mp4';
// Shown before the video buffers and while scrubbing hasn't started yet —
// the empty bowl, so the page loads "unassembled" and scrolling is what
// reveals the commercial, never the other way around.
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
 * 1. Preload — the responsive poster paints immediately while the full video
 *    downloads through a streaming fetch. Serving the video from a local blob
 *    makes scroll-scrubbing deterministic (no
 *    network seeks mid-scroll, the historical cause of "the animation
 *    doesn't load").
 * 2. Scrub — the sticky section maps scroll progress to video.currentTime,
 *    assembling the bowl as the user scrolls, while the shadow overlay lifts.
 *
 * prefers-reduced-motion skips all three acts: static final poster, copy
 * visible, no pin. A failed fetch falls back to the final poster.
 */
export default function ScrollHero({ onPrimaryClick, onSecondaryClick }: ScrollHeroProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const pendingSeekRef = useRef<number | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const interactionStartedRef = useRef(false);
  const scrubStartedRef = useRef(false);
  const scrollCleanupRef = useRef<(() => void) | null>(null);

  const [isMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  const [reducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoActive, setVideoActive] = useState(false);

  const staticHero = reducedMotion || videoFailed;

  useEffect(() => {
    document.documentElement.classList.toggle('hero-video-active', videoActive);
    return () => document.documentElement.classList.remove('hero-video-active');
  }, [videoActive]);

  // ── Act 1: streaming download with real progress ──────────────────────────
  useEffect(() => {
    if (reducedMotion) return;

    const controller = new AbortController();
    let downloadStarted = false;
    let backgroundTimer = 0;
    const video = videoRef.current;
    const supportsAv1 = Boolean(video?.canPlayType('video/mp4; codecs="av01.0.08M.08"'));
    const src = isMobile
      ? (supportsAv1 ? AV1_MOBILE_VIDEO_SRC : MOBILE_VIDEO_SRC)
      : (supportsAv1 ? AV1_VIDEO_SRC : VIDEO_SRC);

    const removeInteractionListeners = () => {
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
    const attachBufferedVideo = () => {
      if (!interactionStartedRef.current || !blobUrlRef.current || !video || video.src) return;
      video.src = blobUrlRef.current;
      video.load();
      removeInteractionListeners();
    };
    function handleInteraction() {
      interactionStartedRef.current = true;
      startDownload();
      attachBufferedVideo();
    }

    window.addEventListener('scroll', handleInteraction, { passive: true });
    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });

    const downloadVideo = async () => {
      try {
        const res = await fetch(src, { signal: controller.signal });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.getReader();
        const chunks: BlobPart[] = [];

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const blobUrl = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
        blobUrlRef.current = blobUrl;
        attachBufferedVideo();
      } catch {
        if (!controller.signal.aborted) setVideoFailed(true); // drops the veil with the static fallback
      }
    };

    function startDownload() {
      if (downloadStarted) return;
      downloadStarted = true;
      void downloadVideo();
    }

    const scheduleBackgroundDownload = () => {
      backgroundTimer = window.setTimeout(startDownload, 1500);
    };

    if (document.readyState === 'complete') scheduleBackgroundDownload();
    else window.addEventListener('load', scheduleBackgroundDownload, { once: true });

    return () => {
      controller.abort();
      window.clearTimeout(backgroundTimer);
      window.removeEventListener('load', scheduleBackgroundDownload);
      removeInteractionListeners();
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSeeked = useCallback(() => {
    const video = videoRef.current;
    if (video && pendingSeekRef.current !== null) {
      video.currentTime = pendingSeekRef.current;
      pendingSeekRef.current = null;
    }
  }, []);

  // Once buffered, enable deterministic scroll scrubbing.
  const handleVideoReady = useCallback(() => {
    if (scrubStartedRef.current) return;
    scrubStartedRef.current = true;
    setVideoActive(true);

    const video = videoRef.current;
    if (video) video.currentTime = 0;

    let frame = 0;
    const update = () => {
      frame = 0;
      const wrapper = wrapperRef.current;
      const v = videoRef.current;
      if (!wrapper || !v) return;

      const wrapperTop = wrapper.getBoundingClientRect().top + window.scrollY;
      const scrollDistance = Math.max(wrapper.offsetHeight - window.innerHeight, 1);
      const progress = Math.min(1, Math.max(0, (window.scrollY - wrapperTop) / scrollDistance));

      if (v.duration) {
        const target = progress * (v.duration - 0.05);
        if (v.seeking) pendingSeekRef.current = target;
        else v.currentTime = target;
      }
      if (overlayRef.current) overlayRef.current.style.opacity = String(0.72 - progress * 0.37);
      v.style.transform = `scale(${1.06 - progress * 0.06})`;
      // The responsive poster is the first frame and remains the paint
      // candidate until the visitor actually starts the scrub.
      v.style.display = progress > 0.002 ? 'block' : 'none';
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };

    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    scrollCleanupRef.current = () => {
      window.removeEventListener('scroll', requestUpdate);
      window.removeEventListener('resize', requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
    update();
  }, []);

  useEffect(() => () => scrollCleanupRef.current?.(), []);

  return (
    <div ref={wrapperRef} className={staticHero ? '' : 'h-[200vh] sm:h-[250vh]'}>
      <div
        ref={heroRef}
        className={
          ((staticHero || videoActive) ? 'hero-grain ' : '') +
          'relative w-full overflow-hidden flex items-center justify-center ' +
          (staticHero ? 'min-h-[480px]' : 'sticky top-0 h-screen')
        }
        style={{ background: staticHero ? 'hsl(var(--mesa))' : 'transparent' }}
      >
        {/* The critical poster is parsed in index.html; video overlays it after interaction. */}
        {!staticHero ? (
          <video
            ref={videoRef}
            muted
            playsInline
            preload="none"
            onLoadedData={handleVideoReady}
            onSeeked={handleSeeked}
            onError={() => setVideoFailed(true)}
            className="absolute inset-0 z-[2] w-full h-full object-cover will-change-transform"
            style={{ transform: 'scale(1.06)', display: 'none' }}
          />
        ) : (
          <img
            src={POSTER_FINAL_SRC}
            alt="Paisa Bowl con todos sus ingredientes"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Shadow overlay the scene emerges from as you scroll */}
        {(staticHero || videoActive) && (
          <>
            <div
              ref={overlayRef}
              className="absolute inset-0 z-[3] bg-black"
              style={{ opacity: staticHero ? 0.35 : 0.72 }}
            />
            <div className="absolute inset-x-0 bottom-0 z-[3] h-1/2 bg-gradient-to-t from-black/60 to-transparent" />
          </>
        )}

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
                <span
                  data-hero-word
                  className="inline-block"
                >
                  {word}
                </span>
                {i < TITLE_WORDS.length - 1 ? <span aria-hidden="true">&nbsp;</span> : null}
              </span>
            ))}
          </h1>
          <p
            data-hero-sub
            className="text-sm sm:text-lg text-white/90 max-w-md drop-shadow"
          >
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

      </div>
    </div>
  );
}
