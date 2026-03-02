-- PR1: Migrar carta real (Ohana + Chilli) desde PDFs de diciembre 2025.
-- Fuente: "Carta Ohana Dic 2025.pdf" y "Carta Chilli Dic 2025.pdf".

-- 1) Reemplazar categorias para alinear con la carta real
DELETE FROM public.categories
WHERE id NOT IN (
  'ohana-bowls-sugeridos',
  'ohana-arma-tu-bowl',
  'ohana-bebidas',
  'chilli-burgers',
  'chilli-fries-salchipapas',
  'chilli-hot-dogs',
  'chilli-mazorcadas-corn-bowls',
  'chilli-nachos',
  'chilli-combos',
  'chilli-bebidas-cafe',
  'chilli-adicionales'
);

INSERT INTO public.categories (id, brand_id, name, slug, icon) VALUES
  ('ohana-bowls-sugeridos', 'ohana', 'Bowls sugeridos', 'bowls-sugeridos', '🥗'),
  ('ohana-arma-tu-bowl', 'ohana', 'Arma tu Bowl', 'arma-tu-bowl', '✨'),
  ('ohana-bebidas', 'ohana', 'Bebidas', 'bebidas', '🥤'),
  ('chilli-burgers', 'chilli', 'Burgers', 'burgers', '🍔'),
  ('chilli-fries-salchipapas', 'chilli', 'Fries / Salchipapas', 'fries-salchipapas', '🍟'),
  ('chilli-hot-dogs', 'chilli', 'Hot Dogs', 'hot-dogs', '🌭'),
  ('chilli-mazorcadas-corn-bowls', 'chilli', 'Mazorcadas / Corn bowls', 'mazorcadas-corn-bowls', '🌽'),
  ('chilli-nachos', 'chilli', 'Nachos', 'nachos', '🧀'),
  ('chilli-combos', 'chilli', 'Combos', 'combos', '🥡'),
  ('chilli-bebidas-cafe', 'chilli', 'Bebidas / Café', 'bebidas-cafe', '☕'),
  ('chilli-adicionales', 'chilli', 'Adicionales', 'adicionales', '➕')
ON CONFLICT (id) DO UPDATE
SET brand_id = EXCLUDED.brand_id,
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    icon = EXCLUDED.icon;

-- 2) Desactivar catalogo actual y sembrar catalogo real (upsert por id)
UPDATE public.products SET is_active = false;

