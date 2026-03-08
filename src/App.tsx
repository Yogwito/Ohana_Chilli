import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { CartProvider } from "@/context/CartContext";
import { lazy, Suspense } from "react";
import Layout from "@/components/layout/Layout";
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
const AdminLoginPage = lazy(() => import("./pages/AdminLoginPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));

const queryClient = new QueryClient();

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
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* Admin routes without Layout */}
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={<AdminPage />} />

                {/* Public routes with Layout */}
                <Route path="/" element={<Layout><HomePage /></Layout>} />
                <Route path="/ohana" element={<Layout><OhanaPage /></Layout>} />
                <Route path="/chilli" element={<Layout><ChilliPage /></Layout>} />
                <Route path="/bebidas" element={<Layout><BeveragesPage /></Layout>} />
                <Route path="/checkout" element={<Layout><CheckoutPage /></Layout>} />
                <Route path="/nosotros" element={<Layout><AboutPage /></Layout>} />
                <Route path="/contacto" element={<Layout><ContactPage /></Layout>} />
                <Route path="/pedidos" element={<Layout><OrdersPage /></Layout>} />
                <Route path="*" element={<Layout><NotFound /></Layout>} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
