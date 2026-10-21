import { lazy, Suspense, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Moon, ShoppingBag, Sun, Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/hooks/use-theme";
const CartDrawer = lazy(() => import("@/components/cart/CartDrawer"));
const links = [
  { href: "/#menu", label: "El menú" },
  { href: "/#arma-tu-bowl", label: "Crea tu bowl" },
  { href: "/nosotros", label: "Somos Ohana" },
  { href: "/contacto", label: "Encuéntranos" },
];

export default function Navbar() {
  const { getItemCount } = useCart();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const count = getItemCount();
  return (
    <>
      <header className="experience-nav">
        <nav className="experience-nav-inner" aria-label="Navegación principal">
          <Link
            to="/"
            className="experience-logo"
            aria-label="Ohana Bowls, inicio"
          >
            ohana<span>bowls & good vibes</span>
          </Link>
          <div className="experience-nav-links">
            {links.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                aria-current={
                  `${location.pathname}${location.hash}` === link.href
                    ? "page"
                    : undefined
                }
              >
                {link.label}
              </Link>
            ))}
          </div>
          <div className="experience-nav-actions">
            <button
              className="experience-icon-button"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Cambiar tema"
            >
              {theme === "dark" ? <Sun size={19} /> : <Moon size={19} />}
            </button>
            <button
              className="experience-cart-button"
              onClick={() => setCartOpen(true)}
              aria-label={`Abrir pedido, ${count} productos`}
            >
              <ShoppingBag size={18} />
              <span>Mi pedido</span>
              <b key={count}>{count}</b>
            </button>
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <button
                  className="experience-icon-button mobile-menu-trigger"
                  aria-label="Abrir navegación"
                >
                  <Menu size={22} />
                </button>
              </SheetTrigger>
              <SheetContent>
                <SheetTitle>Explora Ohana</SheetTitle>
                <SheetDescription>Encuentra tu próximo favorito.</SheetDescription>
                <nav className="experience-mobile-links">
                  {links.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      {link.label}
                      <span aria-hidden="true">↗</span>
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>
      <Suspense fallback={null}>
        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      </Suspense>
    </>
  );
}
