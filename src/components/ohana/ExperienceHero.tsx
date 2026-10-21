import { useState } from "react";
import { ArrowDown, ArrowUpRight, MoveUpRight, Sparkles } from "lucide-react";

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
  // Motion is CSS-only (see experience.css: .experience-hero-anim); no GSAP or
  // pointer-tracking so the hero stays cheap on mobile.
  const [flavor, setFlavor] = useState(0);
  const selected = flavors[flavor];

  return (
    <section
      className="experience-hero experience-hero-anim"
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
        <div className="hero-plate">
          <div className="plate-orbit" aria-hidden="true" />
          <img
            key={selected.image}
            className="flavor-photo"
            src={`/images/experience/${selected.image}.webp`}
            alt={`Bowl ${selected.name} de Ohana`}
            width="500"
            height="500"
            loading="eager"
            decoding="async"
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
