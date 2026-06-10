-- Update image_url for 9 new product photos uploaded to storage bucket product-images
-- Skipped: 05_mazorcada_pollo.png (excluded per instructions)
-- Skipped duplicates: VEGGIE in Bowls sugeridos, VEGGIE in Hamburguesas, Chilli in Hamburguesas

UPDATE products SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/01_bowl_veggie.png'
WHERE id = '5af1e6c3-c1c0-0fad-e128-333ca3bd8400'; -- Arma tu Bowl Veggie (Arma tu Bowl)

UPDATE products SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/02_salchipapa_normal.png'
WHERE id = '1232c37b-9b66-78d2-43af-285c23ddcd7b'; -- Salchipapa (Papas y Salchipapas)

UPDATE products SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/03_salchipapa_chilli.png'
WHERE id = '9f0aade8-f57c-b4b5-fb79-20d18c28300a'; -- Chilli (Papas y Salchipapas)

UPDATE products SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/04_perro_americano.png'
WHERE id = '2422e354-e353-b8ca-626d-a97d577ca8cc'; -- Americano (Perros Calientes)

UPDATE products SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/06_mazorcada_costilla_barbacoa.png'
WHERE id = '5aa7e78f-c8fa-7fea-ed5e-336b33c84f60'; -- Mazorcada Costillas Barbacoa (Mazorcadas)

UPDATE products SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/07_combo_papas_bretana.png'
WHERE id = 'a6a7b74e-8cc4-6f8e-32ce-889b317fe54d'; -- Papas + Bretaña (Combos)

UPDATE products SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/08_combo_papas_cerveza.png'
WHERE id = '4191c0dd-132f-f886-3492-6bcbe585de6f'; -- Papas + Cerveza (Combos)

UPDATE products SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/09_combo_papas_hatsu.png'
WHERE id = '757dedc2-0103-e0b7-437d-d9c5a0a989f2'; -- Papas + Hatssu (Combos)

UPDATE products SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/10_combo_papas_soda_hatsu.png'
WHERE id = '7e822e94-6abd-9200-4f30-0ea75bce9ba2'; -- Papas + Soda Hatsu (Combos)
