-- Update image_url for VEGGIE bowl in Bowls Sugeridos category
-- Replaces Unsplash placeholder with real product photo uploaded to Supabase Storage
-- File: Veggie Bowl.png in product-images bucket

UPDATE products
SET image_url = 'https://naoqsypqqgjhdudenevx.supabase.co/storage/v1/object/public/product-images/Veggie%20Bowl.png'
WHERE id = 'edfc2bdb-d986-d364-5080-a7868f942bf4'
  AND category_id = 'ohana-bowls-sugeridos';
