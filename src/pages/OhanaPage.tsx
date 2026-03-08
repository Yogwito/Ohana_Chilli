import { useState, lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductCard from '@/components/products/ProductCard';
import PageHero from '@/components/layout/PageHero';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts } from '@/hooks/use-catalog';
import { Leaf, Sparkles, ChefHat } from 'lucide-react';
import SEOHead from '@/components/SEOHead';

const BowlBuilder = lazy(() => import('@/components/ohana/BowlBuilder'));

export default function OhanaPage() {
  const [activeTab, setActiveTab] = useState('premade');
  const { data: ohanaProducts = [], isLoading, error } = useProducts({ brandId: 'ohana', categoryId: 'ohana-premade' });

  // Validation: ensure the 5 required bowls are present
  const REQUIRED_BOWLS = ['Teriyaki', 'Chicago', 'Veggie', 'Paisa', 'Pulled Pork'];
  const missingBowls = !isLoading && !error && ohanaProducts.length > 0
    ? REQUIRED_BOWLS.filter(name => !ohanaProducts.some(p => p.name === name))
    : [];

  if (missingBowls.length > 0) {
    console.error(`[OhanaPage] Missing required bowls: ${missingBowls.join(', ')}`);
  }

  return (
    <div className="min-h-screen">
      <SEOHead title="Ohana Bowls" description="Arma tu bowl personalizado con ingredientes frescos. Bowls saludables en Manizales con bases, proteínas y acompañamientos a tu gusto." path="/ohana" />
      <PageHero
        icon={Leaf}
        title="Ohana"
        subtitle="Bowls frescos y saludables"
        description="Ingredientes frescos, combinaciones deliciosas. Elige un bowl preparado o crea tu propia obra maestra."
        brand="ohana"
      />

      <section className="py-8 sm:py-12">
        <div className="container">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
              <TabsTrigger value="premade" className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Bowls sugeridos
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <ChefHat className="w-4 h-4" />
                Arma tu Bowl
              </TabsTrigger>
            </TabsList>

            <TabsContent value="premade" className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Bowls sugeridos</h2>
                <p className="text-muted-foreground">Combinaciones de la carta oficial listas para disfrutar</p>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
                </div>
              ) : error ? (
                <div className="text-center py-12 text-destructive">
                  <p>Error al cargar los productos. Intenta de nuevo.</p>
                </div>
              ) : ohanaProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>No hay bowls disponibles en este momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {ohanaProducts.map((product) => (
                    <ProductCard key={product.id} product={product} categoryName="Bowls sugeridos" />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="custom" className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Arma tu Bowl</h2>
                <p className="text-muted-foreground">Elige tus ingredientes favoritos paso a paso</p>
              </div>
              <div className="max-w-3xl mx-auto">
                <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
                  <BowlBuilder />
                </Suspense>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
