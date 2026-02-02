import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductCard from '@/components/products/ProductCard';
import BowlBuilder from '@/components/ohana/BowlBuilder';
import { ohanaProducts } from '@/data/products';
import { Leaf, Sparkles, ChefHat } from 'lucide-react';

export default function OhanaPage() {
  const [activeTab, setActiveTab] = useState('premade');

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
                Bowls Preparados
              </TabsTrigger>
              <TabsTrigger value="custom" className="flex items-center gap-2">
                <ChefHat className="w-4 h-4" />
                Arma tu Bowl
              </TabsTrigger>
            </TabsList>

            {/* Premade Bowls */}
            <TabsContent value="premade" className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Bowls Preparados</h2>
                <p className="text-muted-foreground">
                  Nuestras combinaciones favoritas, listas para disfrutar
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {ohanaProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </TabsContent>

            {/* Build Your Own */}
            <TabsContent value="custom" className="animate-fade-in">
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Arma tu Bowl</h2>
                <p className="text-muted-foreground">
                  Elige tus ingredientes favoritos paso a paso
                </p>
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
