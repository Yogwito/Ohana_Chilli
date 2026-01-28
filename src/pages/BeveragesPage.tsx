import { useState, useMemo } from 'react';
import ProductCard from '@/components/products/ProductCard';
import { beverages, getBeverageCategories } from '@/data/products';
import { cn } from '@/lib/utils';
import { GlassWater } from 'lucide-react';

export default function BeveragesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const beverageCategories = getBeverageCategories();

  const filteredBeverages = useMemo(() => {
    if (!selectedCategory) return beverages;
    return beverages.filter(b => b.categoryId === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-ohana-light/50 to-chilli-muted/50 py-12 sm:py-16">
        <div className="container">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <GlassWater className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h1>Bebidas</h1>
              <p className="text-muted-foreground">Refrescos, jugos y más</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Complementa tu orden con nuestras refrescantes bebidas. 
            Desde jugos naturales hasta tus refrescos favoritos.
          </p>
        </div>
      </section>

      {/* Menu */}
      <section className="py-8 sm:py-12">
        <div className="container">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-8">
            <button
              onClick={() => setSelectedCategory(null)}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-medium transition-all',
                selectedCategory === null
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              Todas
            </button>
            {beverageCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-1.5',
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {category.icon && <span>{category.icon}</span>}
                {category.name}
              </button>
            ))}
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredBeverages.map((beverage) => (
              <ProductCard key={beverage.id} product={beverage} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
