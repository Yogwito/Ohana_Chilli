const PHRASES = ['Comida real', 'Sabor real', 'Bowls frescos', 'Cable Plaza · Piso 4', 'Manizales'];

/**
 * Brand marquee strip on the deep-emerald tabletop green. Pure CSS animation
 * (see .marquee-track in index.css) so it costs nothing on the main thread
 * and pauses automatically under prefers-reduced-motion.
 */
export default function BrandMarquee() {
  const sequence = (
    <>
      {PHRASES.map((phrase) => (
        <span key={phrase} className="flex items-center gap-6 shrink-0">
          <span className="hero-title text-lg sm:text-2xl uppercase tracking-wide text-white/90">{phrase}</span>
          <span aria-hidden="true" className="h-2 w-2 rounded-full shrink-0" style={{ background: 'hsl(var(--maiz))' }} />
        </span>
      ))}
    </>
  );

  return (
    <div
      aria-hidden="true"
      className="relative overflow-hidden py-4 select-none"
      style={{ background: 'hsl(var(--mesa))' }}
    >
      <div className="marquee-track flex items-center gap-6 w-max">
        {sequence}
        {sequence}
        {sequence}
      </div>
    </div>
  );
}
