import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Utensils, ShoppingCart, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/products/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useFeaturedProducts, useBeverages, useCategories } from '@/hooks/use-catalog';
import SEOHead from '@/components/SEOHead';

export default function HomePage() {
  const { data: featuredProducts = [], isLoading: loadingFeatured } = useFeaturedProducts();
  const { data: allBeverages = [], isLoading: loadingBev } = useBeverages();
  const { data: categories = [] } = useCategories();
  const categoryNameById = Object.fromEntries(categories.map((category) => [category.id, category.name]));
  const beveragesPreview = allBeverages.slice(0, 4);

  return (
    <div className="min-h-screen">
      <SEOHead path="/" />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-ohana-gradient border-b border-ohana/15">
        <div className="container py-16 sm:py-24">
          <div className="max-w-2xl">
            <h1 className="mb-4">
              Bowls frescos,{' '}
              <span className="text-brand">hecho para ti</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              Personaliza tu bowl con ingredientes frescos y naturales.
              Saludable, delicioso y listo para pedir por WhatsApp.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button asChild className="btn-ohana">
                <Link to="/ohana">
                  Ver Menú
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/carta">Carta completa</Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-ohana/5 blur-3xl" />
      </section>

      {/* How it Works */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="mb-3">¿Cómo Funciona?</h2>
            <p className="text-muted-foreground">Ordenar es súper fácil</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-ohana/10 flex items-center justify-center mx-auto mb-4">
                <Utensils className="w-8 h-8 text-ohana" />
              </div>
              <div className="w-8 h-8 rounded-full bg-ohana text-ohana-foreground flex items-center justify-center mx-auto mb-4 text-sm font-bold">1</div>
              <h3 className="text-lg font-semibold mb-2">Explora el Menú</h3>
              <p className="text-muted-foreground">Elige entre bowls saludables y personalizables</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-brand-dark" />
              </div>
              <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center mx-auto mb-4 text-sm font-bold">2</div>
              <h3 className="text-lg font-semibold mb-2">Personaliza y Agrega</h3>
              <p className="text-muted-foreground">Arma tu bowl con tus ingredientes favoritos</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-sm font-bold">3</div>
              <h3 className="text-lg font-semibold mb-2">Paga y Recoge</h3>
              <p className="text-muted-foreground">Completa tu orden y recógela cuando esté lista</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-16">
        <div className="container">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="mb-2">Favoritos del Menú</h2>
              <p className="text-muted-foreground">Lo más pedido por nuestros clientes</p>
            </div>
            <Link to="/ohana">
              <Button variant="outline">
                Ver todo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>

          {loadingFeatured ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-80 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} categoryName={categoryNameById[product.categoryId]} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Beverages Teaser */}
      <section className="py-16 bg-beverages-light">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="mb-2 text-beverages">Refréscate</h2>
            <p className="text-muted-foreground">Complementa tu orden con nuestras bebidas</p>
          </div>

          {loadingBev ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {beveragesPreview.map((beverage) => (
                <ProductCard
                  key={beverage.id}
                  product={beverage}
                  variant="compact"
                  categoryName={categoryNameById[beverage.categoryId]}
                />
              ))}
            </div>
          )}

          <div className="text-center mt-8">
            <Link to="/bebidas">
              <Button variant="outline" size="lg" className="border-beverages/30 text-beverages hover:bg-beverages/5">
                Ver todas las bebidas
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-foreground text-background">
        <div className="container text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">¿Listo para ordenar?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">Bowls frescos y personalizables a tu gusto</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/ohana">
              <Button size="lg" className="btn-ohana w-full sm:w-auto">
                <Leaf className="w-5 h-5 mr-2" />
                Ver Menú
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
