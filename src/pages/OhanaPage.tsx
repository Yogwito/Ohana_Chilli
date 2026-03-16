import { Suspense, lazy } from 'react';
import { Leaf } from 'lucide-react';
import SEOHead from '@/components/SEOHead';
import MenuBrandNav from '@/components/menu/MenuBrandNav';
import MenuContactSection from '@/components/menu/MenuContactSection';
import PageHero from '@/components/layout/PageHero';
import ProductCard from '@/components/products/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts } from '@/hooks/use-catalog';

const BowlBuilder = lazy(() => import('@/components/ohana/BowlBuilder'));

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
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
        subtitle="Bowls frescos y naturales"
        description="Elige tus ingredientes, arma tu bowl a tu gusto o escoge uno de nuestros combos favoritos. Comida real, sin complicaciones."
        brand="ohana"
      />

      <section className="py-8 sm:py-10">
        <div className="container space-y-10">
          <MenuBrandNav />

          <section id="ohana-arma-tu-bowl" className="rounded-[2rem] border bg-card p-6 sm:p-8">
            <SectionHeader
              eyebrow="Arma tu bowl"
              title="Configura Ohana paso a paso"
              description="Elige tu base, proteina, acompanantes, salsa y complementos. Cada bowl se arma exactamente como lo quieres."
            />

            <Suspense fallback={<Skeleton className="h-[520px] rounded-[2rem]" />}>
              <BowlBuilder />
            </Suspense>
          </section>

          <section id="ohana-bowls-sugeridos">
            <SectionHeader
              eyebrow="Bowls sugeridos"
              title="Combinaciones listas para pedir"
              description="Combinaciones disenadas por nosotros para que llegues, elijas y disfrutes sin pensar demasiado."
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
              description="Jugos naturales, limonadas y mas para completar tu bowl de la mejor manera."
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
