-- ═══════════════════════════════════════════════════════════════════════════
-- Variantes de producto (sabores), catálogo compartido de adicionales y
-- recomendaciones contextuales por categoría.
-- No destructiva: solo CREATE TABLE / INSERT / policies. No borra datos.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. product_variants ─────────────────────────────────────────────────────
-- Variante/sabor de un producto (Hatsu Tea Frutos Rojos, Soda Sandía…).
-- price_delta_cents queda para variantes con recargo futuro; hoy los sabores
-- no cambian el precio.
CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name text NOT NULL,
  price_delta_cents integer NOT NULL DEFAULT 0 CHECK (price_delta_cents >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Evita duplicados semánticos por mayúsculas/acentos/espacios
CREATE UNIQUE INDEX IF NOT EXISTS product_variants_product_name_key
  ON public.product_variants (product_id, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS product_variants_product_active_idx
  ON public.product_variants (product_id) WHERE is_active;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_read_active_variants ON public.product_variants
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY admin_all_variants ON public.product_variants
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = auth.uid() AND role = 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles
                      WHERE user_id = auth.uid() AND role = 'admin'::app_role));

-- ── 2. addons — catálogo compartido de adicionales ──────────────────────────
-- Fuente canónica de adicionales de comida (no bebidas). Los precios se
-- siembran desde los productos oficiales de la categoría chilli-adicionales.
CREATE TABLE IF NOT EXISTS public.addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS addons_name_key
  ON public.addons (lower(btrim(name)));

ALTER TABLE public.addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_read_active_addons ON public.addons
  FOR SELECT TO anon, authenticated USING (is_active = true);

CREATE POLICY admin_all_addons ON public.addons
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = auth.uid() AND role = 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles
                      WHERE user_id = auth.uid() AND role = 'admin'::app_role));

-- ── 3. addon_recommendations — priorización contextual por categoría ────────
-- No restringe el catálogo completo: solo ordena qué se sugiere primero.
CREATE TABLE IF NOT EXISTS public.addon_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id text NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  addon_id uuid NOT NULL REFERENCES public.addons(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (category_id, addon_id)
);

CREATE INDEX IF NOT EXISTS addon_recommendations_category_idx
  ON public.addon_recommendations (category_id);

ALTER TABLE public.addon_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY anon_read_addon_recommendations ON public.addon_recommendations
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY admin_all_addon_recommendations ON public.addon_recommendations
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = auth.uid() AND role = 'admin'::app_role))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles
                      WHERE user_id = auth.uid() AND role = 'admin'::app_role));

-- ── 4. Seeds ────────────────────────────────────────────────────────────────

-- 4a. Adicionales oficiales (precios de la categoría chilli-adicionales)
INSERT INTO public.addons (name, price_cents, sort_order) VALUES
  ('Tocineta',      4500, 1),
  ('Queso',         3500, 2),
  ('Queso frito',   6000, 3),
  ('Pepinillos',    3500, 4),
  ('Guacamole',     3500, 5),
  ('Papa francesa', 9000, 6)
ON CONFLICT DO NOTHING;

-- 4b. Sabores Hatsu Tea — producto activo "Hatsu (400 ml)"
INSERT INTO public.product_variants (product_id, name, sort_order)
SELECT p.id, v.name, v.sort_order
FROM public.products p,
  (VALUES
    ('Blanco — Mangostino', 1),
    ('Amarillo — Carambolo y flor de loto', 2),
    ('Verde — Yuzu y manzanilla', 3),
    ('Azul — Granada y mora azul', 4),
    ('Lila — Flor de cerezo', 5),
    ('Rosado claro — Pitahaya rosada de la India', 6),
    ('Rosas — Lychee', 7),
    ('Rojo — Frutos rojos', 8),
    ('Negro — Té negro con jugo de limón', 9)
  ) AS v(name, sort_order)
WHERE p.name = 'Hatsu (400 ml)' AND p.is_active
ON CONFLICT DO NOTHING;

-- 4c. Sabores Hatsu Soda — producto activo "Soda Hatsu (300 ml)"
INSERT INTO public.product_variants (product_id, name, sort_order)
SELECT p.id, v.name, v.sort_order
FROM public.products p,
  (VALUES
    ('Sandía y albahaca', 1),
    ('Frambuesa y rosas', 2),
    ('Limón y hierbabuena', 3),
    ('Uva blanca y romero', 4)
  ) AS v(name, sort_order)
