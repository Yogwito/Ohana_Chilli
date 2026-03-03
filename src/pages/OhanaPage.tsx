import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductCard from '@/components/products/ProductCard';
import BowlBuilder from '@/components/ohana/BowlBuilder';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts } from '@/hooks/use-catalog';
import { Leaf, Sparkles, ChefHat } from 'lucide-react';

export default function OhanaPage() {
  const [activeTab, setActiveTab] = useState('premade');
  const { data: ohanaProducts = [], isLoading, error } = useProducts({ brandId: 'ohana', categoryId: 'ohana-premade' });

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-ohana-gradient py-12 sm:py-16">
        <div className="container">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-ohana to-ohana-dark flex items-center justify-center shadow-lg shadow-ohana/30">
              <Leaf className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-ohana-dark font-medium tracking-wide">Ohana</h1>
              <p className="text-muted-foreground">Bowls frescos y saludables</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl leading-relaxed">
            Ingredientes frescos, combinaciones deliciosas. Elige un bowl preparado o crea tu propia obra maestra.
          </p>
        </div>
      </section>

      {/* Menu Tabs */}
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
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
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
                <BowlBuilder />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </div>
  );
}