INSERT INTO public.products (
  id, brand_id, category_id, name, description, price_cents, is_active, image_url
) VALUES
  -- OHANA: Bowls sugeridos
  ('ohana-bowl-teriyaki', 'ohana', 'ohana-bowls-sugeridos', 'TERIYAKI', 'Arroz al Wok, Pollo agridulce, Zucchini, pimentón agridulce, piña asada, cebolla caramelizada, Choclitos triturados, ajonjolí, pimienta negra, salsa BBQ Honey', 26900, true, null),
  ('ohana-bowl-paisa', 'ohana', 'ohana-bowls-sugeridos', 'PAISA', 'Arroz, frijoles, res molida, chicharrón, pico de gallo, guacamole, maduritos, crema agria, maicitos, doritos triturados, páprika, salsa Chimichurri', 27900, true, null),
  ('ohana-bowl-chicago', 'ohana', 'ohana-bowls-sugeridos', 'CHICAGO', 'Arroz, frijoles, pollo agridulce, pollo al Panko, tomate, pimentón agridulce, queso rallado, crutones de pan, páprika, ajonjolí, salsa BBQ Honey', 27900, true, null),
  ('ohana-bowl-pulled-pork', 'ohana', 'ohana-bowls-sugeridos', 'PULLEDPORK', 'Arroz, cerdo a la naranja, guacamole, tomate, maicitos, piña asada, páprika, maní, siracha mayo', 26900, true, null),
  ('ohana-bowl-veggie', 'ohana', 'ohana-bowls-sugeridos', 'VEGGIE', 'Arma tu Bowl Veggie!!! 1 Proteína Veggie, 1 Base, 6 Acompañantes, 2 Salsas, 2 Complementos', 23900, true, null),

  -- OHANA: Arma tu Bowl
  ('ohana-arma-bowl-pequeno', 'ohana', 'ohana-arma-tu-bowl', 'Arma tu Bowl Pequeño', '1 base + 1 proteína + 4 acompañantes + 1 salsa + 1 complemento', 23900, true, null),
  ('ohana-arma-bowl-mediano', 'ohana', 'ohana-arma-tu-bowl', 'Arma tu Bowl Mediano', '1 base + 2 proteínas + 5 acompañantes + 2 salsas + 2 complementos', 27900, true, null),
  ('ohana-arma-bowl-grande', 'ohana', 'ohana-arma-tu-bowl', 'Arma tu Bowl Grande', '1 base + 3 proteínas (150gr) + 6 acompañantes + 3 salsas + 3 complementos', 32900, true, null),
  ('ohana-arma-bowl-veggie', 'ohana', 'ohana-arma-tu-bowl', 'Arma tu Bowl Veggie', '1 proteína veggie + 1 base + 6 acompañantes + 2 salsas + 2 complementos', 23900, true, null),

  -- OHANA: Bebidas
  ('ohana-beb-cocacola-original-250', 'ohana', 'ohana-bebidas', 'Cocacola original (250 ml)', '', 5000, true, null),
  ('ohana-beb-cocacola-zero-250', 'ohana', 'ohana-bebidas', 'Cocacola Zero (250 ml)', '', 5000, true, null),
  ('ohana-beb-hatsu-400', 'ohana', 'ohana-bebidas', 'Hatsu (400 ml)', '', 8500, true, null),
  ('ohana-beb-agua-hatsu-300', 'ohana', 'ohana-bebidas', 'Agua Hatsu (300 ml)', '', 5000, true, null),
  ('ohana-beb-bretana-300', 'ohana', 'ohana-bebidas', 'Bretaña (300 ml)', '', 5000, true, null),
  ('ohana-beb-soda-hatsu-300', 'ohana', 'ohana-bebidas', 'Soda Hatsu (300 ml)', '', 7500, true, null),
  ('ohana-beb-cerveza-3-cordilleras-300', 'ohana', 'ohana-bebidas', 'Cerveza 3 cordilleras rosada (300 ml)', '', 9800, true, null),
  ('ohana-beb-cerveza-heineken', 'ohana', 'ohana-bebidas', 'Cerveza Heineken', '', 9800, true, null),

  -- CHILLI: Burgers
  ('chilli-burger-chilli', 'chilli', 'chilli-burgers', 'Chilli', '100% carne de res premium, tocineta en pan brioche con queso, tomate, lechuga y sala de la casa', 24900, true, null),
  ('chilli-burger-kentucky', 'chilli', 'chilli-burgers', 'Kentucky', '100% carne de res premium en pan brioche con queso frito, tocineta, lechuga, tomate, cebolla caramelizada y salsa de queso cheddar', 29600, true, null),
  ('chilli-burger-doble-chilli', 'chilli', 'chilli-burgers', 'Doble Chilli', 'Doble porción de carne de res premium y tocineta en pan brioche con queso, tomate, lechuga y sala de la casa', 32900, true, null),
  ('chilli-burger-veggie', 'chilli', 'chilli-burgers', 'VEGGIE', 'Croqueta de lenteja en pan brioche, queso, lechuga, tomate con salsa chilli y salsa de piña', 23900, true, null),
  ('chilli-burger-americana', 'chilli', 'chilli-burgers', 'Americana', '100% carne de res premium y extra tocineta en pan brioche con queso, salsa de queso cheddar y papa crujiente', 26900, true, null),
  ('chilli-burger-chicago', 'chilli', 'chilli-burgers', 'Chicago', '100% carne de res premium en pan brioche, queso americano, cebolla caramelizada, pepinillos agridulces, tocineta, tomate, lechuga, salsa siracha mayo', 26900, true, null),

  -- CHILLI: Fries / Salchipapas
  ('chilli-fries-chilli', 'chilli', 'chilli-fries-salchipapas', 'Chilli', 'Papas a la francesa con carne de res molida tipo barbacoa, tocineta, salsa de queso cheddar y salsa chilli', 26900, true, null),
  ('chilli-fries-salchipapa', 'chilli', 'chilli-fries-salchipapas', 'Salchipapa', 'Papas a la francesa, salchicha americana con tocineta y salsa de queso cheddar', 28900, true, null),
  ('chilli-fries-deluxe', 'chilli', 'chilli-fries-salchipapas', 'Deluxe', 'Papa a la francesa, queso cheddar, pico de gallo, pollo apanado al estilo americano, tocineta, bbq honey', 28900, true, null),
  ('chilli-fries-pulled-pork', 'chilli', 'chilli-fries-salchipapas', 'Pulled Pork', 'Papas a la francesa con carne pulled pork, tocineta, salsa de queso cheddar, guacamole y crema agria', 28900, true, null),

  -- CHILLI: Hot Dogs
  ('chilli-hotdog-americano', 'chilli', 'chilli-hot-dogs', 'Americano', 'Salchicha Super Americana, queso, tocineta, papa crujiente, y salsa chilli', 12800, true, null),
  ('chilli-hotdog-chilli', 'chilli', 'chilli-hot-dogs', 'Chilli', 'Salchicha Super Americana, carne de res molida premium tipo barbacoa, papa crujiente, miel mostaza chilli y salsa cheddar', 14900, true, null),

  -- CHILLI: Adicionales
  ('chilli-adicional-tocineta', 'chilli', 'chilli-adicionales', 'Tocineta', '', 4500, true, null),
  ('chilli-adicional-queso', 'chilli', 'chilli-adicionales', 'Queso', '', 3500, true, null),
  ('chilli-adicional-queso-frito', 'chilli', 'chilli-adicionales', 'Queso Frito', '', 6000, true, null),
  ('chilli-adicional-pepinillos', 'chilli', 'chilli-adicionales', 'Pepinillos', '', 3500, true, null),
  ('chilli-adicional-guacamole', 'chilli', 'chilli-adicionales', 'Guacamole', '', 3500, true, null),
  ('chilli-adicional-papa-francesa', 'chilli', 'chilli-adicionales', 'Papa Francesa', '', 9000, true, null),

  -- CHILLI: Mazorcadas / Corn bowls
  ('chilli-corn-polllo-chimichurri', 'chilli', 'chilli-mazorcadas-corn-bowls', 'Mazorcada Pollo con Chimichurri', 'Mazorca desgranada, lechuga, pollo bañado en chimichurri, tocineta, queso mozzarella, salsa de la casa', 27900, true, null),
  ('chilli-corn-costillas-barbacoa', 'chilli', 'chilli-mazorcadas-corn-bowls', 'Mazorcada Costillas Barbacoa', 'Mazorca desgranada, lechuga, costilla desmechada en salsa barbacoa, tocineta, queso, guacamole, crema agria, salsa de la casa', 27900, true, null),
  ('chilli-corn-mixta', 'chilli', 'chilli-mazorcadas-corn-bowls', 'Mazorcada Mixta', 'Mazorca desgranada, lechuga, pollo apanado, carne de hamburguesa, tocineta, queso y salsa de la casa', 29900, true, null),

  -- CHILLI: Nachos
  ('chilli-nachos-para-compartir', 'chilli', 'chilli-nachos', 'Nachos para compartir', 'Nachos, res molida, cerdo a la naranja, frijol negro, pico de gallo, queso rallado, guacamole, sour cream', 32000, true, null),

  -- CHILLI: Combos
  ('chilli-combo-papas-gaseosa-250', 'chilli', 'chilli-combos', 'Papas + Gaseosa 250', '', 10600, true, null),
  ('chilli-combo-papas-bretana', 'chilli', 'chilli-combos', 'Papas + Bretaña', '', 10600, true, null),
  ('chilli-combo-papas-soda-hatsu', 'chilli', 'chilli-combos', 'Papas + Soda Hatsu', '', 12900, true, null),
  ('chilli-combo-papas-hatssu', 'chilli', 'chilli-combos', 'Papas + Hatssu', '', 14900, true, null),
  ('chilli-combo-papas-cerveza', 'chilli', 'chilli-combos', 'Papas + Cerveza', '', 15900, true, null),

  -- CHILLI: Bebidas / Café
  ('chilli-beb-cocacola-original-250', 'chilli', 'chilli-bebidas-cafe', 'Cocacola original (250 ml)', '', 5000, true, null),
  ('chilli-beb-cocacola-zero-250', 'chilli', 'chilli-bebidas-cafe', 'Cocacola Zero (250 ml)', '', 5000, true, null),
  ('chilli-beb-hatsu-400', 'chilli', 'chilli-bebidas-cafe', 'Hatsu (400 ml)', '', 8500, true, null),
  ('chilli-beb-soda-hatsu-300', 'chilli', 'chilli-bebidas-cafe', 'Soda Hatsu (300 ml)', '', 7500, true, null),
  ('chilli-beb-agua-hatsu-300', 'chilli', 'chilli-bebidas-cafe', 'Agua Hatsu (300 ml)', '', 5000, true, null),
  ('chilli-beb-bretana-300', 'chilli', 'chilli-bebidas-cafe', 'Bretaña (300 ml)', '', 5000, true, null),
  ('chilli-beb-cerveza-3-cordilleras-300', 'chilli', 'chilli-bebidas-cafe', 'Cerveza 3 cordilleras rosada (300 ml)', '', 9800, true, null),
  ('chilli-beb-cerveza-heineken', 'chilli', 'chilli-bebidas-cafe', 'Cerveza Heineken', '', 9800, true, null),
  ('chilli-cafe-americano', 'chilli', 'chilli-bebidas-cafe', 'Café Americano', '', 4000, true, null),
  ('chilli-cafe-expresso', 'chilli', 'chilli-bebidas-cafe', 'Café Expresso', '', 4500, true, null),
  ('chilli-cafe-aromatica', 'chilli', 'chilli-bebidas-cafe', 'Café Aromática', '', 4000, true, null)
