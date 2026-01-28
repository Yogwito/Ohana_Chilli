import { MapPin, Phone, Clock, Mail, Instagram, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ContactPage() {
  const handleWhatsApp = () => {
    const message = encodeURIComponent('Hola! Tengo una pregunta sobre Ohana & Chilli');
    window.open(`https://wa.me/525512345678?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen py-12 sm:py-16">
      <div className="container">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="mb-4">Contáctanos</h1>
            <p className="text-xl text-muted-foreground">
              ¿Tienes preguntas? Estamos aquí para ayudarte
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Info */}
            <div className="space-y-6">
              <div className="bg-card rounded-2xl p-6 border">
                <h3 className="font-semibold mb-4">Información</h3>
                
                <div className="space-y-4">
                  <a 
                    href="https://maps.google.com" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MapPin className="w-5 h-5 mt-0.5 shrink-0 text-ohana" />
                    <div>
                      <p className="font-medium text-foreground">Ubicación</p>
                      <p>Av. Principal #123, Col. Centro</p>
                      <p>Ciudad, CP 12345</p>
                    </div>
                  </a>
                  
                  <a 
                    href="tel:+525512345678"
                    className="flex items-start gap-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Phone className="w-5 h-5 mt-0.5 shrink-0 text-ohana" />
                    <div>
                      <p className="font-medium text-foreground">Teléfono</p>
                      <p>+52 55 1234 5678</p>
                    </div>
                  </a>
                  
                  <a 
                    href="mailto:hola@ohanachilli.com"
                    className="flex items-start gap-3 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mail className="w-5 h-5 mt-0.5 shrink-0 text-ohana" />
                    <div>
                      <p className="font-medium text-foreground">Email</p>
                      <p>hola@ohanachilli.com</p>
                    </div>
                  </a>
                </div>
              </div>

              <div className="bg-card rounded-2xl p-6 border">
                <h3 className="font-semibold mb-4">Horario</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lunes - Viernes</span>
                    <span className="font-medium">11:00 - 21:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sábado - Domingo</span>
                    <span className="font-medium">12:00 - 22:00</span>
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-2xl p-6 border">
                <h3 className="font-semibold mb-4">Síguenos</h3>
                
                <div className="flex gap-4">
                  <a 
                    href="https://instagram.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white hover:opacity-90 transition-opacity"
                  >
                    <Instagram className="w-6 h-6" />
                  </a>
                  <a 
                    href="https://facebook.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white hover:opacity-90 transition-opacity"
                  >
                    <Facebook className="w-6 h-6" />
                  </a>
                </div>
              </div>
            </div>

            {/* WhatsApp CTA */}
            <div className="flex flex-col">
              <div className="bg-ohana-gradient rounded-2xl p-8 flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 rounded-full bg-ohana/10 flex items-center justify-center mb-6">
                  <span className="text-4xl">💬</span>
                </div>
                <h3 className="text-2xl font-bold mb-3">¿Necesitas ayuda?</h3>
                <p className="text-muted-foreground mb-6">
                  Escríbenos por WhatsApp y te responderemos lo antes posible
                </p>
                <Button 
                  onClick={handleWhatsApp}
                  size="lg" 
                  className="bg-green-500 hover:bg-green-600 text-white"
                >
                  <Phone className="w-5 h-5 mr-2" />
                  Enviar WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