WHERE p.name = 'Soda Hatsu (300 ml)' AND p.is_active
ON CONFLICT DO NOTHING;

-- 4d. Combos: el combo con Hatsu hereda los sabores del té, el de Soda los de
-- soda, y el de gaseosa elige entre las dos gaseosas activas existentes.
-- Cerveza queda SIN variantes (pendiente de negocio). Bretaña no tiene.
INSERT INTO public.product_variants (product_id, name, sort_order)
SELECT p.id, v.name, v.sort_order
FROM public.products p,
  (VALUES
    ('Blanco — Mangostino', 1),
    ('Amarillo — Carambolo y flor de loto', 2),
    ('Verde — Yuzu y manzanilla', 3),
    ('Azul — Granada y mora azul', 4),
    ('Lila — Flor de cerezo', 5),
    ('Rosado claro — Pitahaya rosada de la India', 6),
    ('Rosas — Lychee', 7),
    ('Rojo — Frutos rojos', 8),
    ('Negro — Té negro con jugo de limón', 9)
  ) AS v(name, sort_order)
WHERE p.name = 'Papas + Hatssu' AND p.is_active
ON CONFLICT DO NOTHING;

INSERT INTO public.product_variants (product_id, name, sort_order)
SELECT p.id, v.name, v.sort_order
FROM public.products p,
  (VALUES
    ('Sandía y albahaca', 1),
    ('Frambuesa y rosas', 2),
    ('Limón y hierbabuena', 3),
    ('Uva blanca y romero', 4)
  ) AS v(name, sort_order)
WHERE p.name = 'Papas + Soda Hatsu' AND p.is_active
ON CONFLICT DO NOTHING;

INSERT INTO public.product_variants (product_id, name, sort_order)
SELECT p.id, v.name, v.sort_order
FROM public.products p,
  (VALUES
    ('Cocacola original (250 ml)', 1),
    ('Cocacola Zero (250 ml)', 2)
  ) AS v(name, sort_order)
WHERE p.name = 'Papas + Gaseosa 250' AND p.is_active
ON CONFLICT DO NOTHING;

-- 4e. Recomendaciones contextuales (usa los adicionales oficiales existentes)
INSERT INTO public.addon_recommendations (category_id, addon_id, sort_order)
SELECT c.category_id, a.id, c.sort_order
FROM (VALUES
  -- Hamburguesas: tocineta, queso, queso frito, pepinillos, guacamole
  ('chilli-burgers', 'Tocineta', 1), ('chilli-burgers', 'Queso', 2),
  ('chilli-burgers', 'Queso frito', 3), ('chilli-burgers', 'Pepinillos', 4),
  ('chilli-burgers', 'Guacamole', 5),
  -- Perros: tocineta, queso, pepinillos, papa francesa
  ('chilli-hot-dogs', 'Tocineta', 1), ('chilli-hot-dogs', 'Queso', 2),
  ('chilli-hot-dogs', 'Pepinillos', 3), ('chilli-hot-dogs', 'Papa francesa', 4),
  -- Papas/Salchipapas: queso, tocineta, guacamole, queso frito
  ('chilli-fries-salchipapas', 'Queso', 1), ('chilli-fries-salchipapas', 'Tocineta', 2),
  ('chilli-fries-salchipapas', 'Guacamole', 3), ('chilli-fries-salchipapas', 'Queso frito', 4),
  -- Mazorcadas: queso, tocineta, guacamole, queso frito
  ('chilli-mazorcadas-corn-bowls', 'Queso', 1), ('chilli-mazorcadas-corn-bowls', 'Tocineta', 2),
  ('chilli-mazorcadas-corn-bowls', 'Guacamole', 3), ('chilli-mazorcadas-corn-bowls', 'Queso frito', 4),
  -- Nachos: queso, guacamole, tocineta
  ('chilli-nachos', 'Queso', 1), ('chilli-nachos', 'Guacamole', 2),
  ('chilli-nachos', 'Tocineta', 3),
  -- Bowls sugeridos: guacamole, queso frito
  ('ohana-bowls-sugeridos', 'Guacamole', 1), ('ohana-bowls-sugeridos', 'Queso frito', 2)
) AS c(category_id, addon_name, sort_order)
JOIN public.addons a ON lower(btrim(a.name)) = lower(btrim(c.addon_name))
WHERE EXISTS (SELECT 1 FROM public.categories cat WHERE cat.id = c.category_id)
ON CONFLICT DO NOTHING;
