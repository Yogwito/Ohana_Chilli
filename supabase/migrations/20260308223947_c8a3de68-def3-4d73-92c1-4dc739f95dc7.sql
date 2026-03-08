-- =============================================
-- Replace all Chilli products with official menu (Dec 2025)
-- =============================================

-- Add missing Chilli categories
INSERT INTO categories (id, brand_id, name, slug, icon) VALUES
  ('chilli-salchipapas', 'chilli', 'Salchipapas', 'salchipapas', '🍟'),
  ('chilli-corn-bowls', 'chilli', 'Corn Bowls', 'corn-bowls', '🌽'),
  ('chilli-compartir', 'chilli', 'Para Compartir', 'compartir', '🍽️'),
  ('chilli-combos', 'chilli', 'Combos', 'combos', '🎉'),
  ('chilli-cafe', 'chilli', 'Café', 'cafe', '☕'),
  ('chilli-bebidas', 'chilli', 'Bebidas', 'bebidas', '🥤'),
  ('chilli-adicionales', 'chilli', 'Adicionales', 'adicionales', '➕')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, icon = EXCLUDED.icon;

-- Delete ALL old placeholder Chilli products
DELETE FROM products WHERE brand_id = 'chilli';

-- Remove old Chilli categories that no longer apply
DELETE FROM categories WHERE id IN ('chilli-hotdogs', 'chilli-fries', 'chilli-nachos', 'chilli-mazorcadas');

-- Insert real Chilli Burgers from official menu
INSERT INTO products (id, brand_id, category_id, name, description, price_cents, is_active) VALUES
  ('chilli-burger-chilli', 'chilli', 'chilli-burgers', 'Chilli', '100% carne de res premium en pan brioche con queso, lechuga, tomate y salsa de la casa.', 24900, true),
  ('chilli-burger-doble', 'chilli', 'chilli-burgers', 'Doble Chilli', 'Doble porción de carne de res premium y tocineta en pan brioche con queso, tomate, lechuga y salsa de la casa.', 32900, true),
  ('chilli-burger-americana', 'chilli', 'chilli-burgers', 'Americana', '100% carne de res premium y extra tocineta en pan brioche con queso, salsa de queso cheddar y papa crujiente.', 26900, true),
  ('chilli-burger-chicago', 'chilli', 'chilli-burgers', 'Chicago', '100% carne de res premium en pan brioche, queso americano, cebolla caramelizada, pepinillos agridulces, tocineta, tomate, lechuga, salsa siracha mayo.', 26900, true),
  ('chilli-burger-kentucky', 'chilli', 'chilli-burgers', 'Kentucky', '100% carne de res premium en pan brioche con queso frito, tocineta, lechuga, tomate, cebolla caramelizada y salsa de queso cheddar.', 29600, true),
  ('chilli-burger-veggie', 'chilli', 'chilli-burgers', 'Veggie', 'Croqueta de lenteja en pan brioche, queso, lechuga, tomate con salsa chilli y salsa de piña.', 23900, true);

-- Salchipapas / loaded fries
INSERT INTO products (id, brand_id, category_id, name, description, price_cents, is_active) VALUES
  ('chilli-salchipapa', 'chilli', 'chilli-salchipapas', 'Salchipapa', 'Papas a la francesa, salchicha americana con tocineta y salsa de queso cheddar.', 28900, true),
  ('chilli-deluxe', 'chilli', 'chilli-salchipapas', 'Deluxe', 'Papa a la francesa, queso cheddar, pico de gallo, pollo apanado al estilo americano, tocineta, bbq.', 28900, true),
  ('chilli-pulled-pork', 'chilli', 'chilli-salchipapas', 'Pulled Pork', 'Papas a la francesa con carne pulled pork, tocineta, salsa de queso cheddar, guacamole y crema agria.', 28900, true);

-- Corn Bowls (Mazorcadas)
INSERT INTO products (id, brand_id, category_id, name, description, price_cents, is_active) VALUES
  ('chilli-mazorcada-pollo', 'chilli', 'chilli-corn-bowls', 'Mazorcada Pollo', 'Mazorca desgranada, lechuga, pollo bañado en chimichurri, tocineta, queso mozzarella, salsa de la casa.', 27900, true),
  ('chilli-mazorcada-costillas', 'chilli', 'chilli-corn-bowls', 'Mazorcada Costillas Barbacoa', 'Mazorca desgranada, lechuga, costilla desmechada en salsa barbacoa, tocineta, queso, guacamole, crema agria, salsa de la casa.', 27900, true),
  ('chilli-mazorcada-mixta', 'chilli', 'chilli-corn-bowls', 'Mazorcada Mixta', 'Mazorca desgranada, lechuga, pollo apanado, carne de hamburguesa, tocineta, queso y salsa de la casa.', 29900, true);

