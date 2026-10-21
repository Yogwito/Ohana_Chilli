-- =============================================
-- Replace bowl ingredients with official Ohana menu (Dec 2025)
-- =============================================

-- Deactivate all old placeholder ingredients
UPDATE ingredients SET is_active = false;

-- Delete old ingredients and insert real ones from official menu
DELETE FROM ingredients;

-- BASES (from PDF: the bowl base options)
INSERT INTO ingredients (id, name, type, price_cents, is_vegan, is_gluten_free, is_active) VALUES
  ('base-arroz', 'Arroz', 'base', 0, false, true, true),
  ('base-frijol', 'Frijol', 'base', 0, true, true, true),
  ('base-lechuga', 'Lechuga', 'base', 0, true, true, true);

-- PROTEINS (from PDF)
INSERT INTO ingredients (id, name, type, price_cents, is_vegan, is_gluten_free, is_active) VALUES
  ('prot-res-molida', 'Res Molida', 'protein', 0, false, true, true),
  ('prot-cerdo-naranja', 'Cerdo a la Naranja', 'protein', 0, false, true, true),
  ('prot-chicharron', 'Chicharrón', 'protein', 0, false, false, true),
  ('prot-pollo-agridulce', 'Pollo Agridulce', 'protein', 0, false, true, true),
  ('prot-pollo-panko', 'Pollo al Panko', 'protein', 0, false, false, true),
  ('prot-pollo-chimichurri', 'Pollo con Chimichurri', 'protein', 0, false, true, true);

-- Extra protein surcharge noted in menu: +$5,000
-- This is handled by the bowl builder logic, not ingredient price

-- ACOMPAÑANTES (from PDF)
INSERT INTO ingredients (id, name, type, price_cents, is_vegan, is_gluten_free, is_active) VALUES
  ('acc-pina-asada', 'Piña Asada', 'acompanante', 0, true, true, true),
  ('acc-zucchini', 'Zucchini', 'acompanante', 0, true, true, true),
  ('acc-maicitos', 'Maicitos', 'acompanante', 0, true, true, true),
  ('acc-tomate', 'Tomate', 'acompanante', 0, true, true, true),
  ('acc-cebolla-encurtida', 'Cebolla Encurtida', 'acompanante', 0, true, true, true),
  ('acc-pimenton-agridulce', 'Pimentón Agridulce', 'acompanante', 0, true, true, true),
  ('acc-garbanzos', 'Garbanzos Horneados', 'acompanante', 0, true, true, true),
  ('acc-cebolla-caramelizada', 'Cebolla Caramelizada', 'acompanante', 0, true, true, true),
  ('acc-maduritos', 'Maduritos', 'acompanante', 0, true, true, true);

-- SAUCES (from PDF)
INSERT INTO ingredients (id, name, type, price_cents, is_vegan, is_gluten_free, is_active) VALUES
  ('sauce-bbq-honey', 'BBQ Honey', 'sauce', 0, false, true, true),
  ('sauce-buffalo', 'Buffalo', 'sauce', 0, false, true, true),
  ('sauce-mayo-cilantro', 'Mayo Cilantro', 'sauce', 0, false, true, true),
  ('sauce-ohana-chipotle', 'Ohana Chipotle', 'sauce', 0, false, true, true),
  ('sauce-salsa-ajo', 'Salsa de Ajo', 'sauce', 0, true, true, true),
  ('sauce-chimichurri', 'Chimichurri', 'sauce', 0, true, true, true),
  ('sauce-crema-agria', 'Crema Agria', 'sauce', 0, false, true, true),
  ('sauce-cebolla-dulce', 'Cebolla Dulce', 'sauce', 0, true, true, true);