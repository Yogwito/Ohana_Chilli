import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUpRight, MoveUpRight, Sparkles } from "lucide-react";
import { gsap } from "gsap";

const flavors = [
  {
    name: "Caribe",
    image: "caribe",
    mood: "Un pequeño viaje al trópico.",
    color: "#c9dfac",
  },
  {
    name: "Veggie",
    image: "veggie",
    mood: "Todo el color. Todo el sabor.",
    color: "#edc1a6",
  },
  {
    name: "Paisa",
    image: "paisa",
    mood: "Un antojo que sabe a casa.",
    color: "#ded0f2",
  },
];

export default function ExperienceHero({
  onExplore,
  onBuild,
}: {
  onExplore: () => void;
  onBuild: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const [flavor, setFlavor] = useState(0);
  const selected = flavors[flavor];

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.from("[data-hero-line]", {
          yPercent: 105,
          stagger: 0.09,
          duration: 0.95,
          ease: "power4.out",
        });
        gsap.from(".experience-visual", {
          opacity: 0,
          scale: 0.94,
          duration: 1,
          ease: "power3.out",
        });
        gsap.from("[data-hero-detail]", {
          opacity: 0,
          y: 15,
          stagger: 0.1,
          delay: 0.3,
          duration: 0.6,
        });
      },
      root,
    );
    mm.add(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
      () => {
        const el = plate.current;
        if (!el) return;
        const x = gsap.quickTo(el, "rotationY", {
          duration: 0.7,
          ease: "power3.out",
        });
        const y = gsap.quickTo(el, "rotationX", {
          duration: 0.7,
          ease: "power3.out",
        });
        const move = (event: PointerEvent) => {
          const rect = el.getBoundingClientRect();
          x(((event.clientX - rect.left) / rect.width - 0.5) * 12);
          y(-((event.clientY - rect.top) / rect.height - 0.5) * 12);
        };
        const reset = () => {
          x(0);
          y(0);
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", reset);
        return () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", reset);
        };
      },
      root,
    );
    return () => mm.revert();
  }, []);

  useEffect(() => {
    const mm = gsap.matchMedia();
    mm.add(
      "(prefers-reduced-motion: no-preference)",
      () => {
        gsap.fromTo(
          ".flavor-photo",
          { opacity: 0, rotation: -8, scale: 0.92 },
          {
            opacity: 1,
            rotation: 0,
            scale: 1,
            duration: 0.65,
            ease: "power3.out",
          },
        );
      },
      root,
    );
    return () => mm.revert();
  }, [flavor]);

  return (
    <section
      ref={root}
      className="experience-hero"
      aria-labelledby="experience-title"
    >
      <div className="experience-copy">
        <p className="experience-eyebrow" data-hero-detail>
          <span className="tiny-flower">✳</span> BOWLS & BUENA ENERGÍA ·
          MANIZALES
        </p>
        <h1 id="experience-title" className="experience-title">
          <span className="hero-line-mask">
            <span data-hero-line>COME</span>
          </span>
          <span className="hero-line-mask">
            <span data-hero-line>BIEN.</span>
          </span>
          <span className="hero-line-mask">
            <span data-hero-line className="title-outline">
              SIÉNTETE
            </span>
          </span>
          <span className="hero-line-mask">
            <span data-hero-line>
              INCREÍBLE<span className="title-dot">.</span>
            </span>
          </span>
        </h1>
        <div className="hero-bottom" data-hero-detail>
          <p>
            Tu mezcla. Tu antojo. Tu momento.
            <br />
            Un bowl lleno de lo que te gusta.
          </p>
          <div className="experience-actions">
            <button className="experience-button" onClick={onBuild}>
              Arma tu bowl <ArrowUpRight size={20} />
            </button>
            <button className="experience-text-link" onClick={onExplore}>
              Explorar menú <ArrowDown size={17} />
            </button>
          </div>
        </div>
      </div>
      <div
        className="experience-visual"
        style={{ backgroundColor: selected.color }}
      >
        <div className="visual-caption">
          <span>HECHO A TU MANERA</span>
          <Sparkles size={19} />
        </div>
        <div className="hero-plate" ref={plate}>
          <div className="plate-orbit" aria-hidden="true" />
          <img
            key={selected.image}
            className="flavor-photo"
            src={`/images/experience/${selected.image}.webp`}
            alt={`Bowl ${selected.name} de Ohana`}
            width="500"
            height="500"
            loading="eager"
          />
          <div className="flavor-sticker" aria-hidden="true">
            MUCHO
            <br />
            <span>sabor</span>
            <MoveUpRight size={23} />
          </div>
        </div>
        <div className="flavor-controls">
          <div className="flavor-description" aria-live="polite">
            <span>EL MOOD DE HOY</span>
            <p>{selected.mood}</p>
          </div>
          <div className="flavor-options" aria-label="Explorar sabores">
            {flavors.map((item, index) => (
              <button
                key={item.name}
                type="button"
                aria-pressed={flavor === index}
                onClick={() => setFlavor(index)}
              >
                {item.name}
                <span aria-hidden="true">↗</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="experience-ribbon" aria-hidden="true">
        <span>A TU GUSTO</span>
        <span>✳</span>
        <span>A TU RITMO</span>
        <span>✳</span>
        <span>MUY OHANA</span>
        <span>✳</span>
        <span>A TU GUSTO</span>
        <span>✳</span>
        <span>A TU RITMO</span>
        <span>✳</span>
      </div>
    </section>
  );
}
