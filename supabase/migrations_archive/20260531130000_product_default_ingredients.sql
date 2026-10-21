CREATE TABLE product_default_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  is_removable BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON product_default_ingredients(product_id);

-- Ingredientes por defecto de hamburguesas y hot dog
INSERT INTO product_default_ingredients (product_id, ingredient_name, is_removable, sort_order) VALUES
-- Hamburguesa Americana
('c72fd0b3-1c12-c5c3-aa3e-e369f3114d4a', 'Lechuga', true, 1),
('c72fd0b3-1c12-c5c3-aa3e-e369f3114d4a', 'Tomate', true, 2),
('c72fd0b3-1c12-c5c3-aa3e-e369f3114d4a', 'Cebolla', true, 3),
('c72fd0b3-1c12-c5c3-aa3e-e369f3114d4a', 'Salsa especial', true, 4),
('c72fd0b3-1c12-c5c3-aa3e-e369f3114d4a', 'Queso', true, 5),
-- Hamburguesa Doble Chilli
('10f70e4e-febc-7e30-5b18-82247596262b', 'Lechuga', true, 1),
('10f70e4e-febc-7e30-5b18-82247596262b', 'Tomate', true, 2),
('10f70e4e-febc-7e30-5b18-82247596262b', 'Tocineta', true, 3),
('10f70e4e-febc-7e30-5b18-82247596262b', 'Queso', true, 4),
('10f70e4e-febc-7e30-5b18-82247596262b', 'Salsa chilli', true, 5),
-- Hamburguesa Chilli
('abf6980b-d497-990b-fc8b-20803dbddb4f', 'Lechuga', true, 1),
('abf6980b-d497-990b-fc8b-20803dbddb4f', 'Tomate', true, 2),
('abf6980b-d497-990b-fc8b-20803dbddb4f', 'Tocineta', true, 3),
('abf6980b-d497-990b-fc8b-20803dbddb4f', 'Queso', true, 4),
('abf6980b-d497-990b-fc8b-20803dbddb4f', 'Salsa chilli', true, 5),
-- Hot Dog Americano
('2422e354-e353-b8ca-626d-a97d577ca8cc', 'Mostaza', true, 1),
('2422e354-e353-b8ca-626d-a97d577ca8cc', 'Kétchup', true, 2),
('2422e354-e353-b8ca-626d-a97d577ca8cc', 'Cebolla', true, 3),
('2422e354-e353-b8ca-626d-a97d577ca8cc', 'Pepinillos', true, 4);
