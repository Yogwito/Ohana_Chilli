import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/context/CartContext";
import { useCatalogCrossTabSync } from "@/hooks/use-catalog-sync";
import { lazy, Suspense } from "react";
import Layout from "@/components/layout/Layout";
import ErrorBoundary from "@/components/layout/ErrorBoundary";
import NotFound from "./pages/NotFound";
import OhanaPage from "./pages/OhanaPage";

// Lazy-loaded routes
// Checkout es la única ruta que quedaba estática: arrastraba su formulario y
// validación al bundle inicial aunque solo se visita al final del pedido.
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const BeveragesPage = lazy(() => import("./pages/BeveragesPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const PaymentResultPage = lazy(() => import("./pages/PaymentResultPage"));
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

const CatalogSyncBridge = () => {
  useCatalogCrossTabSync();
  return null;
};

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <CatalogSyncBridge />
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
              <Route path="/" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><OhanaPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/ohana" element={<Navigate to="/" replace />} />
              <Route path="/chilli" element={<Navigate to="/" replace />} />
              <Route path="/bebidas" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><BeveragesPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/checkout" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><CheckoutPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/pago/resultado" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><PaymentResultPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/nosotros" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><AboutPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/contacto" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><ContactPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/pedidos" element={<ErrorBoundary><Suspense fallback={<PageFallback />}><Layout><OrdersPage /></Layout></Suspense></ErrorBoundary>} />
              <Route path="/carta" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Layout><NotFound /></Layout>} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
