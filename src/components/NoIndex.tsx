import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { PRIVATE_PATHS } from '@/config/site';

/** Emits noindex for private routes; mounted once inside the Router (App.tsx). */
export default function NoIndex() {
  const { pathname } = useLocation();
  const isPrivate = PRIVATE_PATHS.some((p) => pathname === p || pathname.startsWith(p.endsWith('/') ? p : `${p}/`));
  if (!isPrivate) return null;
  return (
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );
}
