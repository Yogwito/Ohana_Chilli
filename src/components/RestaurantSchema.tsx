import { Helmet } from 'react-helmet-async';
import { getSchemaOpeningHours, parseBusinessAddress } from '@/domain/businessSettings';
import { useBusinessSettings } from '@/hooks/use-catalog';

export default function RestaurantSchema() {
  const { data: businessSettings } = useBusinessSettings();
  const address = parseBusinessAddress(businessSettings?.contactAddress);
  const openingHours = getSchemaOpeningHours({
    hoursWeekday: businessSettings?.hoursWeekday ?? null,
    hoursWeekend: businessSettings?.hoursWeekend ?? null,
  });

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: 'Ohana Bowls',
    address: address.streetAddress
      ? {
          '@type': 'PostalAddress',
          streetAddress: address.streetAddress,
          addressLocality: address.addressLocality,
          addressRegion: address.addressRegion,
          addressCountry: address.addressCountry,
        }
      : undefined,
    telephone: businessSettings?.whatsappNumber ? `+${businessSettings.whatsappNumber}` : undefined,
    openingHours: openingHours.length > 0 ? openingHours : undefined,
    servesCuisine: ['Bowls', 'Comida saludable'],
    url: 'https://ohanachilli.com',
  };

  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(schema)}</script>
    </Helmet>
  );
}
