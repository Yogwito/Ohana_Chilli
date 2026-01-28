import { useState, useMemo } from 'react';
import ProductCard from '@/components/products/ProductCard';
import CategoryFilter from '@/components/products/CategoryFilter';
import { chilliProducts, categories } from '@/data/products';
import { Flame } from 'lucide-react';

export default function ChilliPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const chilliCategories = categories.filter(c => c.brand === 'chilli');

  const filteredProducts = useMemo(() => {
    if (!selectedCategory) return chilliProducts;
    return chilliProducts.filter(p => p.categoryId === selectedCategory);
  }, [selectedCategory]);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-chilli-gradient py-12 sm:py-16">
        <div className="container">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-xl bg-chilli/10 flex items-center justify-center">
              <Flame className="w-7 h-7 text-chilli-dark" />
            </div>
            <div>
              <h1 className="text-chilli-dark">Chilli</h1>
              <p className="text-muted-foreground">Comida rápida irresistible</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Los sabores que te encantan, preparados con los mejores ingredientes. 
            Hamburguesas, hot dogs, papas y más.
          </p>
        </div>
      </section>

      {/* Menu */}
      <section className="py-8 sm:py-12">
        <div className="container">
          {/* Category Filter */}
          <div className="mb-8">
            <CategoryFilter
              categories={chilliCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              brand="chilli"
            />
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No se encontraron productos en esta categoría</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
