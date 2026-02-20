import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/context/CartContext";
import Layout from "@/components/layout/Layout";
import HomePage from "./pages/HomePage";
import OhanaPage from "./pages/OhanaPage";
import ChilliPage from "./pages/ChilliPage";
import BeveragesPage from "./pages/BeveragesPage";
import CheckoutPage from "./pages/CheckoutPage";
import AboutPage from "./pages/AboutPage";
import ContactPage from "./pages/ContactPage";
import OrdersPage from "./pages/OrdersPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/ohana" element={<OhanaPage />} />
              <Route path="/chilli" element={<ChilliPage />} />
              <Route path="/bebidas" element={<BeveragesPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/nosotros" element={<AboutPage />} />
              <Route path="/contacto" element={<ContactPage />} />
              <Route path="/pedidos" element={<OrdersPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
