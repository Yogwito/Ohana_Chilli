import { Clock3, MapPin, Salad } from 'lucide-react';
import SEOHead from '@/components/SEOHead';

const VALUES = [
  {
    title: 'Fresco de verdad',
    description: 'Ingredientes visibles, preparaciones claras y combinaciones que mantienen su textura y sabor.',
  },
  {
    title: 'Hecho para ti',
    description: 'Cada bowl se puede ajustar. Tú decides el tamaño, la mezcla y el ritmo de tu comida.',
  },
  {
    title: 'Cerca y sin vueltas',
    description: 'Estamos en Cable Plaza y atendemos pedidos directos para recoger o recibir en casa.',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      <SEOHead title="Nosotros" description="Conoce la historia de Ohana Bowls. Bowls frescos y personalizables en Manizales, Colombia." path="/nosotros" />

      <section className="relative isolate min-h-[520px] overflow-hidden">
        <img
          src="/images/ohana-terraza.jpeg"
          alt="Terraza de Ohana Bowls en Cable Plaza"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(10,28,20,0.9),rgba(10,28,20,0.3))]" />
        <div className="container relative z-10 flex min-h-[520px] items-end py-12 sm:items-center sm:py-16">
          <div className="max-w-2xl text-white">
            <p className="font-utility text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsl(var(--maiz))]">
              Ohana Bowls · Manizales
            </p>
            <h1 className="mt-4 text-white">Comer bien también puede sentirse fácil.</h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/78 sm:text-lg">
              Nacimos para servir comida fresca sin fórmulas rígidas: bowls que se adaptan a lo que te gusta y al tiempo que tienes.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b">
        <div className="container grid divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
          <div className="flex gap-3 py-6 md:px-6 md:first:pl-0">
            <Salad className="h-5 w-5 shrink-0 text-brand-dark dark:text-brand" />
            <div>
              <p className="text-sm font-bold">Bowls personalizables</p>
              <p className="mt-1 text-xs text-muted-foreground">Decide cada ingrediente</p>
            </div>
          </div>
          <div className="flex gap-3 py-6 md:px-6">
            <MapPin className="h-5 w-5 shrink-0 text-brand-dark dark:text-brand" />
            <div>
              <p className="text-sm font-bold">Cable Plaza</p>
              <p className="mt-1 text-xs text-muted-foreground">Piso 4, terraza</p>
            </div>
          </div>
          <div className="flex gap-3 py-6 md:px-6 md:last:pr-0">
            <Clock3 className="h-5 w-5 shrink-0 text-brand-dark dark:text-brand" />
            <div>
              <p className="text-sm font-bold">Listo cuando tú lo estás</p>
              <p className="mt-1 text-xs text-muted-foreground">Para recoger o domicilio</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-14 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="section-kicker">Nuestra forma de cocinar</p>
            <h2 className="mt-3">Pocas promesas. Bien cumplidas.</h2>
          </div>
          <div className="grid border-t md:grid-cols-3">
            {VALUES.map((value, index) => (
              <article key={value.title} className="border-b py-6 md:border-r md:px-5 md:last:border-r-0">
                <p className="font-utility text-[10px] font-semibold text-muted-foreground">0{index + 1}</p>
                <h3 className="mt-5 text-2xl">{value.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{value.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