ON CONFLICT (id) DO UPDATE
SET brand_id = EXCLUDED.brand_id,
    category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_cents = EXCLUDED.price_cents,
    is_active = EXCLUDED.is_active,
    image_url = EXCLUDED.image_url;

-- Eliminar productos legacy que no quedaron en la carta real
DELETE FROM public.products
WHERE id NOT IN (
  'ohana-bowl-teriyaki',
  'ohana-bowl-paisa',
  'ohana-bowl-chicago',
  'ohana-bowl-pulled-pork',
  'ohana-bowl-veggie',
  'ohana-arma-bowl-pequeno',
  'ohana-arma-bowl-mediano',
  'ohana-arma-bowl-grande',
  'ohana-arma-bowl-veggie',
  'ohana-beb-cocacola-original-250',
  'ohana-beb-cocacola-zero-250',
  'ohana-beb-hatsu-400',
  'ohana-beb-agua-hatsu-300',
  'ohana-beb-bretana-300',
  'ohana-beb-soda-hatsu-300',
  'ohana-beb-cerveza-3-cordilleras-300',
  'ohana-beb-cerveza-heineken',
  'chilli-burger-chilli',
  'chilli-burger-kentucky',
  'chilli-burger-doble-chilli',
  'chilli-burger-veggie',
  'chilli-burger-americana',
  'chilli-burger-chicago',
  'chilli-fries-chilli',
  'chilli-fries-salchipapa',
  'chilli-fries-deluxe',
  'chilli-fries-pulled-pork',
  'chilli-hotdog-americano',
  'chilli-hotdog-chilli',
  'chilli-adicional-tocineta',
  'chilli-adicional-queso',
  'chilli-adicional-queso-frito',
  'chilli-adicional-pepinillos',
  'chilli-adicional-guacamole',
  'chilli-adicional-papa-francesa',
  'chilli-corn-polllo-chimichurri',
  'chilli-corn-costillas-barbacoa',
  'chilli-corn-mixta',
  'chilli-nachos-para-compartir',
  'chilli-combo-papas-gaseosa-250',
  'chilli-combo-papas-bretana',
  'chilli-combo-papas-soda-hatsu',
  'chilli-combo-papas-hatssu',
  'chilli-combo-papas-cerveza',
  'chilli-beb-cocacola-original-250',
  'chilli-beb-cocacola-zero-250',
  'chilli-beb-hatsu-400',
  'chilli-beb-soda-hatsu-300',
  'chilli-beb-agua-hatsu-300',
  'chilli-beb-bretana-300',
  'chilli-beb-cerveza-3-cordilleras-300',
  'chilli-beb-cerveza-heineken',
  'chilli-cafe-americano',
  'chilli-cafe-expresso',
  'chilli-cafe-aromatica'
);

