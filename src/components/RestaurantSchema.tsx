import { Helmet } from 'react-helmet-async';

const schema = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  name: 'Ohana Bowls',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'c.c Cable Plaza Piso 4 Terraza',
    addressLocality: 'Manizales',
    addressRegion: 'Caldas',
    addressCountry: 'CO',
  },
  telephone: '+573215667170',
  openingHours: ['Mo-Fr 11:00-21:00', 'Sa-Su 11:00-21:00'],
  servesCuisine: ['Bowls', 'Comida saludable'],
  url: 'https://ohanachilli.com',
};

export default function RestaurantSchema() {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
