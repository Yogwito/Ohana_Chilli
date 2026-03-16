import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/context/CartContext";
import { lazy, Suspense } from "react";
import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import HomePage from "./pages/HomePage";
import NotFound from "./pages/NotFound";

// Lazy-loaded routes
const OhanaPage = lazy(() => import("./pages/OhanaPage"));
const ChilliPage = lazy(() => import("./pages/ChilliPage"));
const BeveragesPage = lazy(() => import("./pages/BeveragesPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const CartaPage = lazy(() => import("./pages/CartaPage"));
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,  // 5 minutes
      gcTime: 1000 * 60 * 10,    // 10 minutes
      retry: 2,
    },
  },
});

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Admin routes without Layout */}
              <Route path="/admin/login" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><AdminLoginPage /></Suspense></ErrorBoundary>} />
              <Route path="/admin" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><AdminPage /></Suspense></ErrorBoundary>} />

              {/* Public routes with Layout */}
              <Route path="/" element={<Layout><HomePage /></Layout>} />
              <Route path="/ohana" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><OhanaPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/chilli" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><ChilliPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/bebidas" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><BeveragesPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/checkout" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><CheckoutPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/nosotros" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><AboutPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/contacto" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><ContactPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/pedidos" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><OrdersPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/carta" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><CartaPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="*" element={<Layout><NotFound /></Layout>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
