-- Desactivar Bowl Chicago (2 registros duplicados)
UPDATE products SET is_active = false WHERE id IN (
  '5c7ee4f9-97bb-f4d4-9e06-c621b3b87949',
  'b8764c9a-2109-1555-ca90-1041c1d29a0b'
);

-- Desactivar Papas Deluxe
UPDATE products SET is_active = false WHERE id = 'fbf39647-4809-d851-cfba-fe2eefbca89e';

-- Desactivar Hamburguesa Kentucky
UPDATE products SET is_active = false WHERE id = 'e33a0457-3490-2742-b7a6-bca937ed71a0';

-- Desactivar Mazorcada Pollo con Chimichurri
UPDATE products SET is_active = false WHERE id = '129cdb9a-d6e6-a26a-0058-1fc5b602d0d9';

-- Desactivar Cafés, Aromática y Expresso
UPDATE products SET is_active = false WHERE id IN (
  '24d4e6d5-fc63-615f-30dd-36a116970a82',
  'fb1b7ccc-14a0-0d75-1348-3787950672d0',
  '30a888f7-5129-c4e1-7196-b70fd376b9bf'
);

-- Desactivar Coca-Cola duplicadas
UPDATE products SET is_active = false WHERE id IN (
  'aca4692d-4c94-0982-0b90-4a8e4598be8c',
  '274af8e4-97ca-da03-e1d0-e953934b79e5'
);

-- Desactivar Chilli residual sin imagen (burger del rebrand)
UPDATE products SET is_active = false WHERE id = '7b30fcd1-3614-a851-de5d-41f88318070f';

-- Hamburguesa Americana (imagen propia subida a Storage)
UPDATE products SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/Hamburguesa-Americana-nueva.jpg'
WHERE id = 'c72fd0b3-1c12-c5c3-aa3e-e369f3114d4a';

-- Hamburguesa Doble Chilli (imagen propia subida a Storage)
UPDATE products SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/Hamburguesa-Doble.jpg'
WHERE id = '10f70e4e-febc-7e30-5b18-82247596262b';

-- Hamburguesa Chilli (imagen propia subida a Storage)
UPDATE products SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/Hamburguesa-Chilli-nueva.jpg'
WHERE id = 'abf6980b-d497-990b-fc8b-20803dbddb4f';

-- Nachos para compartir (imagen propia subida a Storage)
UPDATE products SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/Nachos-nueva.jpg'
WHERE id = 'cc24c60a-0a37-c3cf-83fc-5457548e8e88';

-- TERIYAKI Bowl (placeholder Unsplash)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80'
WHERE id = 'be1fa199-5029-433f-7ccf-8fce38116665';

-- Salchipapa (placeholder Unsplash)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1630431341973-02e1b662ec35?w=400&q=80'
WHERE id = '1232c37b-9b66-78d2-43af-285c23ddcd7b';

-- Hamburguesa VEGGIE x2 (placeholder Unsplash)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1520072959219-c595dc870360?w=400&q=80'
WHERE id IN ('446beb63-71b7-7242-3797-db75472451d9', 'edfc2bdb-d986-d364-5080-a7868f942bf4');

-- Hot Dog Americano (placeholder Unsplash)
UPDATE products SET image_url = 'https://images.unsplash.com/photo-1612392062631-94c89a1a8067?w=400&q=80'
WHERE id = '2422e354-e353-b8ca-626d-a97d577ca8cc';
