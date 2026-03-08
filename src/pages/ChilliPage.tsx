import { useState, useMemo } from 'react';
import ProductCard from '@/components/products/ProductCard';
import CategoryFilter from '@/components/products/CategoryFilter';
import PageHero from '@/components/layout/PageHero';
import { Skeleton } from '@/components/ui/skeleton';
import { useProducts, useCategories } from '@/hooks/use-catalog';
import { Flame } from 'lucide-react';
import SEOHead from '@/components/SEOHead';

export default function ChilliPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { data: chilliCategories = [] } = useCategories('chilli');
  const { data: chilliProducts = [], isLoading, error } = useProducts({ brandId: 'chilli' });
  const categoryNameById = useMemo(
    () => Object.fromEntries(chilliCategories.map((category) => [category.id, category.name])),
    [chilliCategories],
  );

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return chilliProducts;
    return chilliProducts.filter(p => p.categoryId === selectedCategory);
  }, [selectedCategory, chilliProducts]);

  return (
    <div className="min-h-screen">
      <SEOHead title="Chilli Tex-Mex" description="Hamburguesas, hot dogs, nachos y papas con sabor Tex-Mex en Manizales. Pide tu favorito a domicilio o para recoger." path="/chilli" />
      <PageHero
        icon={Flame}
        title="Chilli"
        subtitle="Comida rápida irresistible"
        description="Los sabores que te encantan, preparados con los mejores ingredientes. Hamburguesas, hot dogs, papas y más."
        brand="chilli"
      />

      <section className="py-8 sm:py-12">
        <div className="container">
          <div className="mb-8">
            <CategoryFilter
              categories={chilliCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              brand="chilli"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>Error al cargar los productos. Intenta de nuevo.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} categoryName={categoryNameById[product.categoryId]} />
              ))}
            </div>
          )}

          {!isLoading && filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No se encontraron productos en esta categoría</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
