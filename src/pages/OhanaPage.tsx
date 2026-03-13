import { Suspense, lazy } from 'react';
import { Leaf } from 'lucide-react';
import PageHero from '@/components/layout/PageHero';
import SEOHead from '@/components/SEOHead';
import ProductCard from '@/components/products/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useBowlRules, useProducts } from '@/hooks/use-catalog';
import MenuBrandNav from '@/components/menu/MenuBrandNav';
import MenuContactSection from '@/components/menu/MenuContactSection';
import { formatPrice } from '@/domain/formatPrice';

const BowlBuilder = lazy(() => import('@/components/ohana/BowlBuilder'));

function SectionHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-6">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ohana">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
    </div>
  );
}

export default function OhanaPage() {
  const { data: suggestedBowls = [], isLoading: loadingBowls, error: bowlsError } = useProducts({
    brandId: 'ohana',
    categoryId: 'ohana-bowls-sugeridos',
  });
  const { data: beverages = [], isLoading: loadingBeverages, error: beveragesError } = useProducts({
    brandId: 'ohana',
    categoryId: 'ohana-bebidas',
  });
  const { data: bowlRules = [], isLoading: loadingRules } = useBowlRules();

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Ohana Bowls"
        description="Carta definitiva de Ohana Bowls con bowls sugeridos, arma tu bowl y bebidas."
        path="/ohana"
      />

      <PageHero
        icon={Leaf}
        title="Ohana Bowls"
        subtitle="Carta definitiva"
        description="Bowls frescos, personalizables y faciles de escanear. La pagina actual del menu ahora muestra la carta definitiva de Ohana."
        brand="ohana"
      />

      <section className="py-8 sm:py-10">
        <div className="container space-y-10">
          <MenuBrandNav />

          <section id="ohana-arma-tu-bowl" className="rounded-[2rem] border bg-card p-6 sm:p-8">
            <SectionHeader
              eyebrow="Arma tu bowl"
              title="Configura Ohana paso a paso"
              description="La estructura del bowl quedo actualizada con bases, proteinas, acompanantes, salsas y complementos segun la carta definitiva."
            />

            <div className="mb-8">
              <div className="grid gap-4 md:grid-cols-3">
                {(loadingRules ? [] : bowlRules).map((size) => (
                  <article key={size.size} className="rounded-2xl border bg-muted/30 p-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">{size.name}</p>
                    <p className="mt-2 text-2xl font-bold text-ohana-dark">{formatPrice(size.price)}</p>
                    <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                      <li>1 base</li>
                      <li>{size.maxProteins} proteinas</li>
                      <li>{size.maxAcompanantes} acompanantes</li>
                      <li>{size.maxSauces} salsas</li>
                      <li>{size.maxComplementos} complementos</li>
                    </ul>
                  </article>
                ))}
              </div>
            </div>

            <Suspense fallback={<Skeleton className="h-[520px] rounded-[2rem]" />}>
              <BowlBuilder />
            </Suspense>
          </section>

          <section id="ohana-bowls-sugeridos">
            <SectionHeader
              eyebrow="Bowls sugeridos"
              title="Combinaciones listas para pedir"
              description="Los bowls sugeridos reemplazaron por completo el catalogo anterior y se muestran como productos editables desde la fuente de datos del menu."
            />

            {loadingBowls ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3].map((item) => (
                  <Skeleton key={item} className="h-72 rounded-2xl" />
                ))}
              </div>
            ) : bowlsError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
                No fue posible cargar los bowls sugeridos.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {suggestedBowls.map((product) => (
                  <ProductCard key={product.id} product={product} categoryName="Bowls sugeridos" />
                ))}
              </div>
            )}
          </section>

          <section id="ohana-bebidas">
            <SectionHeader
              eyebrow="Bebidas"
              title="Acompanamientos para Ohana"
              description="Bebidas cargadas dentro de la misma pagina actual del menu, sin duplicar rutas ni crear una segunda version."
            />

            {loadingBeverages ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {[1, 2, 3, 4].map((item) => (
                  <Skeleton key={item} className="h-72 rounded-2xl" />
                ))}
              </div>
            ) : beveragesError ? (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
                No fue posible cargar las bebidas de Ohana.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {beverages.map((product) => (
                  <ProductCard key={product.id} product={product} categoryName="Bebidas" />
                ))}
              </div>
            )}
          </section>

          <MenuContactSection />
        </div>
      </section>
    </div>
  );
}