-- 3) Reglas Arma tu Bowl (Ohana) segun carta
INSERT INTO public.bowl_rules (size, name, price_cents, bases, proteins, accompaniments) VALUES
  ('small', 'Pequeño', 23900, 1, 1, 4),
  ('medium', 'Mediano', 27900, 1, 2, 5),
  ('large', 'Grande', 32900, 1, 3, 6)
ON CONFLICT (size) DO UPDATE
SET name = EXCLUDED.name,
    price_cents = EXCLUDED.price_cents,
    bases = EXCLUDED.bases,
    proteins = EXCLUDED.proteins,
    accompaniments = EXCLUDED.accompaniments;

-- 4) Validaciones de integridad de catalogo
DO $$
DECLARE
  _missing_categories int;
  _zero_prices int;
  _duplicates int;
BEGIN
  -- (a) cada categoria principal debe tener al menos 1 producto activo
  SELECT COUNT(*) INTO _missing_categories
  FROM (
    SELECT c.id
    FROM public.categories c
    WHERE c.id IN (
      'ohana-bowls-sugeridos',
      'ohana-arma-tu-bowl',
      'ohana-bebidas',
      'chilli-burgers',
      'chilli-fries-salchipapas',
      'chilli-hot-dogs',
      'chilli-mazorcadas-corn-bowls',
      'chilli-nachos',
      'chilli-combos',
      'chilli-bebidas-cafe'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.products p
      WHERE p.category_id = c.id
        AND p.is_active = true
    )
  ) missing;

  IF _missing_categories > 0 THEN
    RAISE EXCEPTION 'Catalog validation failed: hay categorias principales sin productos';
  END IF;

  -- (b) ningun price_cents en 0 para productos activos
  SELECT COUNT(*) INTO _zero_prices
  FROM public.products
  WHERE is_active = true
    AND price_cents = 0;

  IF _zero_prices > 0 THEN
    RAISE EXCEPTION 'Catalog validation failed: hay productos activos con price_cents = 0';
  END IF;

  -- (c) no duplicados por nombre dentro de misma marca/categoria
  SELECT COUNT(*) INTO _duplicates
  FROM (
    SELECT brand_id, category_id, lower(name), COUNT(*)
    FROM public.products
    WHERE is_active = true
    GROUP BY brand_id, category_id, lower(name)
    HAVING COUNT(*) > 1
  ) dup;

  IF _duplicates > 0 THEN
    RAISE EXCEPTION 'Catalog validation failed: hay productos duplicados por (brand_id, category_id, name)';
  END IF;
END $$;
