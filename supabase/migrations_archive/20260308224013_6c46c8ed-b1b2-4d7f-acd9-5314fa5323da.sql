-- =============================================
-- Fix Ohana beverages to match official menus (Dec 2025)
-- =============================================

-- Delete all old placeholder beverages (ohana brand)
DELETE FROM products WHERE brand_id = 'ohana' AND category_id IN ('beverages-sodas', 'beverages-juices', 'beverages-water');

-- Remove placeholder beverage categories that don't match real menu
DELETE FROM categories WHERE id IN ('beverages-juices', 'beverages-water');

-- Rename beverages-sodas to be generic Ohana beverages
UPDATE categories SET name = 'Bebidas', slug = 'bebidas', icon = '🥤' WHERE id = 'beverages-sodas';

-- Insert real Ohana beverages from official menu
INSERT INTO products (id, brand_id, category_id, name, description, price_cents, is_active) VALUES
  ('ohana-bev-cocacola', 'ohana', 'beverages-sodas', 'Cocacola Original', 'Cocacola original.', 5000, true),
  ('ohana-bev-cocacola-zero', 'ohana', 'beverages-sodas', 'Cocacola Zero', 'Cocacola Zero.', 5000, true),
  ('ohana-bev-hatsu', 'ohana', 'beverages-sodas', 'Hatsu', 'Hatsu 400ml.', 8500, true),
  ('ohana-bev-agua-hatsu', 'ohana', 'beverages-sodas', 'Agua Hatsu', 'Agua Hatsu 300ml.', 5000, true),
  ('ohana-bev-soda-hatsu', 'ohana', 'beverages-sodas', 'Soda Hatsu', 'Soda Hatsu 300ml.', 7500, true),
  ('ohana-bev-cerveza-3cordilleras', 'ohana', 'beverages-sodas', 'Cerveza 3 Cordilleras Rosada', 'Cerveza 3 cordilleras rosada.', 9800, true),
  ('ohana-bev-cerveza-heineken', 'ohana', 'beverages-sodas', 'Cerveza Heineken', 'Cerveza Heineken.', 9800, true);