import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, Flame, Utensils, ShoppingCart, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/products/ProductCard';
import { getFeaturedProducts, beverages } from '@/data/products';

export default function HomePage() {
  const featuredProducts = getFeaturedProducts();

  return (
    <div className="min-h-screen">
      {/* Hero Section - Split Brand */}
      <section className="relative overflow-hidden">
        <div className="container py-12 sm:py-20">
          <div className="text-center mb-12">
            <h1 className="mb-4">
              Dos sabores,{' '}
              <span className="text-ohana">un destino</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Descubre la perfecta combinación entre comida saludable y antojos irresistibles. 
              Todo bajo un mismo techo.
            </p>
          </div>

          {/* Brand Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {/* Ohana Card */}
            <Link 
              to="/ohana"
              className="group relative overflow-hidden rounded-3xl bg-ohana-gradient p-8 sm:p-10 transition-all duration-300 hover:shadow-2xl hover:shadow-ohana/20"
            >
              <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-ohana/10 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-ohana/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-ohana/10 flex items-center justify-center mb-6 group-hover:bg-ohana/20 transition-colors">
                  <Leaf className="w-8 h-8 sm:w-10 sm:h-10 text-ohana" />
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-bold text-ohana mb-3">Ohana</h2>
                <p className="text-lg text-muted-foreground mb-6 max-w-sm">
                  Bowls frescos y personalizables. Elige tus ingredientes favoritos y crea tu combinación perfecta.
                </p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 rounded-full bg-ohana/10 text-ohana text-sm font-medium">
                    🥗 Bowls
                  </span>
                  <span className="px-3 py-1 rounded-full bg-ohana/10 text-ohana text-sm font-medium">
                    🥑 Saludable
                  </span>
                  <span className="px-3 py-1 rounded-full bg-ohana/10 text-ohana text-sm font-medium">
                    ✨ Personalizable
                  </span>
                </div>

                <Button className="btn-ohana group-hover:translate-x-1 transition-transform">
                  Ordenar Ohana
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Link>

            {/* Chilli Card */}
            <Link 
              to="/chilli"
              className="group relative overflow-hidden rounded-2xl bg-chilli-gradient p-8 sm:p-10 transition-all duration-200 hover:shadow-2xl hover:shadow-chilli/20"
            >
              <div className="absolute top-0 right-0 w-32 h-32 sm:w-48 sm:h-48 bg-chilli/10 rounded-lg rotate-12 -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 sm:w-32 sm:h-32 bg-chilli-dark/5 rounded-lg -rotate-12 translate-y-1/2 -translate-x-1/2" />
              
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-chilli/10 flex items-center justify-center mb-6 group-hover:bg-chilli/20 transition-colors">
                  <Flame className="w-8 h-8 sm:w-10 sm:h-10 text-chilli-dark" />
                </div>
                
                <h2 className="text-3xl sm:text-4xl font-bold text-chilli-dark mb-3">Chilli</h2>
                <p className="text-lg text-muted-foreground mb-6 max-w-sm">
                  Comida rápida con el sabor que te encanta. Hamburguesas, hot dogs, papas y más.
                </p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                  <span className="px-3 py-1 rounded-lg bg-chilli/10 text-chilli-dark text-sm font-bold">
                    🍔 Burgers
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-chilli/10 text-chilli-dark text-sm font-bold">
                    🌭 Hot Dogs
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-chilli/10 text-chilli-dark text-sm font-bold">
                    🍟 Papas
                  </span>
                </div>

                <Button className="btn-chilli group-hover:scale-105 transition-transform">
                  Ordenar Chilli
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="mb-3">¿Cómo Funciona?</h2>
            <p className="text-muted-foreground">Ordenar es súper fácil</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-ohana/10 flex items-center justify-center mx-auto mb-4">
                <Utensils className="w-8 h-8 text-ohana" />
              </div>
              <div className="w-8 h-8 rounded-full bg-ohana text-ohana-foreground flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                1
              </div>
              <h3 className="text-lg font-semibold mb-2">Explora el Menú</h3>
              <p className="text-muted-foreground">
                Elige entre bowls saludables de Ohana o los antojitos de Chilli
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center mx-auto mb-4">
                <ShoppingCart className="w-8 h-8 text-chilli-dark" />
              </div>
              <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                2
              </div>
              <h3 className="text-lg font-semibold mb-2">Personaliza y Agrega</h3>
              <p className="text-muted-foreground">
                Arma tu bowl o elige tus extras favoritos
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-primary" />
              </div>
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-4 text-sm font-bold">
                3
              </div>
              <h3 className="text-lg font-semibold mb-2">Paga y Recoge</h3>
              <p className="text-muted-foreground">
                Completa tu orden y recógela cuando esté lista
              </p>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* Beverages Teaser */}
      <section className="py-16 bg-gradient-to-br from-ohana-light via-background to-chilli-muted">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="mb-2">Refréscate</h2>
            <p className="text-muted-foreground">Complementa tu orden con nuestras bebidas</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {beverages.slice(0, 4).map((beverage) => (
              <ProductCard key={beverage.id} product={beverage} variant="compact" />
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/bebidas">
              <Button variant="outline" size="lg">
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
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            ¿Listo para ordenar?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
            Mezcla lo mejor de ambos mundos en una sola orden
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/ohana">
              <Button size="lg" className="btn-ohana w-full sm:w-auto">
                <Leaf className="w-5 h-5 mr-2" />
                Ordenar Ohana
              </Button>
            </Link>
            <Link to="/chilli">
              <Button size="lg" className="btn-chilli w-full sm:w-auto">
                <Flame className="w-5 h-5 mr-2" />
                Ordenar Chilli
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
