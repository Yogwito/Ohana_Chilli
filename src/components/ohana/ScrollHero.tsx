import { useLayoutEffect, useRef } from 'react';
import { ArrowDown, MapPin } from 'lucide-react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import HeroIngredientsScene from '@/components/ohana/HeroIngredientsScene';

gsap.registerPlugin(ScrollTrigger);

interface ScrollHeroProps {
  onPrimaryClick: () => void;
  onSecondaryClick: () => void;
}

export default function ScrollHero({ onPrimaryClick, onSecondaryClick }: ScrollHeroProps) {
  const heroRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const hero = heroRef.current;
    if (!hero) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const context = gsap.context(() => {
      if (reduceMotion) {
        gsap.set('[data-hero-reveal]', { clearProps: 'all' });
        return;
      }

      gsap.timeline({ defaults: { ease: 'power3.out' } })
        .fromTo(
          '[data-hero-reveal]',
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.82, stagger: 0.09, clearProps: 'transform,opacity,visibility' },
        );

      if (imageRef.current) {
        gsap.fromTo(
          imageRef.current,
          { scale: 1.035, yPercent: -2 },
          {
            scale: 1.105,
            yPercent: 5,
            ease: 'none',
            scrollTrigger: {
              trigger: hero,
              start: 'top top',
              end: 'bottom top',
              scrub: 0.7,
            },
          },
        );
      }

      if (sceneRef.current) {
        gsap.to(sceneRef.current, {
          yPercent: 12,
          rotate: 2,
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.8,
          },
        });
      }
    }, hero);

    return () => context.revert();
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative isolate h-[72svh] min-h-[560px] max-h-[760px] overflow-hidden bg-[hsl(var(--mesa))]"
    >
      <picture className="absolute inset-0">
        {/* El original es 4096×2220 (822 KiB) y se pintaba a ~404×629 CSS px en
            móvil: cinco veces más ancho de lo necesario y el recurso más pesado
            de toda la carga. Mismo encuadre, ahora en escalones; el navegador
            baja el que corresponde al viewport. `fetchPriority="high"` porque
            ocupa el primer viewport completo. */}
        <img
          ref={imageRef}
          src="/images/bowl-hero-1280.webp"
          srcSet={[
            '/images/bowl-hero-640.webp 640w',
            '/images/bowl-hero-960.webp 960w',
            '/images/bowl-hero-1280.webp 1280w',
            '/images/bowl-hero-1920.webp 1920w',
            '/images/bowl-hero-2560.webp 2560w',
          ].join(', ')}
          sizes="100vw"
          alt="Bowl de Ohana preparado con ingredientes frescos"
          width={4096}
          height={2220}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover object-[61%_50%] will-change-transform sm:object-center"
        />
      </picture>

      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,24,17,0.94)_0%,rgba(8,24,17,0.77)_44%,rgba(8,24,17,0.18)_78%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(8,24,17,0.82)_0%,transparent_56%)] sm:hidden" />

      <div
        ref={sceneRef}
        className="pointer-events-none absolute inset-0 z-[1] opacity-90 will-change-transform sm:opacity-100"
      >
        <HeroIngredientsScene />
      </div>

      <div className="container relative z-10 flex h-full items-end pb-10 pt-20 sm:items-center sm:pb-12">
        <div className="max-w-[680px] text-white">
          <div
            data-hero-reveal
            className="mb-4 flex items-center gap-2 font-utility text-[11px] font-semibold uppercase tracking-[0.12em] text-white/75 sm:mb-5"
          >
            <MapPin className="h-3.5 w-3.5 text-[hsl(var(--maiz))]" />
            Cable Plaza · Piso 4
          </div>

          <h1
            data-hero-reveal
            className="max-w-[620px] text-[3.45rem] leading-[0.86] text-white sm:text-[5.5rem] lg:text-[7.2rem]"
          >
            Bowls hechos
            <span className="block text-[hsl(var(--maiz))]">a tu manera.</span>
          </h1>

          <p
            data-hero-reveal
            className="mt-5 max-w-md text-[15px] font-medium leading-relaxed text-white/82 sm:mt-6 sm:text-lg"
          >
            Elige el tamaño, combina ingredientes frescos y recibe un pedido exactamente como lo quieres.
          </p>

          <div data-hero-reveal className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onPrimaryClick}
              className="inline-flex min-h-12 items-center justify-center rounded-md bg-[hsl(var(--maiz))] px-6 text-sm font-extrabold text-[hsl(var(--maiz-foreground))] transition-colors hover:bg-white"
            >
              Armar mi bowl
            </button>
            <button
              type="button"
              onClick={onSecondaryClick}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-white/45 px-6 text-sm font-bold text-white transition-colors hover:border-white hover:bg-white/10"
            >
              Ver platos listos
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div
        data-hero-reveal
        className="absolute bottom-0 right-0 z-10 hidden border-l border-t border-white/25 bg-black/20 px-5 py-3 font-utility text-[10px] uppercase tracking-[0.12em] text-white/75 backdrop-blur-sm sm:block"
      >
        Fresco · rápido · hecho por ti
      </div>
    </section>
  );
}
