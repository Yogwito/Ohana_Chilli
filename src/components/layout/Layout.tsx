import { ReactNode, useState, lazy, Suspense } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import StickyCartFab from '@/components/cart/StickyCartFab';

const CartDrawer = lazy(() => import('@/components/cart/CartDrawer'));

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      <Footer />
      <StickyCartFab onClick={() => setCartOpen(true)} />
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
