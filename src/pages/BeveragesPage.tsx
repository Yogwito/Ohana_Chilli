import { useState, useMemo } from 'react';
import ProductCard from '@/components/products/ProductCard';
import PageHero from '@/components/layout/PageHero';
import { Skeleton } from '@/components/ui/skeleton';
import { useBeverages, useBeverageCategories } from '@/hooks/use-catalog';
import { cn } from '@/lib/utils';
import { GlassWater } from 'lucide-react';
import SEOHead from '@/components/SEOHead';

export default function BeveragesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { data: beverageCategories = [] } = useBeverageCategories();
  const { data: beverages = [], isLoading, error } = useBeverages();
  const categoryNameById = useMemo(
    () => Object.fromEntries(beverageCategories.map((category) => [category.id, category.name])),
    [beverageCategories],
  );

  const filteredBeverages = useMemo(() => {
    if (!selectedCategory) return beverages;
    return beverages.filter(b => b.categoryId === selectedCategory);
  }, [selectedCategory, beverages]);

  return (
    <div className="min-h-screen">
      <SEOHead title="Bebidas" description="Refrescos, jugos naturales, smoothies y más. Complementa tu orden con las bebidas de Ohana & Chilli." path="/bebidas" />
      <PageHero
        icon={GlassWater}
        title="Bebidas"
        subtitle="Refrescos, cerveza y café"
        description="Complementa tu orden con bebidas de la carta oficial de Ohana y Chilli."
        brand="beverages"
      />

      <section className="py-8 sm:py-12">
        <div className="container">
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

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>Error al cargar las bebidas. Intenta de nuevo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBeverages.map((beverage) => (
                <ProductCard key={beverage.id} product={beverage} categoryName={categoryNameById[beverage.categoryId]} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
