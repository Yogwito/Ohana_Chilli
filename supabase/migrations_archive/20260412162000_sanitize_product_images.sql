-- Normalize product image mappings so the public app never renders stale legacy filenames
-- and the known incorrect veggie burger mapping is removed until a correct image is uploaded.

UPDATE public.products
SET image_url = NULLIF(trim(image_url), '')
WHERE image_url IS NOT NULL;

UPDATE public.products
SET image_url = NULL
WHERE image_url IS NOT NULL
  AND image_url !~* '^(https?://|/)';

UPDATE public.products
SET image_url = NULL
WHERE id IN (
  'chilli-burger-veggie'
);