-- Para Compartir
INSERT INTO products (id, brand_id, category_id, name, description, price_cents, is_active) VALUES
  ('chilli-nachos', 'chilli', 'chilli-compartir', 'Nachos', 'Nachos, res molida, cerdo a la naranja, frijol negro, pico de gallo, queso rallado, guacamole, sour cream.', 32000, true);

-- Combos
INSERT INTO products (id, brand_id, category_id, name, description, price_cents, is_active) VALUES
  ('chilli-combo-gaseosa', 'chilli', 'chilli-combos', 'Papas + Gaseosa 250', 'Papas a la francesa + gaseosa 250ml.', 10600, true),
  ('chilli-combo-bretana', 'chilli', 'chilli-combos', 'Papas + Bretaña', 'Papas a la francesa + Bretaña 300ml.', 10600, true),
  ('chilli-combo-soda-hatsu', 'chilli', 'chilli-combos', 'Papas + Soda Hatsu', 'Papas a la francesa + Soda Hatsu 300ml.', 12900, true),
  ('chilli-combo-hatsu', 'chilli', 'chilli-combos', 'Papas + Hatsu', 'Papas a la francesa + Hatsu 400ml.', 14900, true),
  ('chilli-combo-cerveza', 'chilli', 'chilli-combos', 'Papas + Cerveza', 'Papas a la francesa + cerveza.', 15900, true);

-- Chilli Bebidas
INSERT INTO products (id, brand_id, category_id, name, description, price_cents, is_active) VALUES
  ('chilli-bev-cocacola', 'chilli', 'chilli-bebidas', 'Cocacola Original', 'Cocacola original 250ml.', 5000, true),
  ('chilli-bev-cocacola-zero', 'chilli', 'chilli-bebidas', 'Cocacola Zero', 'Cocacola Zero 250ml.', 5000, true),
  ('chilli-bev-hatsu', 'chilli', 'chilli-bebidas', 'Hatsu', 'Hatsu 400ml.', 8500, true),
  ('chilli-bev-soda-hatsu', 'chilli', 'chilli-bebidas', 'Soda Hatsu', 'Soda Hatsu 300ml.', 7500, true),
  ('chilli-bev-agua-hatsu', 'chilli', 'chilli-bebidas', 'Agua Hatsu', 'Agua Hatsu 300ml.', 5000, true),
  ('chilli-bev-bretana', 'chilli', 'chilli-bebidas', 'Bretaña', 'Bretaña 300ml.', 5000, true),
  ('chilli-bev-cerveza-3cordilleras', 'chilli', 'chilli-bebidas', 'Cerveza 3 Cordilleras Rosada', 'Cerveza 3 cordilleras rosada 300ml.', 9800, true),
  ('chilli-bev-cerveza-heineken', 'chilli', 'chilli-bebidas', 'Cerveza Heineken', 'Cerveza Heineken 300ml.', 9800, true);

-- Café
INSERT INTO products (id, brand_id, category_id, name, description, price_cents, is_active) VALUES
  ('chilli-cafe-americano', 'chilli', 'chilli-cafe', 'Americano', 'Café americano.', 4000, true),
  ('chilli-cafe-expresso', 'chilli', 'chilli-cafe', 'Expresso', 'Café expresso.', 4500, true),
  ('chilli-cafe-aromatica', 'chilli', 'chilli-cafe', 'Aromática', 'Aromática caliente.', 4000, true);

-- Adicionales (burger toppings)
INSERT INTO products (id, brand_id, category_id, name, description, price_cents, is_active) VALUES
  ('chilli-add-tocineta', 'chilli', 'chilli-adicionales', 'Tocineta', 'Porción adicional de tocineta.', 4500, true),
  ('chilli-add-queso', 'chilli', 'chilli-adicionales', 'Queso', 'Porción adicional de queso.', 3500, true),
  ('chilli-add-queso-frito', 'chilli', 'chilli-adicionales', 'Queso Frito', 'Porción adicional de queso frito.', 6000, true),
  ('chilli-add-pepinillos', 'chilli', 'chilli-adicionales', 'Pepinillos', 'Porción adicional de pepinillos.', 3500, true);