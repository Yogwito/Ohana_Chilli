import BrandIllustration from '@/components/ohana/BrandIllustration';
import { Link } from 'react-router-dom';
import SEOHead from '@/components/SEOHead';

export default function AboutPage() {
  return (
    <div className="experience-about min-h-screen">
      <SEOHead title="Nosotros" description="Conoce la historia de Ohana Bowls. Bowls frescos y personalizables en Manizales, Colombia." path="/nosotros" />
      {/* Hero */}
      <section className="py-16 sm:py-24 bg-ohana-gradient border-b border-ohana/15">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <p className="experience-eyebrow">BOWLS & BUENA ENERGÍA</p>
            <h1 className="mb-6">La buena comida<br /><em>nos reúne.</em></h1>
            <p className="text-xl text-muted-foreground">
              Creemos que la buena comida puede ser saludable y deliciosa al mismo tiempo.
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <BrandIllustration kind="leaf" />
              </div>
              <h2 className="mb-4">Bowls con propósito</h2>
              <p className="text-muted-foreground mb-4">
                Ohana Bowls nació de la idea de que todos merecemos alimentarnos bien.
                Bowls frescos y personalizados, con los ingredientes que más te gustan.
              </p>
              <p className="text-muted-foreground">
                Nuestro compromiso es ofrecer ingredientes de calidad, preparados
                con amor y servidos con la mejor actitud. Porque en Ohana Bowls,
                todos son bienvenidos.
              </p>
            </div>
            <div className="about-bowl-art"><BrandIllustration kind="bowl" /><span>A tu gusto.<br /><em>A tu manera.</em></span></div>
          </div>
        </div>
      </section>

      <div className="brand-divider" aria-hidden="true"><span>✳</span><span>BUENA COMIDA · MEJOR COMPAÑÍA</span><span>✳</span></div>
      {/* Values */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <h2 className="text-center mb-12">Nuestros Valores</h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-ohana/10 flex items-center justify-center mb-4">
                <BrandIllustration kind="leaf" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Frescura</h3>
              <p className="text-muted-foreground">
                Ingredientes frescos seleccionados diariamente para garantizar
                la mejor calidad en cada platillo.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-brand-muted flex items-center justify-center mb-4">
                <BrandIllustration kind="sauce" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Pasión</h3>
              <p className="text-muted-foreground">
                Cada platillo es preparado con dedicación y amor por lo que hacemos.
              </p>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BrandIllustration kind="corn" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Comunidad</h3>
              <p className="text-muted-foreground">
                Somos parte de tu día a día y trabajamos para ser tu lugar favorito.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="about-invitation"><h2>Tu mezcla favorita<br /><em>te está esperando.</em></h2><Link to="/#arma-tu-bowl" className="experience-button">Arma tu bowl ↗</Link></section>
    </div>
  );
}
