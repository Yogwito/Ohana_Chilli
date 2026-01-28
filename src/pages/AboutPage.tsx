import { MapPin, Phone, Clock, Mail, Leaf, Flame } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-ohana-light via-background to-chilli-muted">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="mb-6">Nuestra Historia</h1>
            <p className="text-xl text-muted-foreground">
              Dos pasiones, un lugar. Creemos que la buena comida puede ser saludable 
              y deliciosa al mismo tiempo.
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Leaf className="w-8 h-8 text-ohana" />
                <Flame className="w-8 h-8 text-chilli-dark" />
              </div>
              <h2 className="mb-4">Dos sabores, una familia</h2>
              <p className="text-muted-foreground mb-4">
                Ohana & Chilli nació de la idea de que todos merecemos opciones. 
                Ya sea que busques alimentarte de forma saludable con un bowl fresco 
                y personalizado, o simplemente quieras disfrutar de una hamburguesa 
                jugosa con tus amigos.
              </p>
              <p className="text-muted-foreground">
                Nuestro compromiso es ofrecer ingredientes de calidad, preparados 
                con amor y servidos con la mejor actitud. Porque en Ohana & Chilli, 
                todos son bienvenidos.
              </p>
            </div>
            <div className="bg-gradient-to-br from-ohana-light to-chilli-muted rounded-3xl aspect-square flex items-center justify-center">
              <div className="text-center">
                <span className="text-8xl">🍽️</span>
                <p className="mt-4 text-lg font-medium">Desde 2024</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-muted/50">
        <div className="container">
          <h2 className="text-center mb-12">Nuestros Valores</h2>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-card rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-ohana/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🌱</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Frescura</h3>
              <p className="text-muted-foreground">
                Ingredientes frescos seleccionados diariamente para garantizar 
                la mejor calidad en cada platillo.
              </p>
            </div>
            
            <div className="bg-card rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-chilli/10 flex items-center justify-center mb-4">
                <span className="text-2xl">❤️</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Pasión</h3>
              <p className="text-muted-foreground">
                Cada platillo es preparado con dedicación y amor por lo que hacemos.
              </p>
            </div>
            
            <div className="bg-card rounded-2xl p-6 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-2xl">🤝</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Comunidad</h3>
              <p className="text-muted-foreground">
                Somos parte de tu día a día y trabajamos para ser tu lugar favorito.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
