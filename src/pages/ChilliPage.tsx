import { useMemo, useState } from 'react';
import { Flame } from 'lucide-react';
import PageHero from '@/components/layout/PageHero';
import SEOHead from '@/components/SEOHead';
import ProductCard from '@/components/products/ProductCard';
import CategoryFilter from '@/components/products/CategoryFilter';
import MenuBrandNav from '@/components/menu/MenuBrandNav';
import MenuContactSection from '@/components/menu/MenuContactSection';
import { Skeleton } from '@/components/ui/skeleton';
import { useCategories, useProducts } from '@/hooks/use-catalog';

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{description}</p>
    </div>
  );
}

export default function ChilliPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { data: chilliCategories = [] } = useCategories('chilli');
  const { data: chilliProducts = [], isLoading, error } = useProducts({ brandId: 'chilli' });

  const groupedProducts = useMemo(
    () =>
      chilliCategories
        .filter((category) => !selectedCategory || category.id === selectedCategory)
        .map((category) => ({
          category,
          products: chilliProducts.filter((product) => product.categoryId === category.id),
        }))
        .filter((group) => group.products.length > 0),
    [chilliCategories, chilliProducts, selectedCategory],
  );

  return (
    <div className="min-h-screen">
      <SEOHead
        title="Chilli"
        description="Carta definitiva de Chilli con burgers, fries, hot dogs, corn bowls, nachos, combos, adicionales y bebidas."
        path="/chilli"
      />

      <PageHero
        icon={Flame}
        title="Chilli"
        subtitle="Carta definitiva"
        description="La pagina actual de Chilli ahora muestra la carta definitiva completa, organizada por categorias y optimizada para lectura rapida en mobile."
        brand="chilli"
      />

      <section className="py-8 sm:py-10">
        <div className="container space-y-10">
          <MenuBrandNav />

          <section className="rounded-[2rem] border bg-card p-6 sm:p-8">
            <SectionHeader
              title="Explora por categoria"
              description="Se reutilizo el filtro existente para navegar entre burgers, fries, hot dogs, corn bowls, nachos, combos, adicionales y bebidas."
            />
            <CategoryFilter
              categories={chilliCategories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              brand="chilli"
            />
          </section>

          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((item) => (
                <Skeleton key={item} className="h-72 rounded-2xl" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
              No fue posible cargar la carta de Chilli.
            </div>
          ) : groupedProducts.length === 0 ? (
            <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
              No hay productos para la categoria seleccionada.
            </div>
          ) : (
            groupedProducts.map(({ category, products }) => (
              <section key={category.id} id={category.slug} className="rounded-[2rem] border bg-card p-6 sm:p-8">
                <SectionHeader
                  title={category.name}
                  description={`Categoria ${category.name.toLowerCase()} actualizada con la carta definitiva.`}
                />
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} categoryName={category.name} />
                  ))}
                </div>
              </section>
            ))
          )}

          <MenuContactSection />
        </div>
      </section>
    </div>
  );
}
