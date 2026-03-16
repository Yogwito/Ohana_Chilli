import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  path?: string;
  type?: string;
}

const SITE_NAME = 'Ohana & Chilli';
const BASE_URL = 'https://ohanachilli.com';
const DEFAULT_DESCRIPTION = 'Restaurante en Manizales con bowls frescos personalizables y comida Tex-Mex. Pide a domicilio o recoge en sucursal.';

export default function SEOHead({
  title,
  description = DEFAULT_DESCRIPTION,
  path = '/',
  type = 'website',
}: SEOHeadProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} | Bowls Frescos y Comida Tex-Mex en Manizales`;
  const url = `${BASE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={`${BASE_URL}/og-image.jpg`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
